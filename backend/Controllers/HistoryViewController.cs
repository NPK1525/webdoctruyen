using Microsoft.AspNetCore.Mvc;

namespace MangaNPK.Controllers
{
    [Route("history")]
    public class HistoryViewController : Controller
    {
        [HttpGet("")]
        public IActionResult Index()
        {
            return View();
        }
    }
}
