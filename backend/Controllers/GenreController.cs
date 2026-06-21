using MangaNPK.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GenreController(MangaDbContext context) : ControllerBase
    {
        private readonly MangaDbContext _context = context;

        [HttpGet]
        public async Task<IActionResult> GetGenres()
        {
            var genres = await _context.Genres
                .OrderBy(g => g.Name)
                .ToListAsync();
            return Ok(genres);
        }
    }
}
