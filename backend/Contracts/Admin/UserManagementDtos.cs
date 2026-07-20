namespace MangaNPK.Contracts.Admin;

public sealed record AdminUserListItemDto(
    int Id,
    string Username,
    string Email,
    string Role,
    string? AvatarUrl,
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
