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
        public async Task<IActionResult> Index(
            MangaType? type = null,
            int? genreId = null,
            MangaDemographic? demographic = null,
            string? search = null,
            int page = 1)
        {
            int pageSize = 16;
            var query = _context.Mangas
                .Include(m => m.MangaGenres).ThenInclude(mg => mg.Genre)
                .Include(m => m.Chapters)
                .AsQueryable();

            if (type.HasValue)
                query = query.Where(m => m.Type == type.Value);

            if (genreId.HasValue)
                query = query.Where(m => m.MangaGenres.Any(mg => mg.GenreId == genreId.Value));

            if (demographic.HasValue)
                query = query.Where(m => m.Demographic == demographic.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(m => m.Title.Contains(s) || m.AlternativeTitle.Contains(s));
            }

            var totalCount = await query.CountAsync();
            var mangas = await query
                .OrderByDescending(m => m.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            ViewBag.Genres = await _context.Genres.OrderBy(g => g.Name).ToListAsync();
            ViewBag.TotalCount = totalCount;
            ViewBag.Page = page;
            ViewBag.PageSize = pageSize;
            ViewBag.Search = search;
            ViewBag.SelectedType = type;
            ViewBag.SelectedGenreId = genreId;
            ViewBag.SelectedDemographic = demographic;

            return View(mangas);
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
            return View(manga);
        }
    }
}
