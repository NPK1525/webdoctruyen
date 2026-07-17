namespace MangaNPK.Services;

public static class ChapterUploadValidator
{
    public static (IReadOnlyList<string> Urls, string? Error) ParsePageUrls(string? value)
    {
        var urls = new List<string>();
        if (string.IsNullOrWhiteSpace(value))
            return (urls, null);

        foreach (var rawUrl in value.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var url = rawUrl.Trim().TrimEnd('\r');
            if (string.IsNullOrWhiteSpace(url))
                continue;

            var isRootRelative = url.StartsWith('/') && !url.StartsWith("//", StringComparison.Ordinal);
            var isHttpUrl = Uri.TryCreate(url, UriKind.Absolute, out var uri)
                && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);

            if (!isRootRelative && !isHttpUrl)
                return (Array.Empty<string>(), $"URL ảnh “{url}” không hợp lệ.");

            urls.Add(url);
        }

        return (urls, null);
    }

    public static string? ValidateHasPages(int fileCount, int urlCount)
    {
        return fileCount + urlCount == 0
            ? "Chapter phải có ít nhất một trang truyện."
            : null;
    }
}
