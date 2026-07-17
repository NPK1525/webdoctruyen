using Microsoft.AspNetCore.Mvc;

namespace MangaNPK.Controllers;

[Route("lists")]
public sealed class MangaListsViewController : Controller
{
    [HttpGet("")]
    public IActionResult Index() => View();
}
