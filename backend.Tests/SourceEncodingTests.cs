using System.Text;
using Xunit;

namespace MangaNPK.Tests;

public class SourceEncodingTests
{
    private static readonly HashSet<string> SourceExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".cs", ".cshtml", ".js", ".css", ".html", ".json", ".md", ".ps1"
    };

    private static readonly string[] IgnoredDirectoryNames =
    {
        ".git", "bin", "obj", "node_modules", "App_Data", "uploads", "Migrations"
    };

    private static readonly (string Text, string Label)[] MojibakeMarkers =
    {
        ("\u00C3", "Latin-1 UTF-8 prefix U+00C3"),
        ("\u00C2", "Latin-1 UTF-8 prefix U+00C2"),
        ("\u00C4", "Vietnamese mojibake prefix U+00C4"),
        ("\u00C6", "Vietnamese mojibake prefix U+00C6"),
        ("\u00E1\u00BA", "Vietnamese mojibake sequence U+00E1 U+00BA"),
        ("\u00E1\u00BB", "Vietnamese mojibake sequence U+00E1 U+00BB"),
        ("\u00E2\u20AC", "smart punctuation mojibake"),
        ("\u00F0\u0178", "emoji mojibake"),
        ("\u00EF\u00BF\u00BD", "encoded replacement-character mojibake"),
        ("\uFFFD", "Unicode replacement character")
    };

    [Fact]
    public void SourceFiles_AreStrictUtf8()
    {
        var failures = new List<string>();
        var strictUtf8 = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true);

        foreach (var file in EnumerateSourceFiles(FindRepositoryRoot()))
        {
            try
            {
                strictUtf8.GetString(File.ReadAllBytes(file));
            }
            catch (DecoderFallbackException exception)
            {
                failures.Add($"{ToRepositoryPath(file)}: invalid UTF-8 near byte {exception.Index}");
            }
        }

        Assert.True(failures.Count == 0, "Invalid UTF-8 source files:\n" + string.Join("\n", failures));
    }

    [Fact]
    public void UserVisibleSources_DoNotContainKnownMojibake()
    {
        var root = FindRepositoryRoot();
        var userVisibleRoots = new[]
        {
            Path.Combine(root, "backend", "Controllers"),
            Path.Combine(root, "backend", "Data"),
            Path.Combine(root, "backend", "Models"),
            Path.Combine(root, "backend", "Services"),
            Path.Combine(root, "backend", "Views"),
            Path.Combine(root, "backend", "wwwroot")
        };
        var failures = new List<string>();

        foreach (var file in userVisibleRoots.Where(Directory.Exists).SelectMany(EnumerateSourceFiles))
        {
            var text = File.ReadAllText(file, Encoding.UTF8);
            foreach (var marker in MojibakeMarkers)
            {
                var index = text.IndexOf(marker.Text, StringComparison.Ordinal);
                if (index < 0) continue;

                var line = text.AsSpan(0, index).Count('\n') + 1;
                failures.Add($"{ToRepositoryPath(file)}:{line}: {marker.Label}");
                break;
            }
        }

        Assert.True(failures.Count == 0, "Known mojibake found in user-visible source:\n" + string.Join("\n", failures));
    }

    private static IEnumerable<string> EnumerateSourceFiles(string directory)
    {
        return Directory.EnumerateFiles(directory, "*", SearchOption.AllDirectories)
            .Where(path => SourceExtensions.Contains(Path.GetExtension(path)))
            .Where(path => !ContainsIgnoredDirectory(path))
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase);
    }

    private static bool ContainsIgnoredDirectory(string path)
    {
        var segments = Path.GetRelativePath(FindRepositoryRoot(), path)
            .Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        return segments.Any(segment => IgnoredDirectoryNames.Contains(segment, StringComparer.OrdinalIgnoreCase));
    }

    private static string ToRepositoryPath(string path)
    {
        return Path.GetRelativePath(FindRepositoryRoot(), path).Replace('\\', '/');
    }

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory != null && !Directory.Exists(Path.Combine(directory.FullName, "backend")))
            directory = directory.Parent;
        return directory?.FullName ?? throw new DirectoryNotFoundException("Repository root not found.");
    }
}
