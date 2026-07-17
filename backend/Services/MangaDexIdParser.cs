using System.Text.RegularExpressions;

namespace MangaNPK.Services;

public static partial class MangaDexIdParser
{
    private const string UuidPattern = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

    public static string ExtractMangaId(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            throw new ArgumentException("Vui long nhap URL hoac UUID MangaDex.", nameof(input));
        }

        var match = MangaDexUuidRegex().Match(input.Trim());
        if (!match.Success)
        {
            throw new ArgumentException("Khong tim thay UUID MangaDex hop le.", nameof(input));
        }

        return match.Value.ToLowerInvariant();
    }

    [GeneratedRegex(UuidPattern)]
    private static partial Regex MangaDexUuidRegex();
}
