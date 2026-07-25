namespace MangaNPK.Services;

public static class UserIdentityNormalizer
{
    public static string Username(string? value) =>
        value?.Trim().ToUpperInvariant() ?? string.Empty;

    public static string Email(string? value) =>
        value?.Trim().ToUpperInvariant() ?? string.Empty;
}
