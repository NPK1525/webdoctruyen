namespace MangaNPK.Services;

public static class LegacyRouteRedirect
{
    public static string? Resolve(string? path, string? mangaId, string? chapterId)
    {
        if (string.Equals(path, "/index.html", StringComparison.OrdinalIgnoreCase))
        {
            return "/";
        }

        if (string.Equals(path, "/lists.html", StringComparison.OrdinalIgnoreCase))
        {
            return "/lists";
        }

        if (string.Equals(path, "/detail.html", StringComparison.OrdinalIgnoreCase))
        {
            return TryGetPositiveId(mangaId, out var id) ? $"/manga/{id}" : "/manga";
        }

        if (string.Equals(path, "/reader.html", StringComparison.OrdinalIgnoreCase))
        {
            return TryGetPositiveId(chapterId, out var id) ? $"/chapter/{id}" : "/";
        }

        return null;
    }

    private static bool TryGetPositiveId(string? value, out int id)
    {
        return int.TryParse(value, out id) && id > 0;
    }
}
