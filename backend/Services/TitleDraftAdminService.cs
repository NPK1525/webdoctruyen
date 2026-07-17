using MangaNPK.Contracts.Admin;
using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace MangaNPK.Services;

public enum TitleDraftAdminStatus { Success, NotFound, BadRequest, ServerError }
public sealed record TitleDraftAdminResult(TitleDraftAdminStatus Status, string Message = "", int? EntityId = null, object? Data = null, string? Error = null);

public sealed class TitleDraftAdminService(MangaDbContext context)
{
    private readonly MangaDbContext _context = context;

    public async Task<object> GetAllAsync(CancellationToken cancellationToken = default) => await _context.TitleDrafts.AsNoTracking()
        .Include(draft => draft.CreatedByUser).Include(draft => draft.ReviewedByUser).OrderByDescending(draft => draft.UpdatedAt)
        .Select(draft => new { draft.Id, draft.Title, draft.Type, draft.Status, draft.ReviewStatus, draft.CoverUrl,
            draft.CreatedAt, draft.UpdatedAt, CreatedBy = draft.CreatedByUser == null ? "" : draft.CreatedByUser.Username,
            ReviewedBy = draft.ReviewedByUser == null ? "" : draft.ReviewedByUser.Username, draft.ApprovedMangaId })
        .ToListAsync(cancellationToken);

    public async Task<TitleDraftAdminResult> GetAsync(int id, CancellationToken cancellationToken = default)
    {
        var draft = await _context.TitleDrafts.AsNoTracking().Include(item => item.Authors).FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        return draft == null ? new(TitleDraftAdminStatus.NotFound, "Khong tim thay ban nhap.") : new(TitleDraftAdminStatus.Success, Data: ToResponse(draft));
    }

    public async Task<TitleDraftAdminResult> CreateAsync(SaveTitleDraftDto dto, int userId, CancellationToken cancellationToken = default)
    {
        var validation = Validate(dto, dto.SubmitForReview); if (validation != null) return new(TitleDraftAdminStatus.BadRequest, validation);
        var now = DateTime.UtcNow;
        var draft = new TitleDraft { CreatedByUserId = userId, CreatedAt = now, UpdatedAt = now,
            ReviewStatus = dto.SubmitForReview ? TitleDraftReviewStatus.Pending : TitleDraftReviewStatus.Draft };
        ApplyDto(draft, dto); _context.TitleDrafts.Add(draft); await _context.SaveChangesAsync(cancellationToken);
        return new(TitleDraftAdminStatus.Success, dto.SubmitForReview ? "Da gui ban nhap cho duyet." : "Da luu ban nhap.", draft.Id);
    }

    public async Task<TitleDraftAdminResult> UpdateAsync(int id, SaveTitleDraftDto dto, CancellationToken cancellationToken = default)
    {
        var draft = await _context.TitleDrafts.Include(item => item.Authors).FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (draft == null) return new(TitleDraftAdminStatus.NotFound, "Khong tim thay ban nhap.");
        if (draft.ReviewStatus == TitleDraftReviewStatus.Approved) return new(TitleDraftAdminStatus.BadRequest, "Ban nhap da duyet khong the cap nhat.");
        var validation = Validate(dto, dto.SubmitForReview); if (validation != null) return new(TitleDraftAdminStatus.BadRequest, validation);
        ApplyDto(draft, dto); draft.UpdatedAt = DateTime.UtcNow;
        draft.ReviewStatus = dto.SubmitForReview ? TitleDraftReviewStatus.Pending : TitleDraftReviewStatus.Draft;
        draft.RejectionReason = string.Empty; draft.ReviewedAt = null; draft.ReviewedByUserId = null;
        await _context.SaveChangesAsync(cancellationToken);
        return new(TitleDraftAdminStatus.Success, dto.SubmitForReview ? "Da gui ban nhap cho duyet." : "Da cap nhat ban nhap.", draft.Id);
    }

    public async Task<TitleDraftAdminResult> ApproveAsync(int id, int reviewerId, CancellationToken cancellationToken = default)
    {
        var draft = await _context.TitleDrafts.Include(item => item.Authors).FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (draft == null) return new(TitleDraftAdminStatus.NotFound, "Khong tim thay ban nhap.");
        if (draft.ReviewStatus == TitleDraftReviewStatus.Approved) return new(TitleDraftAdminStatus.BadRequest, "Ban nhap nay da duoc duyet.");
        var validation = Validate(ToDto(draft), true); if (validation != null) return new(TitleDraftAdminStatus.BadRequest, validation);
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var now = DateTime.UtcNow;
            var manga = new Manga { Title = draft.Title.Trim(), AlternativeTitle = BuildAlternativeTitle(draft), Description = draft.Description.Trim(),
                CoverUrl = draft.CoverUrl.Trim(), Type = draft.Type, Status = draft.Status, Demographic = draft.Demographic,
                Format = draft.Format == MangaFormat.None && draft.Type == MangaType.Webtoon ? MangaFormat.WebComic : draft.Format,
                ContentWarnings = draft.ContentWarnings, ReleaseYear = draft.ReleaseYear, Source = draft.DataSource,
                ExternalId = draft.DataSource == "MangaDex" ? draft.MangaDexId : string.Empty, CreatedAt = now,
                SyncedAt = draft.DataSource == "MangaDex" ? now : null };
            _context.Mangas.Add(manga); await _context.SaveChangesAsync(cancellationToken);
            await AttachAuthorAsync(manga.Id, null, draft.StoryAuthor, "Story", cancellationToken);
            await AttachAuthorAsync(manga.Id, null, draft.Artist, "Art", cancellationToken);
            foreach (var author in draft.Authors) await AttachAuthorAsync(manga.Id, author.AuthorId, author.ProposedName, author.Role, cancellationToken);
            foreach (var genreId in ReadInts(draft.GenreIdsJson)) _context.MangaGenres.Add(new MangaGenre { MangaId = manga.Id, GenreId = genreId });
            foreach (var themeId in ReadInts(draft.ThemeIdsJson)) _context.MangaThemes.Add(new MangaTheme { MangaId = manga.Id, ThemeId = themeId });
            _context.MangaContributors.Add(new MangaContributor { MangaId = manga.Id, UserId = draft.CreatedByUserId, GrantedAt = now, GrantedByUserId = reviewerId });
            draft.ReviewStatus = TitleDraftReviewStatus.Approved; draft.ReviewedByUserId = reviewerId; draft.ReviewedAt = now;
            draft.UpdatedAt = now; draft.ApprovedMangaId = manga.Id; draft.RejectionReason = string.Empty;
            await _context.SaveChangesAsync(cancellationToken); await transaction.CommitAsync(cancellationToken);
            return new(TitleDraftAdminStatus.Success, "Da duyet va tao truyen moi.", manga.Id);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            return new(TitleDraftAdminStatus.ServerError, "Loi duyet ban nhap.", Error: ex.Message);
        }
    }

    public async Task<TitleDraftAdminResult> RejectAsync(int id, string? reason, int reviewerId, CancellationToken cancellationToken = default)
    {
        var draft = await _context.TitleDrafts.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (draft == null) return new(TitleDraftAdminStatus.NotFound, "Khong tim thay ban nhap.");
        if (draft.ReviewStatus == TitleDraftReviewStatus.Approved) return new(TitleDraftAdminStatus.BadRequest, "Ban nhap da duyet khong the tu choi.");
        draft.ReviewStatus = TitleDraftReviewStatus.Rejected; draft.RejectionReason = reason?.Trim() ?? string.Empty;
        draft.ReviewedByUserId = reviewerId; draft.ReviewedAt = DateTime.UtcNow; draft.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken); return new(TitleDraftAdminStatus.Success, "Da tu choi ban nhap.");
    }

    private static string? Validate(SaveTitleDraftDto dto, bool requireCover)
    {
        if (string.IsNullOrWhiteSpace(dto.Title)) return "Ten truyen la bat buoc.";
        if (string.IsNullOrWhiteSpace(dto.Description)) return "Mo ta la bat buoc.";
        if (requireCover && string.IsNullOrWhiteSpace(dto.CoverUrl)) return "Anh bia la bat buoc truoc khi gui duyet.";
        if (dto.ReleaseYear is < 1900 or > 2100) return "Nam phat hanh khong hop le.";
        if (!Enum.IsDefined(dto.Type)) return "Loai truyen khong hop le.";
        if (!Enum.IsDefined(dto.Status)) return "Tinh trang khong hop le.";
        if (!Enum.IsDefined(dto.Demographic)) return "Doi tuong khong hop le.";
        if (!Enum.IsDefined(dto.AgeRating)) return "Do tuoi khong hop le.";
        return null;
    }

    private static void ApplyDto(TitleDraft draft, SaveTitleDraftDto dto)
    {
        draft.Title = dto.Title.Trim(); draft.OriginalTitle = dto.OriginalTitle?.Trim() ?? string.Empty; draft.EnglishTitle = dto.EnglishTitle?.Trim() ?? string.Empty;
        draft.AlternativeTitlesJson = JsonSerializer.Serialize((dto.AlternativeTitles ?? []).Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value.Trim()).Distinct().ToList());
        draft.Description = dto.Description?.Trim() ?? string.Empty; draft.OriginalLanguage = string.IsNullOrWhiteSpace(dto.OriginalLanguage) ? "vi" : dto.OriginalLanguage.Trim();
        draft.Type = dto.Type; draft.Status = dto.Status; draft.ReleaseYear = dto.ReleaseYear; draft.StoryAuthor = dto.StoryAuthor?.Trim() ?? string.Empty;
        draft.Artist = dto.Artist?.Trim() ?? string.Empty; draft.Publisher = dto.Publisher?.Trim() ?? string.Empty;
        draft.GenreIdsJson = JsonSerializer.Serialize((dto.GenreIds ?? []).Distinct().ToList()); draft.ThemeIdsJson = JsonSerializer.Serialize((dto.ThemeIds ?? []).Distinct().ToList());
        draft.Demographic = dto.Demographic; draft.AgeRating = dto.AgeRating; draft.CoverUrl = dto.CoverUrl?.Trim() ?? string.Empty;
        draft.BannerUrl = dto.BannerUrl?.Trim() ?? string.Empty; draft.OfficialWebsite = dto.OfficialWebsite?.Trim() ?? string.Empty;
        draft.ReferenceUrl = dto.ReferenceUrl?.Trim() ?? string.Empty; draft.TrackingUrl = dto.TrackingUrl?.Trim() ?? string.Empty;
        draft.DataSource = string.Equals(dto.DataSource, "MangaDex", StringComparison.OrdinalIgnoreCase) ? "MangaDex" : "Local";
        draft.MangaDexId = draft.DataSource == "MangaDex" ? dto.MangaDexId?.Trim() ?? string.Empty : string.Empty;
        draft.ScanlationGroup = dto.ScanlationGroup?.Trim() ?? string.Empty; draft.TranslationLanguage = "vi"; draft.Note = dto.Note?.Trim() ?? string.Empty;
    }

    private static SaveTitleDraftDto ToDto(TitleDraft draft) => new() { Title = draft.Title, OriginalTitle = draft.OriginalTitle,
        EnglishTitle = draft.EnglishTitle, AlternativeTitles = ReadStrings(draft.AlternativeTitlesJson), Description = draft.Description,
        OriginalLanguage = draft.OriginalLanguage, Type = draft.Type, Status = draft.Status, ReleaseYear = draft.ReleaseYear,
        StoryAuthor = draft.StoryAuthor, Artist = draft.Artist, Publisher = draft.Publisher, GenreIds = ReadInts(draft.GenreIdsJson),
        ThemeIds = ReadInts(draft.ThemeIdsJson), Demographic = draft.Demographic, AgeRating = draft.AgeRating, CoverUrl = draft.CoverUrl,
        BannerUrl = draft.BannerUrl, OfficialWebsite = draft.OfficialWebsite, ReferenceUrl = draft.ReferenceUrl,
        TrackingUrl = draft.TrackingUrl, DataSource = draft.DataSource, MangaDexId = draft.MangaDexId,
        ScanlationGroup = draft.ScanlationGroup, Note = draft.Note };

    private static object ToResponse(TitleDraft draft) => new { draft.Id, draft.Title, draft.OriginalTitle, draft.EnglishTitle,
        AlternativeTitles = ReadStrings(draft.AlternativeTitlesJson), draft.Description, draft.OriginalLanguage, draft.Type, draft.Status,
        draft.ReleaseYear, draft.StoryAuthor, draft.Artist, draft.Publisher, GenreIds = ReadInts(draft.GenreIdsJson),
        ThemeIds = ReadInts(draft.ThemeIdsJson), draft.Demographic, draft.Format,
        ContentWarnings = draft.ContentWarnings.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
        Authors = draft.Authors.Select(author => new { author.AuthorId, author.ProposedName, author.Role }), draft.AgeRating,
        draft.CoverUrl, draft.BannerUrl, draft.OfficialWebsite, draft.ReferenceUrl, draft.TrackingUrl, draft.DataSource,
        draft.MangaDexId, draft.ScanlationGroup, draft.TranslationLanguage, draft.Note, draft.ReviewStatus, draft.CreatedAt,
        draft.UpdatedAt, draft.ReviewedAt, draft.RejectionReason, draft.ApprovedMangaId };

    private async Task AttachAuthorAsync(int mangaId, int? authorId, string name, string role, CancellationToken cancellationToken)
    {
        if (!authorId.HasValue && string.IsNullOrWhiteSpace(name)) return;
        var author = authorId.HasValue ? await _context.Authors.FirstOrDefaultAsync(item => item.Id == authorId.Value, cancellationToken) : null;
        if (author == null && !string.IsNullOrWhiteSpace(name)) author = await _context.Authors.FirstOrDefaultAsync(item => item.Name.ToLower() == name.Trim().ToLower(), cancellationToken);
        if (author == null && !string.IsNullOrWhiteSpace(name)) { author = new Author { Name = name.Trim(), Biography = string.Empty }; _context.Authors.Add(author); await _context.SaveChangesAsync(cancellationToken); }
        if (author != null && !await _context.MangaAuthors.AnyAsync(item => item.MangaId == mangaId && item.AuthorId == author.Id && item.Role == role, cancellationToken))
            _context.MangaAuthors.Add(new MangaAuthor { MangaId = mangaId, AuthorId = author.Id, Role = role });
    }

    private static List<int> ReadInts(string json) { try { return JsonSerializer.Deserialize<List<int>>(json) ?? []; } catch { return []; } }
    private static List<string> ReadStrings(string json) { try { return JsonSerializer.Deserialize<List<string>>(json) ?? []; } catch { return []; } }
    private static string BuildAlternativeTitle(TitleDraft draft) => string.Join(" | ", new[] { draft.OriginalTitle, draft.EnglishTitle }
        .Concat(ReadStrings(draft.AlternativeTitlesJson)).Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value.Trim()).Distinct());
}
