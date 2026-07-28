using Microsoft.AspNetCore.Mvc;

namespace MangaNPK.Controllers;

public sealed class ProfileViewController : Controller
{
    [HttpGet("/profile")]
    public IActionResult Index() => View();
}
