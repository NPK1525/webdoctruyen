using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public class LegacyRouteRedirectTests
{
    [Theory]
    [InlineData("/index.html", null, null, "/")]
    [InlineData("/INDEX.HTML", null, null, "/")]
    [InlineData("/detail.html", "42", null, "/manga/42")]
    [InlineData("/detail.html", null, null, "/manga")]
    [InlineData("/detail.html", "invalid", null, "/manga")]
    [InlineData("/reader.html", null, "18", "/chapter/18")]
    [InlineData("/reader.html", null, null, "/")]
    [InlineData("/reader.html", null, "0", "/")]
    public void Resolve_ReturnsExpectedDestination(
        string path,
        string? mangaId,
        string? chapterId,
        string expected)
    {
        Assert.Equal(expected, LegacyRouteRedirect.Resolve(path, mangaId, chapterId));
    }

    [Fact]
    public void Resolve_IgnoresNonLegacyPath()
    {
        Assert.Null(LegacyRouteRedirect.Resolve("/profile.html", null, null));
    }
}
