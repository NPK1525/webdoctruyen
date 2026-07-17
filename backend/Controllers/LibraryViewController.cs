using Microsoft.AspNetCore.Mvc;

namespace MangaNPK.Controllers
{
    [Route("library")]
    public class LibraryViewController : Controller
    {
        [HttpGet("")]
        public IActionResult Index()
        {
            return View();
        }
    }
}
