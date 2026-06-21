using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

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
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new { message = "Tên đăng nhập và mật khẩu không được trống." });
            }

            var usernameClean = dto.Username.Trim();
            var emailClean = dto.Email?.Trim() ?? string.Empty;

#pragma warning disable CA1862 // Use the 'StringComparison' overload of 'Equals' to perform a case-insensitive comparison
            if (await _context.Users.AnyAsync(u => u.Username.ToLower() == usernameClean.ToLower()))
#pragma warning restore CA1862
            {
                return BadRequest(new { message = "Tài khoản đã tồn tại trong hệ thống." });
            }

            var user = new User
            {
                Username = usernameClean,
                Email = emailClean,
                PasswordHash = HashPassword(dto.Password),
                Role = "User", // Mặc định là User
                CreatedAt = System.DateTime.UtcNow
            };

            // Nếu đây là người dùng đầu tiên đăng ký, gán quyền Admin để tiện test các chức năng Admin!
            if (!await _context.Users.AnyAsync())
            {
                user.Role = "Admin";
            }

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đăng ký tài khoản thành công!", user = new { user.Username, user.Role } });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new { message = "Vui lòng nhập tên đăng nhập và mật khẩu." });
            }

            var usernameClean = dto.Username.Trim().ToLower();
            var hashedPassword = HashPassword(dto.Password);

#pragma warning disable CA1862 // Use the 'StringComparison' overload of 'Equals' to perform a case-insensitive comparison
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username.ToLower() == usernameClean && u.PasswordHash == hashedPassword);
#pragma warning restore CA1862

            if (user == null)
            {
                return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không chính xác!" });
            }

            return Ok(new { message = "Đăng nhập thành công!", user = new { user.Username, user.Role } });
        }

        private static string HashPassword(string password)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
            var builder = new StringBuilder();
            foreach (var b in bytes)
            {
                builder.Append(b.ToString("x2"));
            }
            return builder.ToString();
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
