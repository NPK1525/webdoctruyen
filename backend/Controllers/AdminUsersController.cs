using System.Data;
using MangaNPK.Contracts.Admin;
using MangaNPK.Data;
using MangaNPK.Filters;
using MangaNPK.Services;
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
                user.AvatarUrl, user.Bio, user.Badge, user.IsLocked, user.CreatedAt, user.Id == currentUserId))
            .ToListAsync(HttpContext.RequestAborted);
        return Ok(new AdminUserListResponse(items, page, pageSize, totalItems, totalPages));
    }

    [HttpGet("users/{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var currentUserId = HttpContext.Session.GetInt32("UserId")!.Value;
        var user = await context.Users.AsNoTracking()
            .Where(candidate => candidate.Id == id)
            .Select(candidate => new AdminUserListItemDto(
                candidate.Id,
                candidate.Username,
                candidate.Email,
                candidate.Role,
                candidate.AvatarUrl,
                candidate.Bio,
                candidate.Badge,
                candidate.IsLocked,
                candidate.CreatedAt,
                candidate.Id == currentUserId))
            .SingleOrDefaultAsync(HttpContext.RequestAborted);

        return user is null
            ? NotFound(new { message = "Không tìm thấy người dùng." })
            : Ok(user);
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

    [HttpPut("users/{id:int}")]
    public async Task<IActionResult> UpdateProfile(int id, [FromBody] UpdateUserProfileDto dto)
    {
        var username = dto.Username.Trim();
        var email = dto.Email.Trim().ToLowerInvariant();
        var normalizedUsername = UserIdentityNormalizer.Username(username);
        var normalizedEmail = UserIdentityNormalizer.Email(email);
        if (!AuthService.IsValidUsername(username)) return BadRequest(new { message = "Tên đăng nhập phải dài 3-24 ký tự và chỉ gồm chữ, số, dấu gạch dưới hoặc gạch ngang." });
        if (!AuthService.IsValidEmail(email)) return BadRequest(new { message = "Email không hợp lệ." });
        if (dto.Bio?.Length > 500) return BadRequest(new { message = "Tiểu sử không được vượt quá 500 ký tự." });
        if (dto.Badge?.Length > 50) return BadRequest(new { message = "Huy hiệu không được vượt quá 50 ký tự." });
        var avatarError = AvatarUrlValidator.GetValidationError(dto.AvatarUrl);
        if (avatarError is not null) return BadRequest(new { message = avatarError });

        var currentUserId = HttpContext.Session.GetInt32("UserId")!.Value;
        var requestedRole = string.IsNullOrWhiteSpace(dto.Role) ? null : dto.Role.Trim();
        if (requestedRole is not null && requestedRole is not ("User" or "Admin"))
            return BadRequest(new { message = "Vai trò không hợp lệ." });
        await using var transaction = await BeginGuardTransactionAsync();
        var user = await context.Users.FindAsync([id], HttpContext.RequestAborted);
        if (user is null) return NotFound(new { message = "Không tìm thấy người dùng." });
        if (requestedRole == "User" && id == currentUserId)
            return Conflict(new { message = "Bạn không thể tự hạ quyền tài khoản đang đăng nhập." });
        if (requestedRole == "User" && user.Role == "Admin" && !user.IsLocked && await CountActiveAdminsAsync() <= 1)
            return Conflict(new { message = "Không thể hạ quyền quản trị viên hoạt động cuối cùng." });
        if (await context.Users.AnyAsync(other => other.Id != id && other.NormalizedUsername == normalizedUsername, HttpContext.RequestAborted))
            return Conflict(new { message = "Tên đăng nhập đã được sử dụng." });
        if (await context.Users.AnyAsync(other => other.Id != id && other.NormalizedEmail == normalizedEmail, HttpContext.RequestAborted))
            return Conflict(new { message = "Email đã được sử dụng." });
        user.Username = username;
        user.Email = email;
        if (requestedRole is not null) user.Role = requestedRole;
        user.AvatarUrl = string.IsNullOrWhiteSpace(dto.AvatarUrl) ? null : dto.AvatarUrl.Trim();
        user.Bio = string.IsNullOrWhiteSpace(dto.Bio) ? null : dto.Bio.Trim();
        user.Badge = string.IsNullOrWhiteSpace(dto.Badge) ? null : dto.Badge.Trim();
        try
        {
            await context.SaveChangesAsync(HttpContext.RequestAborted);
        }
        catch (DbUpdateException exception) when (UserIdentityConflict.FromDbUpdateException(exception) is not null)
        {
            var conflict = UserIdentityConflict.FromDbUpdateException(exception)!;
            return Conflict(new { message = conflict.Message });
        }
        if (transaction is not null) await transaction.CommitAsync(HttpContext.RequestAborted);
        if (id == currentUserId)
        {
            HttpContext.Session.SetString("Username", user.Username);
        }
        return Ok(ToDto(user, currentUserId));
    }

    [HttpPut("users/{id:int}/password")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetUserPasswordDto dto)
    {
        if (!string.Equals(dto.NewPassword, dto.ConfirmPassword, StringComparison.Ordinal))
            return BadRequest(new { message = "Mật khẩu xác nhận không khớp." });
        if (!AuthService.IsValidPassword(dto.NewPassword))
            return BadRequest(new { message = "Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ và số." });

        var user = await context.Users.FindAsync([id], HttpContext.RequestAborted);
        if (user is null) return NotFound(new { message = "Không tìm thấy người dùng." });

        user.PasswordHash = AuthService.HashPassword(dto.NewPassword);
        await context.SaveChangesAsync(HttpContext.RequestAborted);
        return Ok(new { message = "Đã đặt lại mật khẩu người dùng." });
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
            user.Bio, user.Badge, user.IsLocked, user.CreatedAt, user.Id == currentUserId);
}
