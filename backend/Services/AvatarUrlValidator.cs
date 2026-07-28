namespace MangaNPK.Services;

public static class AvatarUrlValidator
{
    public const int MaxLength = 2048;

    public static string? GetValidationError(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var avatarUrl = value.Trim();
        if (avatarUrl.Length > MaxLength)
            return $"URL ảnh đại diện không được vượt quá {MaxLength:N0} ký tự.";

        return Uri.TryCreate(avatarUrl, UriKind.Absolute, out var uri)
               && uri.Scheme == Uri.UriSchemeHttps
               && !string.IsNullOrWhiteSpace(uri.Host)
            ? null
            : "Ảnh đại diện phải là URL HTTPS hợp lệ.";
    }
}
