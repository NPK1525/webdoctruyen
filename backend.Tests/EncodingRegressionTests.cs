using Xunit;

namespace MangaNPK.Tests;

public class EncodingRegressionTests
{
    [Theory]
    [InlineData("backend/Views/ChapterView/Read.cshtml")]
    [InlineData("backend/wwwroot/js/reader.js")]
    public void ReaderNavigation_DoesNotContainKnownMojibake(string relativePath)
    {
        var root = FindRepositoryRoot();
        var text = File.ReadAllText(Path.Combine(root, relativePath));

        Assert.DoesNotContain("Ch\u00C6\u00B0", text);
        Assert.DoesNotContain("Tr\u00C6", text);
        Assert.DoesNotContain("Ti\u00C3", text);
        Assert.DoesNotContain("\u00C4\u0090\u00C3", text);
    }

    [Fact]
    public void AdminToast_HasNoDefaultSuccessMessage()
    {
        var root = FindRepositoryRoot();
        var text = File.ReadAllText(Path.Combine(root, "backend/Views/AdminView/Index.cshtml"));
        Assert.DoesNotContain("Ho&#7841;t &#273;&#7897;ng th&#224;nh c&#244;ng.", text);
    }

    [Fact]
    public void LegacyAdminPage_DoesNotContainDuplicateAdminUi()
    {
        var root = FindRepositoryRoot();
        var legacyPath = Path.Combine(root, "backend/wwwroot/admin.html");
        if (!File.Exists(legacyPath)) return;

        var text = File.ReadAllText(legacyPath);
        Assert.DoesNotContain("id=\"admin-panel-wrapper\"", text);
        Assert.DoesNotContain("Hoạt động thành công.", text);
    }

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory != null && !Directory.Exists(Path.Combine(directory.FullName, "backend")))
            directory = directory.Parent;
        return directory?.FullName ?? throw new DirectoryNotFoundException("Repository root not found.");
    }
}
