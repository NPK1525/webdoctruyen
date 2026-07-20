namespace MangaNPK.Contracts.Admin;

public sealed record AdminUserListItemDto(
    int Id,
    string Username,
    string Email,
    string Role,
    string? AvatarUrl,
    string? Bio,
    string? Badge,
    bool IsLocked,
    DateTime CreatedAt,
    bool IsCurrentUser);

public sealed record AdminUserListResponse(
    IReadOnlyList<AdminUserListItemDto> Items,
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages);

public sealed class UpdateUserRoleDto
{
    public string Role { get; set; } = string.Empty;
}

public sealed class UpdateUserLockDto
{
    public bool IsLocked { get; set; }
}

public sealed class UpdateUserProfileDto
{
    public string? Role { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public string? Badge { get; set; }
}
