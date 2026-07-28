namespace MangaNPK.Services;

public static class ContributorRoleClassifier
{
    public const string Story = "Story";
    public const string Art = "Art";
    public const string StoryAndArt = "Story & Art";

    public static bool IsStoryRole(string? role)
    {
        var normalized = Normalize(role);
        return normalized is Story or StoryAndArt;
    }

    public static bool IsArtRole(string? role)
    {
        var normalized = Normalize(role);
        return normalized is Art or StoryAndArt;
    }

    public static string Normalize(string? role)
    {
        var cleanRole = (role ?? string.Empty).Trim();
        if (cleanRole.Equals(StoryAndArt, StringComparison.OrdinalIgnoreCase)) return StoryAndArt;
        if (cleanRole.StartsWith(Story, StringComparison.OrdinalIgnoreCase)) return Story;
        if (cleanRole.StartsWith(Art, StringComparison.OrdinalIgnoreCase)) return Art;
        return StoryAndArt;
    }
}
