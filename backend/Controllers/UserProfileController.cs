using MangaNPK.Data;
using MangaNPK.Filters;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserProfileController(MangaDbContext context) : ControllerBase
    {
        private readonly MangaDbContext _context = context;

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetProfile(int userId)
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return NotFound(new { message = "Không tìm thấy người dùng." });

            var libraryCount = await _context.UserMangaLibraries.CountAsync(uml => uml.UserId == userId);
            var commentCount = await _context.Comments.CountAsync(c => c.UserId == userId);

            return Ok(new UserProfileDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Role = user.Role,
                AvatarUrl = user.AvatarUrl,
                Bio = user.Bio,
                Badge = user.Badge,
                CreatedAt = user.CreatedAt,
                LibraryCount = libraryCount,
                CommentCount = commentCount
            });
        }

        [HttpGet("me")]
        [RequireAuth]
        public async Task<IActionResult> GetMyProfile()
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;
            return await GetProfile(userId);
        }

        [HttpPut("me")]
        [RequireAuth]
        public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateProfileDto dto)
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
                return NotFound(new { message = "Không tìm thấy người dùng." });

            if (!string.IsNullOrWhiteSpace(dto.Email))
                user.Email = dto.Email.Trim();

            if (dto.Bio != null)
                user.Bio = dto.Bio.Trim();

            if (!string.IsNullOrWhiteSpace(dto.AvatarUrl))
                user.AvatarUrl = dto.AvatarUrl.Trim();

            if (!string.IsNullOrWhiteSpace(dto.Badge))
                user.Badge = dto.Badge.Trim();

            await _context.SaveChangesAsync();

            var libraryCount = await _context.UserMangaLibraries.CountAsync(uml => uml.UserId == userId);
            var commentCount = await _context.Comments.CountAsync(c => c.UserId == userId);

            return Ok(new UserProfileDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Role = user.Role,
                AvatarUrl = user.AvatarUrl,
                Bio = user.Bio,
                Badge = user.Badge,
                CreatedAt = user.CreatedAt,
                LibraryCount = libraryCount,
                CommentCount = commentCount
            });
        }

        [HttpPut("me/password")]
        [RequireAuth]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;

            if (string.IsNullOrWhiteSpace(dto.CurrentPassword) || string.IsNullOrWhiteSpace(dto.NewPassword))
                return BadRequest(new { message = "Mật khẩu không được trống." });

            // Use shared validation — consistent with registration (8+ chars, letter + digit)
            if (!AuthService.IsValidPassword(dto.NewPassword))
                return BadRequest(new { message = "Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ và số." });

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
                return NotFound(new { message = "Không tìm thấy người dùng." });

            if (!AuthService.VerifyPassword(dto.CurrentPassword, user.PasswordHash))
                return BadRequest(new { message = "Mật khẩu hiện tại không đúng." });

            user.PasswordHash = AuthService.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đổi mật khẩu thành công." });
        }
    }

    public class UserProfileDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public string? Bio { get; set; }
        public string? Badge { get; set; }
        public DateTime CreatedAt { get; set; }
        public int LibraryCount { get; set; }
        public int CommentCount { get; set; }
    }

    public class UpdateProfileDto
    {
        public string? Email { get; set; }
        public string? Bio { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Badge { get; set; }
    }

    public class ChangePasswordDto
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
