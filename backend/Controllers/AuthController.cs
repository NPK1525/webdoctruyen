using MangaNPK.Data;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController(MangaDbContext context) : ControllerBase
    {
        private readonly MangaDbContext _context = context;

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            var usernameClean = dto.Username.Trim();
            var emailClean = dto.Email.Trim().ToLowerInvariant();

            if (!AuthService.IsValidUsername(usernameClean))
                return BadRequest(new { message = "Tên đăng nhập phải dài 3-24 ký tự và chỉ gồm chữ, số, dấu gạch dưới hoặc gạch ngang." });

            if (!AuthService.IsValidEmail(emailClean))
                return BadRequest(new { message = "Vui lòng nhập email hợp lệ." });

            if (!AuthService.IsValidPassword(dto.Password))
                return BadRequest(new { message = "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số." });

#pragma warning disable CA1862
            if (await _context.Users.AnyAsync(u => u.Username.ToLower() == usernameClean.ToLower()))
#pragma warning restore CA1862
                return BadRequest(new { message = "Tên đăng nhập đã tồn tại." });

#pragma warning disable CA1862
            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == emailClean))
#pragma warning restore CA1862
                return BadRequest(new { message = "Email đã được sử dụng." });

            var isFirstUser = !await _context.Users.AnyAsync();

            var user = new User
            {
                Username = usernameClean,
                Email = emailClean,
                PasswordHash = AuthService.HashPassword(dto.Password),
                // First user is Admin only if NO seeded admin exists at all
                Role = isFirstUser ? "Admin" : "User",
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            SetUserSession(user);

            return Ok(new
            {
                message = "Đăng ký tài khoản thành công!",
                user = new { id = user.Id, username = user.Username, email = user.Email, role = user.Role }
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest(new { message = "Vui lòng nhập tên đăng nhập/email và mật khẩu." });

            var loginClean = dto.Username.Trim().ToLowerInvariant();

#pragma warning disable CA1862
            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.Username.ToLower() == loginClean || u.Email.ToLower() == loginClean);
#pragma warning restore CA1862

            if (user == null || !AuthService.VerifyPassword(dto.Password, user.PasswordHash))
                return Unauthorized(new { message = "Tên đăng nhập/email hoặc mật khẩu không chính xác." });

            // Automatically upgrade legacy SHA-256 hash to BCrypt on next login
            if (AuthService.IsLegacyHash(user.PasswordHash))
            {
                user.PasswordHash = AuthService.HashPassword(dto.Password);
                await _context.SaveChangesAsync();
            }

            SetUserSession(user);

            return Ok(new
            {
                message = "Đăng nhập thành công!",
                user = new { id = user.Id, username = user.Username, email = user.Email, role = user.Role }
            });
        }

        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
                return Unauthorized(new { message = "Chưa đăng nhập." });

            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value);
            if (user == null)
            {
                HttpContext.Session.Clear();
                return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ." });
            }

            return Ok(new { user = new { id = user.Id, username = user.Username, email = user.Email, role = user.Role } });
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return Ok(new { message = "Đã đăng xuất." });
        }

        private void SetUserSession(User user)
        {
            HttpContext.Session.SetString("Username", user.Username);
            HttpContext.Session.SetString("Role", user.Role);
            HttpContext.Session.SetInt32("UserId", user.Id);
        }
    }

    public class RegisterDto
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
