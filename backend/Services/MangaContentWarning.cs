namespace MangaNPK.Services;

public static class MangaContentWarning
{
    private static readonly string[] Supported = ["Gore", "Sexual Violence"];

    public static IReadOnlyList<string> Normalize(IEnumerable<string>? values)
    {
        var source = values ?? [];
        return Supported.Where(supported => source.Any(value =>
            string.Equals(value?.Trim(), supported, StringComparison.OrdinalIgnoreCase))).ToList();
    }
}
