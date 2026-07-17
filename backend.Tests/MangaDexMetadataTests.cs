using MangaNPK.Models;
using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public class MangaDexMetadataTests
{
    [Fact]
    public void SelectPrimaryFormat_UsesExpectedPriority()
    {
        var tags = new[]
        {
            new MangaDexTagDto("Adaptation", "format"),
            new MangaDexTagDto("Long Strip", "format"),
            new MangaDexTagDto("Oneshot", "format")
        };

        Assert.Equal(MangaFormat.OneShot, MangaDexMetadataMapper.SelectPrimaryFormat(tags));
    }

    [Theory]
    [InlineData("Long Strip", MangaFormat.WebComic)]
    [InlineData("Web Comic", MangaFormat.WebComic)]
    [InlineData("Novel", MangaFormat.Book)]
    [InlineData("Official Colored", MangaFormat.Comic)]
    public void SelectPrimaryFormat_MapsSupportedFormat(string name, MangaFormat expected)
    {
        Assert.Equal(expected, MangaDexMetadataMapper.SelectPrimaryFormat([new(name, "format")]));
    }
}
