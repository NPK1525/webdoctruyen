using MangaNPK.Filters;
using Microsoft.AspNetCore.Mvc;

namespace MangaNPK.Controllers;

[Route("my-reports")]
[RequireAuth]
public class ReportsViewController : Controller
{
    [HttpGet]
    public IActionResult Index() => View("~/Views/Reports/Index.cshtml");
}
