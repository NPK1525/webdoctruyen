using MangaNPK.Models;
using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public class ChapterUpdateServiceTests
{
    [Fact]
    public void ApplyLocalPages_ReplacesAndRenumbersPages()
    {
        var chapter = new Chapter
        {
            Source = "Local",
            Pages = [new Page { PageNumber = 9, ImageUrl = "/old.jpg" }]
        };

        ChapterUpdateService.ApplyLocalPages(chapter, ["/second.jpg", "/first.jpg"]);

        Assert.Equal([1, 2], chapter.Pages.Select(page => page.PageNumber));
        Assert.Equal(["/second.jpg", "/first.jpg"], chapter.Pages.Select(page => page.ImageUrl));
    }

    [Fact]
    public void ApplyLocalPages_RejectsMangaDexChapter()
    {
        var chapter = new Chapter { Source = "MangaDex" };

        var error = Assert.Throws<InvalidOperationException>(() =>
            ChapterUpdateService.ApplyLocalPages(chapter, ["/page.jpg"]));

        Assert.Contains("MangaDex", error.Message);
    }
}
