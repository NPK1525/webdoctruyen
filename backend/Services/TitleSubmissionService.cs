using System.Text.Json;
using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Services;

public sealed class TitleSubmissionService(MangaDbContext context)
{
    private readonly MangaDbContext _context = context;

    public async Task<TitleSubmissionResult> SubmitAsync(
        TitleSubmissionPayload payload,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        var error = TitleSubmissionValidation.Validate(payload, requireCover: true);
        if (error != null) throw new ArgumentException(error);

        return isAdmin
            ? new TitleSubmissionResult("Manga", MangaId: await CreateMangaAsync(payload, cancellationToken))
            : new TitleSubmissionResult("Draft", DraftId: await CreateDraftAsync(payload, userId, cancellationToken));
    }

    public async Task<int> ApproveAsync(int draftId, int reviewerId, CancellationToken cancellationToken = default)
    {
        var draft = await _context.TitleDrafts
            .Include(d => d.Authors)
            .FirstOrDefaultAsync(d => d.Id == draftId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy bản nháp.");

        if (draft.ReviewStatus == TitleDraftReviewStatus.Approved && draft.ApprovedMangaId.HasValue)
            throw new InvalidOperationException("Bản nháp này đã được duyệt.");

        var payload = ToPayload(draft);
        var error = TitleSubmissionValidation.Validate(payload, requireCover: true);
        if (error != null) throw new ArgumentException(error);

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        var mangaId = await CreateMangaAsync(payload, cancellationToken);
        var now = DateTime.UtcNow;

        _context.MangaContributors.Add(new MangaContributor
        {
            MangaId = mangaId,
            UserId = draft.CreatedByUserId,
            GrantedAt = now,
            GrantedByUserId = reviewerId
        });

        draft.ReviewStatus = TitleDraftReviewStatus.Approved;
        draft.ReviewedByUserId = reviewerId;
        draft.ReviewedAt = now;
        draft.UpdatedAt = now;
        draft.ApprovedMangaId = mangaId;
        draft.RejectionReason = string.Empty;
        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return mangaId;
    }

    private async Task<int> CreateDraftAsync(TitleSubmissionPayload payload, int userId, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var draft = new TitleDraft
        {
            CreatedByUserId = userId,
            CreatedAt = now,
            UpdatedAt = now,
            ReviewStatus = TitleDraftReviewStatus.Pending
        };
        ApplyDraft(draft, payload);
        _context.TitleDrafts.Add(draft);
        await _context.SaveChangesAsync(cancellationToken);
        AddDraftAuthors(draft, payload.Authors);
        await _context.SaveChangesAsync(cancellationToken);
        return draft.Id;
    }

    private async Task<int> CreateMangaAsync(TitleSubmissionPayload payload, CancellationToken cancellationToken)
    {
        var manga = new Manga
        {
            Title = payload.Title.Trim(),
            AlternativeTitle = BuildAlternativeTitle(payload),
            Description = payload.Description.Trim(),
            CoverUrl = payload.CoverUrl.Trim(),
            Type = payload.Type,
            Status = payload.Status,
            Demographic = payload.Demographic,
            Format = payload.Format,
            ContentWarnings = string.Join(',', MangaContentWarning.Normalize(payload.ContentWarnings)),
            ReleaseYear = payload.ReleaseYear,
            Source = string.IsNullOrWhiteSpace(payload.DataSource) ? "Local" : payload.DataSource.Trim(),
            ExternalId = payload.DataSource == "MangaDex" ? payload.MangaDexId.Trim() : string.Empty,
            CreatedAt = DateTime.UtcNow,
            SyncedAt = payload.DataSource == "MangaDex" ? DateTime.UtcNow : null
        };
        _context.Mangas.Add(manga);
        await _context.SaveChangesAsync(cancellationToken);

        foreach (var authorInput in payload.Authors)
        {
            var author = await ResolveAuthorAsync(authorInput, cancellationToken);
            _context.MangaAuthors.Add(new MangaAuthor { MangaId = manga.Id, AuthorId = author.Id, Role = NormalizeRole(authorInput.Role) });
        }
        foreach (var genreId in payload.GenreIds.Distinct())
            _context.MangaGenres.Add(new MangaGenre { MangaId = manga.Id, GenreId = genreId });
        foreach (var themeId in payload.ThemeIds.Distinct())
            _context.MangaThemes.Add(new MangaTheme { MangaId = manga.Id, ThemeId = themeId });
        await _context.SaveChangesAsync(cancellationToken);
        return manga.Id;
    }

    private async Task<Author> ResolveAuthorAsync(TitleAuthorInput input, CancellationToken cancellationToken)
    {
        Author? author = input.AuthorId.HasValue
            ? await _context.Authors.FirstOrDefaultAsync(a => a.Id == input.AuthorId.Value, cancellationToken)
            : null;
        if (author != null) return author;

        var name = input.Name.Trim();
        author = await _context.Authors.FirstOrDefaultAsync(a => a.Name.ToLower() == name.ToLower(), cancellationToken);
        if (author != null) return author;

        author = new Author { Name = name, Biography = string.Empty };
        _context.Authors.Add(author);
        await _context.SaveChangesAsync(cancellationToken);
        return author;
    }

    private static void ApplyDraft(TitleDraft draft, TitleSubmissionPayload payload)
    {
        draft.Title = payload.Title.Trim();
        draft.OriginalTitle = payload.OriginalTitle.Trim();
        draft.EnglishTitle = payload.EnglishTitle.Trim();
        draft.AlternativeTitlesJson = JsonSerializer.Serialize(payload.AlternativeTitles.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).Distinct().ToList());
        draft.Description = payload.Description.Trim();
        draft.OriginalLanguage = string.IsNullOrWhiteSpace(payload.OriginalLanguage) ? "vi" : payload.OriginalLanguage.Trim();
        draft.Type = payload.Type;
        draft.Status = payload.Status;
        draft.Demographic = payload.Demographic;
        draft.Format = payload.Format;
        draft.ContentWarnings = string.Join(',', MangaContentWarning.Normalize(payload.ContentWarnings));
        draft.AgeRating = payload.AgeRating;
        draft.ReleaseYear = payload.ReleaseYear;
        draft.Publisher = payload.Publisher.Trim();
        draft.CoverUrl = payload.CoverUrl.Trim();
        draft.BannerUrl = payload.BannerUrl.Trim();
        draft.OfficialWebsite = payload.OfficialWebsite.Trim();
        draft.ReferenceUrl = payload.ReferenceUrl.Trim();
        draft.TrackingUrl = payload.TrackingUrl.Trim();
        draft.DataSource = string.IsNullOrWhiteSpace(payload.DataSource) ? "Local" : payload.DataSource.Trim();
        draft.MangaDexId = payload.MangaDexId.Trim();
        draft.ScanlationGroup = payload.ScanlationGroup.Trim();
        draft.TranslationLanguage = string.IsNullOrWhiteSpace(payload.TranslationLanguage) ? "vi" : payload.TranslationLanguage.Trim();
        draft.Note = payload.Note.Trim();
    }

    private static void AddDraftAuthors(TitleDraft draft, IEnumerable<TitleAuthorInput> authors)
    {
        draft.Authors = authors.Select(author => new TitleDraftAuthor
        {
            TitleDraftId = draft.Id,
            AuthorId = author.AuthorId,
            ProposedName = author.Name.Trim(),
            Role = NormalizeRole(author.Role)
        }).ToList();
    }

    private static TitleSubmissionPayload ToPayload(TitleDraft draft)
    {
        var authors = draft.Authors.Select(a => new TitleAuthorInput { AuthorId = a.AuthorId, Name = a.ProposedName, Role = a.Role }).ToList();
        if (authors.Count == 0)
        {
            if (!string.IsNullOrWhiteSpace(draft.StoryAuthor)) authors.Add(new TitleAuthorInput { Name = draft.StoryAuthor, Role = "Story" });
            if (!string.IsNullOrWhiteSpace(draft.Artist)) authors.Add(new TitleAuthorInput { Name = draft.Artist, Role = "Art" });
        }
        return new TitleSubmissionPayload
        {
            Title = draft.Title,
            OriginalTitle = draft.OriginalTitle,
            EnglishTitle = draft.EnglishTitle,
            AlternativeTitles = ReadStrings(draft.AlternativeTitlesJson),
            Description = draft.Description,
            OriginalLanguage = draft.OriginalLanguage,
            Type = draft.Type,
            Status = draft.Status,
            Demographic = draft.Demographic,
            Format = draft.Format,
            AgeRating = draft.AgeRating,
            ReleaseYear = draft.ReleaseYear,
            CoverUrl = draft.CoverUrl,
            BannerUrl = draft.BannerUrl,
            Publisher = draft.Publisher,
            DataSource = draft.DataSource,
            MangaDexId = draft.MangaDexId,
            ContentWarnings = draft.ContentWarnings.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
            GenreIds = ReadInts(draft.GenreIdsJson),
            ThemeIds = ReadInts(draft.ThemeIdsJson),
            Authors = authors
        };
    }

    private static string BuildAlternativeTitle(TitleSubmissionPayload payload) =>
        string.Join(" | ", new[] { payload.OriginalTitle, payload.EnglishTitle }.Concat(payload.AlternativeTitles)
            .Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).Distinct());

    private static string NormalizeRole(string role) => role.Trim() switch
    {
        "Story" => "Story",
        "Art" => "Art",
        _ => "Story & Art"
    };

    private static List<int> ReadInts(string json) => TryRead(json, new List<int>());
    private static List<string> ReadStrings(string json) => TryRead(json, new List<string>());
    private static T TryRead<T>(string json, T fallback)
    {
        try { return JsonSerializer.Deserialize<T>(json) ?? fallback; }
        catch { return fallback; }
    }
}
