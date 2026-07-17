using MangaNPK.Data;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
                ViewBag.Error = "Vui lòng nhập tên đăng nhập/email và mật khẩu.";
                return View();
            }

            var loginClean = username.Trim().ToLowerInvariant();

#pragma warning disable CA1862
            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.Username.ToLower() == loginClean || u.Email.ToLower() == loginClean);
#pragma warning restore CA1862

            if (user == null || !AuthService.VerifyPassword(password, user.PasswordHash))
            {
                ViewBag.Error = "Tên đăng nhập/email hoặc mật khẩu không chính xác.";
                return View();
            }

            // Automatically upgrade legacy SHA-256 hash to BCrypt on next login
            if (AuthService.IsLegacyHash(user.PasswordHash))
            {
                user.PasswordHash = AuthService.HashPassword(password);
                await _context.SaveChangesAsync();
            }

            SetUserSession(user);

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
            var usernameClean = (username ?? string.Empty).Trim();
            var emailClean = (email ?? string.Empty).Trim().ToLowerInvariant();

            if (!AuthService.IsValidUsername(usernameClean))
            {
                ViewBag.Error = "Tên đăng nhập phải dài 3-24 ký tự và chỉ gồm chữ, số, dấu gạch dưới hoặc gạch ngang.";
                return View();
            }

            if (!AuthService.IsValidEmail(emailClean))
            {
                ViewBag.Error = "Vui lòng nhập email hợp lệ.";
                return View();
            }

            if (!AuthService.IsValidPassword(password))
            {
                ViewBag.Error = "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số.";
                return View();
            }

            if (password != confirmPassword)
            {
                ViewBag.Error = "Mật khẩu xác nhận không khớp.";
                return View();
            }

#pragma warning disable CA1862
            if (await _context.Users.AnyAsync(u => u.Username.ToLower() == usernameClean.ToLower()))
#pragma warning restore CA1862
            {
                ViewBag.Error = "Tên đăng nhập đã tồn tại.";
                return View();
            }

#pragma warning disable CA1862
            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == emailClean))
#pragma warning restore CA1862
            {
                ViewBag.Error = "Email đã được sử dụng.";
                return View();
            }

            var user = new User
            {
                Username = usernameClean,
                Email = emailClean,
                PasswordHash = AuthService.HashPassword(password),
                Role = await _context.Users.AnyAsync() ? "User" : "Admin",
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            SetUserSession(user);

            return RedirectToAction("Index", "Home");
        }

        [HttpGet("logout")]
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Index", "Home");
        }

        private void SetUserSession(User user)
        {
            HttpContext.Session.SetString("Username", user.Username);
            HttpContext.Session.SetString("Role", user.Role);
            HttpContext.Session.SetInt32("UserId", user.Id);
        }
    }
}
