using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace MangaNPK.Controllers
{
    [Route("account")]
    public class AccountController(MangaDbContext context) : Controller
    {
        private readonly MangaDbContext _context = context;

        [HttpGet("login")]
        public IActionResult Login(string? returnUrl = null)
        {
            if (HttpContext.Session.GetString("Username") != null)
                return RedirectToAction("Index", "Home");
            ViewBag.ReturnUrl = returnUrl;
            return View();
        }

        [HttpPost("login")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(string username, string password, string? returnUrl = null)
        {
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                ViewBag.Error = "Vui lòng nhập tên đăng nhập và mật khẩu.";
                return View();
            }

            var hash = HashPassword(password);
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username.ToLower() == username.Trim().ToLower() && u.PasswordHash == hash);

            if (user == null)
            {
                ViewBag.Error = "Tên đăng nhập hoặc mật khẩu không chính xác!";
                return View();
            }

            HttpContext.Session.SetString("Username", user.Username);
            HttpContext.Session.SetString("Role", user.Role);
            HttpContext.Session.SetInt32("UserId", user.Id);

            if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl))
                return Redirect(returnUrl);

            return RedirectToAction("Index", "Home");
        }

        [HttpGet("register")]
        public IActionResult Register()
        {
            if (HttpContext.Session.GetString("Username") != null)
                return RedirectToAction("Index", "Home");
            return View();
        }

        [HttpPost("register")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Register(string username, string email, string password, string confirmPassword)
        {
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                ViewBag.Error = "Tên đăng nhập và mật khẩu không được trống.";
                return View();
            }

            if (password != confirmPassword)
            {
                ViewBag.Error = "Mật khẩu xác nhận không khớp.";
                return View();
            }

            if (await _context.Users.AnyAsync(u => u.Username.ToLower() == username.Trim().ToLower()))
            {
                ViewBag.Error = "Tài khoản đã tồn tại trong hệ thống.";
                return View();
            }

            var user = new User
            {
                Username = username.Trim(),
                Email = email?.Trim() ?? string.Empty,
                PasswordHash = HashPassword(password),
                Role = await _context.Users.AnyAsync() ? "User" : "Admin",
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            HttpContext.Session.SetString("Username", user.Username);
            HttpContext.Session.SetString("Role", user.Role);
            HttpContext.Session.SetInt32("UserId", user.Id);

            return RedirectToAction("Index", "Home");
        }

        [HttpGet("logout")]
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Index", "Home");
        }

        private static string HashPassword(string password)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
            return Convert.ToHexString(bytes).ToLower();
        }
    }
}
