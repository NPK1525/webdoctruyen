using MangaNPK.Data;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GenreController(MangaDbContext context, GenreDeduplicationService genreDeduplicationService) : ControllerBase
    {
        private readonly MangaDbContext _context = context;
        private readonly GenreDeduplicationService _genreDeduplicationService = genreDeduplicationService;

        [HttpGet]
        public async Task<IActionResult> GetGenres()
        {
            var cancellationToken = HttpContext?.RequestAborted ?? CancellationToken.None;
            await _genreDeduplicationService.MergeDuplicateGenresAsync(cancellationToken);
            var genres = await _context.Genres
                .OrderBy(g => g.Name)
                .ToListAsync(cancellationToken);
            return Ok(genres);
        }
    }
}
