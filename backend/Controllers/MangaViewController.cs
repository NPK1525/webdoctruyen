using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers
{
    [Route("manga")]
    public class MangaViewController(MangaDbContext context) : Controller
    {
        private readonly MangaDbContext _context = context;

        // GET /manga
        [HttpGet("")]
        public IActionResult Index()
        {
            return View();
        }

        // GET /manga/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> Detail(int id)
        {
            var manga = await _context.Mangas
                .Include(m => m.MangaGenres).ThenInclude(mg => mg.Genre)
                .Include(m => m.MangaAuthors).ThenInclude(ma => ma.Author)
                .Include(m => m.MangaThemes).ThenInclude(mt => mt.Theme)
                .Include(m => m.Chapters)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (manga == null) return NotFound();

            // Recommendations: same genres
            var genreIds = manga.MangaGenres.Select(mg => mg.GenreId).ToList();
            var recommendations = await _context.Mangas
                .Include(m => m.MangaGenres)
                .Where(m => m.Id != id && m.MangaGenres.Any(mg => genreIds.Contains(mg.GenreId)))
                .OrderByDescending(m => m.CreatedAt)
                .Take(6)
                .ToListAsync();

            ViewBag.Recommendations = recommendations;
            var userId = HttpContext.Session.GetInt32("UserId");
            ViewBag.CanManageChapters = string.Equals(HttpContext.Session.GetString("Role"), "Admin", StringComparison.OrdinalIgnoreCase)
                || (userId.HasValue && await _context.MangaContributors.AsNoTracking().AnyAsync(c => c.MangaId == id && c.UserId == userId.Value));
            return View(manga);
        }
    }
}
