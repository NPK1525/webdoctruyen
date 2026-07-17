using MangaNPK.Models;

namespace MangaNPK.Services;

public static class MangaDexMetadataMapper
{
    public static MangaFormat SelectPrimaryFormat(IEnumerable<MangaDexTagDto> tags)
    {
        var names = tags
            .Where(tag => string.Equals(tag.Group, "format", StringComparison.OrdinalIgnoreCase))
            .Select(tag => tag.Name.Trim().ToLowerInvariant())
            .ToList();

        if (names.Any(name => name.Contains("oneshot") || name.Contains("one-shot"))) return MangaFormat.OneShot;
        if (names.Any(name => name.Contains("web comic") || name.Contains("webcomic") || name.Contains("long strip"))) return MangaFormat.WebComic;
        if (names.Any(name => name.Contains("adaptation"))) return MangaFormat.Adaptation;
        if (names.Any(name => name.Contains("novel") || name.Contains("book"))) return MangaFormat.Book;
        if (names.Any(name => name.Contains("comic") || name.Contains("colored") || name.Contains("colour"))) return MangaFormat.Comic;
        return MangaFormat.None;
    }
}
