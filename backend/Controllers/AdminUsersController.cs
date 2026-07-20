using System.Data;
using MangaNPK.Contracts.Admin;
using MangaNPK.Data;
using MangaNPK.Filters;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace MangaNPK.Controllers;

[ApiController]
[Route("api/admin")]
[RequireAdmin]
public sealed class AdminUsersController(MangaDbContext context) : ControllerBase
{
    [HttpGet("users")]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? role = null,
        [FromQuery] string? status = null)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var currentUserId = HttpContext.Session.GetInt32("UserId")!.Value;
        var query = context.Users.AsNoTracking();
        var term = search?.Trim();
        if (!string.IsNullOrWhiteSpace(term))
            query = query.Where(user => user.Username.Contains(term) || user.Email.Contains(term));
        if (string.Equals(role, "User", StringComparison.OrdinalIgnoreCase)) query = query.Where(user => user.Role == "User");
        if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase)) query = query.Where(user => user.Role == "Admin");
        if (string.Equals(status, "active", StringComparison.OrdinalIgnoreCase)) query = query.Where(user => !user.IsLocked);
        if (string.Equals(status, "locked", StringComparison.OrdinalIgnoreCase)) query = query.Where(user => user.IsLocked);

        var totalItems = await query.CountAsync(HttpContext.RequestAborted);
        var totalPages = Math.Max(1, (int)Math.Ceiling(totalItems / (double)pageSize));
        page = Math.Min(page, totalPages);
        var items = await query.OrderByDescending(user => user.CreatedAt).ThenByDescending(user => user.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(user => new AdminUserListItemDto(user.Id, user.Username, user.Email, user.Role,
                user.AvatarUrl, user.IsLocked, user.CreatedAt, user.Id == currentUserId))
            .ToListAsync(HttpContext.RequestAborted);
        return Ok(new AdminUserListResponse(items, page, pageSize, totalItems, totalPages));
    }

    [HttpPut("users/{id:int}/role")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateUserRoleDto dto)
    {
        var role = dto.Role.Trim();
        if (role is not ("User" or "Admin")) return BadRequest(new { message = "Vai trò không hợp lệ." });
        var currentUserId = HttpContext.Session.GetInt32("UserId")!.Value;
        await using var transaction = await BeginGuardTransactionAsync();
        var user = await context.Users.FindAsync([id], HttpContext.RequestAborted);
        if (user is null) return NotFound(new { message = "Không tìm thấy người dùng." });
        if (id == currentUserId && role == "User") return Conflict(new { message = "Bạn không thể tự hạ quyền tài khoản đang đăng nhập." });
        if (user.Role == "Admin" && role == "User" && !user.IsLocked && await CountActiveAdminsAsync() <= 1)
            return Conflict(new { message = "Không thể hạ quyền quản trị viên hoạt động cuối cùng." });
        user.Role = role;
        await context.SaveChangesAsync(HttpContext.RequestAborted);
        if (transaction is not null) await transaction.CommitAsync(HttpContext.RequestAborted);
        return Ok(ToDto(user, currentUserId));
    }

    [HttpPut("users/{id:int}/lock")]
    public async Task<IActionResult> UpdateLock(int id, [FromBody] UpdateUserLockDto dto)
    {
        var currentUserId = HttpContext.Session.GetInt32("UserId")!.Value;
        await using var transaction = await BeginGuardTransactionAsync();
        var user = await context.Users.FindAsync([id], HttpContext.RequestAborted);
        if (user is null) return NotFound(new { message = "Không tìm thấy người dùng." });
        if (id == currentUserId && dto.IsLocked) return Conflict(new { message = "Bạn không thể tự khóa tài khoản đang đăng nhập." });
        if (user.Role == "Admin" && !user.IsLocked && dto.IsLocked && await CountActiveAdminsAsync() <= 1)
            return Conflict(new { message = "Không thể khóa quản trị viên hoạt động cuối cùng." });
        user.IsLocked = dto.IsLocked;
        await context.SaveChangesAsync(HttpContext.RequestAborted);
        if (transaction is not null) await transaction.CommitAsync(HttpContext.RequestAborted);
        return Ok(ToDto(user, currentUserId));
    }

    private async Task<IDbContextTransaction?> BeginGuardTransactionAsync()
    {
        if (!context.Database.IsRelational()) return null;
        return await context.Database.BeginTransactionAsync(IsolationLevel.Serializable, HttpContext.RequestAborted);
    }

    private Task<int> CountActiveAdminsAsync() => context.Users.CountAsync(
        user => user.Role == "Admin" && !user.IsLocked,
        HttpContext.RequestAborted);

    private AdminUserListItemDto ToDto(MangaNPK.Models.User user, int currentUserId) =>
        new(user.Id, user.Username, user.Email, user.Role, user.AvatarUrl,
            user.IsLocked, user.CreatedAt, user.Id == currentUserId);
}
