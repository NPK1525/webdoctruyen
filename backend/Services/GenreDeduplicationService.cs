using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Services;

public sealed class GenreDeduplicationService(MangaDbContext context)
{
    private readonly MangaDbContext _context = context;

    public async Task MergeDuplicateGenresAsync(CancellationToken cancellationToken = default)
    {
        await MergeDuplicateGroupsAsync(genre => NormalizeGenreKey(genre.Name), cancellationToken);
        await MergeDuplicateGroupsAsync(genre => NormalizeGenreKey(genre.Slug), cancellationToken);
    }

    private async Task MergeDuplicateGroupsAsync(
        Func<Genre, string> keySelector,
        CancellationToken cancellationToken)
    {
        var genres = await _context.Genres
            .OrderBy(genre => genre.Id)
            .ToListAsync(cancellationToken);

        var groups = genres
            .GroupBy(keySelector)
            .Where(group => !string.IsNullOrWhiteSpace(group.Key) && group.Count() > 1)
            .ToList();

        foreach (var group in groups)
        {
            var canonical = group.First();
            foreach (var duplicate in group.Skip(1).ToList())
            {
                await MergeGenreIntoAsync(duplicate, canonical, cancellationToken);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task MergeGenreIntoAsync(
        Genre duplicate,
        Genre canonical,
        CancellationToken cancellationToken)
    {
        var links = await _context.MangaGenres
            .Where(link => link.GenreId == duplicate.Id)
            .ToListAsync(cancellationToken);

        foreach (var link in links)
        {
            var canonicalExists = await _context.MangaGenres.AnyAsync(candidate =>
                candidate.MangaId == link.MangaId && candidate.GenreId == canonical.Id,
                cancellationToken);
            _context.MangaGenres.Remove(link);
            if (!canonicalExists)
            {
                _context.MangaGenres.Add(new MangaGenre
                {
                    MangaId = link.MangaId,
                    GenreId = canonical.Id
                });
            }
        }

        _context.Genres.Remove(duplicate);
    }

    private static string NormalizeGenreKey(string? value) =>
        string.Join(' ', (value ?? string.Empty)
                .Trim()
                .Split(' ', StringSplitOptions.RemoveEmptyEntries))
            .ToUpperInvariant();
}
