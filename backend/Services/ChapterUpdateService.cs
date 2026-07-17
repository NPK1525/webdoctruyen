using MangaNPK.Models;

namespace MangaNPK.Services;

public static class ChapterUpdateService
{
    public static void ApplyLocalPages(Chapter chapter, IReadOnlyList<string> pageUrls)
    {
        if (!string.Equals(chapter.Source, "Local", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Không thể sửa trang của chapter MangaDex.");
        if (pageUrls.Count == 0)
            throw new InvalidOperationException("Chapter phải có ít nhất một trang.");

        chapter.Pages = pageUrls.Select((url, index) => new Page
        {
            ChapterId = chapter.Id,
            PageNumber = index + 1,
            ImageUrl = url.Trim()
        }).ToList();
    }
}
