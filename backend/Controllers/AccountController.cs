using Microsoft.AspNetCore.Mvc;

namespace MangaNPK.Controllers;

[Route("account")]
public class AccountController : Controller
{
    [HttpGet("login")]
    public IActionResult Login() => Redirect("/?auth=login");

    [HttpGet("register")]
    public IActionResult Register() => Redirect("/?auth=register");

    [HttpGet("logout")]
    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        return RedirectToAction("Index", "Home");
    }
}
