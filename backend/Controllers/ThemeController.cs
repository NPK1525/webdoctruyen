using MangaNPK.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ThemeController(MangaDbContext context) : ControllerBase
    {
        private readonly MangaDbContext _context = context;

        [HttpGet]
        public async Task<IActionResult> GetThemes()
        {
            var themes = await _context.Themes
                .OrderBy(t => t.Name)
                .ToListAsync();
            return Ok(themes);
        }
    }
}
