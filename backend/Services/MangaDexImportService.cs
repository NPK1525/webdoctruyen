using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;

namespace MangaNPK.Services;

public enum MangaDexImportStatus { Success, BadRequest, BadGateway, ServerError }
public sealed record MangaDexPreviewOutcome(MangaDexImportStatus Status, string Message, MangaDexPreviewDto? Preview = null, int ChapterCount = 0, bool Exists = false, string? Error = null);
public sealed record MangaDexImportOutcome(MangaDexImportStatus Status, string Message, int? MangaId = null, int ChapterCount = 0, string? Error = null);

public sealed class MangaDexImportService(MangaDbContext context, MangaDexService mangaDexService)
{
    private readonly MangaDbContext _context = context;
    private readonly MangaDexService _mangaDexService = mangaDexService;

    public async Task<MangaDexPreviewOutcome> PreviewAsync(string input, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(input)) return new(MangaDexImportStatus.BadRequest, "Vui lòng nhập URL hoặc UUID MangaDex.");
        try
        {
            var preview = await _mangaDexService.GetMangaPreviewAsync(input, cancellationToken);
            var chapters = await _mangaDexService.GetVietnameseChaptersAsync(preview.Id, cancellationToken);
            var exists = await _context.Mangas.AsNoTracking().AnyAsync(manga => manga.Source == "MangaDex" && manga.ExternalId == preview.Id, cancellationToken);
            return new(MangaDexImportStatus.Success, string.Empty, preview, chapters.Count, exists);
        }
        catch (ArgumentException ex) { return new(MangaDexImportStatus.BadRequest, ex.Message); }
        catch (HttpRequestException ex) { return new(MangaDexImportStatus.BadGateway, "Không thể gọi MangaDex API.", Error: ex.Message); }
    }

    public async Task<MangaDexImportOutcome> ImportAsync(string input, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(input)) return new(MangaDexImportStatus.BadRequest, "Vui lòng nhập URL hoặc UUID MangaDex.");
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var preview = await _mangaDexService.GetMangaPreviewAsync(input, cancellationToken);
            var chapters = await _mangaDexService.GetVietnameseChaptersAsync(preview.Id, cancellationToken);
            var now = DateTime.UtcNow;
            var manga = await _context.Mangas.Include(item => item.MangaAuthors).Include(item => item.MangaGenres).Include(item => item.MangaThemes)
                .FirstOrDefaultAsync(item => item.Source == "MangaDex" && item.ExternalId == preview.Id, cancellationToken);
            if (manga == null)
            {
                manga = new Manga { Source = "MangaDex", ExternalId = preview.Id, CreatedAt = now };
                _context.Mangas.Add(manga);
            }
            manga.Title = preview.Title; manga.AlternativeTitle = preview.AlternativeTitle; manga.Description = preview.Description;
            manga.CoverUrl = preview.CoverUrl; manga.Type = preview.Type; manga.Status = preview.Status;
            manga.Demographic = preview.Demographic; manga.Format = preview.Format;
            manga.ContentWarnings = string.Join(',', MangaContentWarning.Normalize(preview.Tags
                .Where(tag => string.Equals(tag.Group, "content", StringComparison.OrdinalIgnoreCase)).Select(tag => tag.Name)));
            manga.ReleaseYear = preview.ReleaseYear; manga.SyncedAt = now;
            await _context.SaveChangesAsync(cancellationToken);
            await UpsertAuthorsAsync(manga, preview.Authors, cancellationToken);
            await UpsertTagsAsync(manga, preview.Tags, cancellationToken);

            var imported = 0;
            foreach (var item in chapters.Where(chapter => !string.IsNullOrWhiteSpace(chapter.Id)))
            {
                var chapter = await _context.Chapters.FirstOrDefaultAsync(existing => existing.Source == "MangaDex" && existing.ExternalId == item.Id, cancellationToken);
                if (chapter == null)
                {
                    chapter = new Chapter { MangaId = manga.Id, Source = "MangaDex", ExternalId = item.Id };
                    _context.Chapters.Add(chapter);
                }
                chapter.MangaId = manga.Id; chapter.ChapterNumber = item.ChapterNumber;
                chapter.Title = string.IsNullOrWhiteSpace(item.Title) ? $"Chương {item.ChapterNumberText}" : item.Title;
                chapter.TranslatedLanguage = "vi"; chapter.PublishedAt = item.PublishedAt;
                chapter.UploadedAt = item.PublishedAt ?? now; chapter.SyncedAt = now; chapter.ScanlationGroupName = item.ScanlationGroupName;
                imported++;
            }
            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new(MangaDexImportStatus.Success, "Đồng bộ MangaDex thành công.", manga.Id, imported);
        }
        catch (ArgumentException ex) { await transaction.RollbackAsync(cancellationToken); return new(MangaDexImportStatus.BadRequest, ex.Message); }
        catch (HttpRequestException ex) { await transaction.RollbackAsync(cancellationToken); return new(MangaDexImportStatus.BadGateway, "Không thể gọi MangaDex API.", Error: ex.Message); }
        catch (Exception ex) { await transaction.RollbackAsync(cancellationToken); return new(MangaDexImportStatus.ServerError, "Lỗi đồng bộ MangaDex.", Error: ex.Message); }
    }

    private async Task UpsertAuthorsAsync(Manga manga, List<MangaDexAuthorDto> authors, CancellationToken cancellationToken)
    {
        _context.MangaAuthors.RemoveRange(manga.MangaAuthors);
        await _context.SaveChangesAsync(cancellationToken);
        foreach (var item in MergeAuthorRoles(authors))
        {
            var name = item.Name.Trim();
            var author = await _context.Authors.FirstOrDefaultAsync(existing => existing.Name == name, cancellationToken);
            if (author == null) { author = new Author { Name = name, Biography = string.Empty }; _context.Authors.Add(author); await _context.SaveChangesAsync(cancellationToken); }
            _context.MangaAuthors.Add(new MangaAuthor { MangaId = manga.Id, AuthorId = author.Id, Role = string.IsNullOrWhiteSpace(item.Role) ? "Story & Art" : item.Role });
        }
    }

    private async Task UpsertTagsAsync(Manga manga, List<MangaDexTagDto> tags, CancellationToken cancellationToken)
    {
        _context.MangaGenres.RemoveRange(manga.MangaGenres); _context.MangaThemes.RemoveRange(manga.MangaThemes);
        await _context.SaveChangesAsync(cancellationToken);
        foreach (var tag in tags.Where(item => !string.IsNullOrWhiteSpace(item.Name)).DistinctBy(item => new { item.Name, item.Group }))
        {
            if (string.Equals(tag.Group, "genre", StringComparison.OrdinalIgnoreCase))
            { var genre = await FindOrCreateGenreAsync(tag.Name, cancellationToken); _context.MangaGenres.Add(new MangaGenre { MangaId = manga.Id, GenreId = genre.Id }); }
            else if (string.Equals(tag.Group, "theme", StringComparison.OrdinalIgnoreCase))
            { var theme = await FindOrCreateThemeAsync(tag.Name, cancellationToken); _context.MangaThemes.Add(new MangaTheme { MangaId = manga.Id, ThemeId = theme.Id }); }
        }
    }

    private async Task<Genre> FindOrCreateGenreAsync(string name, CancellationToken cancellationToken)
    {
        var clean = name.Trim(); var genre = await _context.Genres.FirstOrDefaultAsync(item => item.Name == clean, cancellationToken);
        if (genre != null) return genre;
        genre = new Genre { Name = clean, Slug = Slugify(clean) }; _context.Genres.Add(genre); await _context.SaveChangesAsync(cancellationToken); return genre;
    }

    private async Task<Theme> FindOrCreateThemeAsync(string name, CancellationToken cancellationToken)
    {
        var clean = name.Trim(); var theme = await _context.Themes.FirstOrDefaultAsync(item => item.Name == clean, cancellationToken);
        if (theme != null) return theme;
        theme = new Theme { Name = clean, Slug = Slugify(clean) }; _context.Themes.Add(theme); await _context.SaveChangesAsync(cancellationToken); return theme;
    }

    private static List<MangaDexAuthorDto> MergeAuthorRoles(List<MangaDexAuthorDto> authors) => authors
        .Where(item => !string.IsNullOrWhiteSpace(item.Name)).GroupBy(item => item.Name.Trim()).Select(group =>
        { var roles = group.Select(item => item.Role).Where(role => !string.IsNullOrWhiteSpace(role)).Distinct().ToList();
          return new MangaDexAuthorDto(group.Key, roles.Contains("Story") && roles.Contains("Art") ? "Story & Art" : roles.FirstOrDefault() ?? "Story & Art"); }).ToList();

    private static string Slugify(string value)
    {
        var builder = new StringBuilder();
        foreach (var ch in value.Normalize(NormalizationForm.FormD))
        { if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark) continue;
          if (char.IsLetterOrDigit(ch)) builder.Append(char.ToLowerInvariant(ch)); else if (char.IsWhiteSpace(ch) || ch is '-' or '_') builder.Append('-'); }
        var slug = string.Join('-', builder.ToString().Split('-', StringSplitOptions.RemoveEmptyEntries));
        return string.IsNullOrWhiteSpace(slug) ? "tag" : slug;
    }
}
