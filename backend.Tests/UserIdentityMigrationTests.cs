using Xunit;

namespace MangaNPK.Tests;

public class UserIdentityMigrationTests
{
    [Fact]
    public void MigrationBackfillsAndChecksDuplicatesBeforeCreatingIndexes()
    {
        var root = FindRepositoryRoot();
        var path = Path.Combine(root, "backend", "Migrations", "20260725002547_AddNormalizedUserIdentity.cs");
        var source = File.ReadAllText(path);

        Assert.Contains("LTRIM(RTRIM", source, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("UPPER(", source, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("THROW 50001", source, StringComparison.OrdinalIgnoreCase);
        Assert.True(source.IndexOf("THROW 50001", StringComparison.OrdinalIgnoreCase)
            < source.IndexOf("CreateIndex", StringComparison.OrdinalIgnoreCase));
    }

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "backend", "MangaNPK.csproj")))
            directory = directory.Parent;
        return directory?.FullName ?? throw new DirectoryNotFoundException("Repository root not found.");
    }
}
