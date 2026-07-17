using MangaNPK.Data;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Services;

public interface IFollowedUpdatesService
{
    Task<IReadOnlyList<FollowedUpdateItem>> GetAsync(
        int userId,
        int limit = 100,
        CancellationToken cancellationToken = default);
}

public sealed class FollowedUpdatesService(MangaDbContext context) : IFollowedUpdatesService
{
    private readonly MangaDbContext _context = context;

    public async Task<IReadOnlyList<FollowedUpdateItem>> GetAsync(
        int userId,
        int limit = 100,
        CancellationToken cancellationToken = default)
    {
        return await BuildQuery(_context, userId, limit).ToListAsync(cancellationToken);
    }

    public static IQueryable<FollowedUpdateItem> BuildQuery(
        MangaDbContext context,
        int userId,
        int limit)
    {
        var boundedLimit = Math.Clamp(limit, 1, 200);

        return context.Chapters
            .AsNoTracking()
            .Where(chapter => context.UserMangaLibraries.Any(entry =>
                entry.UserId == userId && entry.MangaId == chapter.MangaId))
            .OrderByDescending(chapter => chapter.UploadedAt)
            .Take(boundedLimit)
            .Select(chapter => new FollowedUpdateItem
            {
                MangaId = chapter.MangaId,
                MangaTitle = chapter.Manga.Title,
                CoverUrl = chapter.Manga.CoverUrl,
                ViewCount = chapter.Manga.ViewCount,
                Genres = chapter.Manga.MangaGenres.Select(item => item.Genre.Name).ToList(),
                Authors = chapter.Manga.MangaAuthors.Select(item => item.Author.Name).ToList(),
                ChapterId = chapter.Id,
                ChapterNumber = chapter.ChapterNumber,
                ChapterTitle = chapter.Title,
                UploadedAt = chapter.UploadedAt,
                CommentCount = context.Comments.Count(comment => comment.ChapterId == chapter.Id)
            });
    }
}

public sealed class FollowedUpdateItem
{
    public int MangaId { get; init; }
    public string MangaTitle { get; init; } = string.Empty;
    public string CoverUrl { get; init; } = string.Empty;
    public int ViewCount { get; init; }
    public List<string> Genres { get; init; } = [];
    public List<string> Authors { get; init; } = [];
    public int ChapterId { get; init; }
    public double ChapterNumber { get; init; }
    public string ChapterTitle { get; init; } = string.Empty;
    public DateTime UploadedAt { get; init; }
    public int CommentCount { get; init; }
}
