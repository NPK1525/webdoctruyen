using System.IO;
using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public class MangaAdvancedFilterContractTests
{
    private static string Read(string relativePath) =>
        File.ReadAllText(Path.Combine(FindRepositoryRoot(), "backend", relativePath));

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory != null && !Directory.Exists(Path.Combine(directory.FullName, "backend")))
            directory = directory.Parent;
        return directory?.FullName ?? throw new DirectoryNotFoundException("Repository root not found.");
    }

    [Fact]
    public void MangaEndpointAcceptsTagAndPersonFilterParameters()
    {
        var source = Read(Path.Combine("Controllers", "MangaController.cs"));

        Assert.Contains("includeGenreIds", source);
        Assert.Contains("excludeGenreIds", source);
        Assert.Contains("includeThemeIds", source);
        Assert.Contains("excludeThemeIds", source);
        Assert.Contains("includeFormats", source);
        Assert.Contains("excludeFormats", source);
        Assert.Contains("includeContent", source);
        Assert.Contains("excludeContent", source);
        Assert.Contains("authorIds", source);
        Assert.Contains("artistIds", source);
    }

    [Fact]
    public void AuthorEndpointReturnsContributorRolesForAuthorArtistFiltering()
    {
        var source = Read(Path.Combine("Controllers", "AuthorController.cs"));

        Assert.Contains("Roles =", source);
        Assert.Contains("MangaAuthors", source);
        Assert.Contains("Distinct()", source);
    }

    [Theory]
    [InlineData("Story", true, false)]
    [InlineData("Story (Nguyên tác)", true, false)]
    [InlineData("Story (Kịch bản)", true, false)]
    [InlineData("Art", false, true)]
    [InlineData("Art (Họa sĩ vẽ)", false, true)]
    [InlineData("Story & Art", true, true)]
    public void ContributorRoleClassifierUnderstandsLegacyLocalRoleLabels(
        string role,
        bool isStory,
        bool isArt)
    {
        Assert.Equal(isStory, ContributorRoleClassifier.IsStoryRole(role));
        Assert.Equal(isArt, ContributorRoleClassifier.IsArtRole(role));
    }
}
