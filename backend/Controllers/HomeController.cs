using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;

namespace MangaNPK.Controllers
{
    public class HomeController(MangaDbContext context, ILogger<HomeController> logger) : Controller
    {
        private readonly MangaDbContext _context = context;
        private readonly ILogger<HomeController> _logger = logger;

        public async Task<IActionResult> Index()
        {
            List<Manga> featured;
            List<Manga> latestUpdated;
            try
            {
                featured = await _context.Mangas
                    .Include(m => m.MangaGenres).ThenInclude(mg => mg.Genre)
                    .Include(m => m.Chapters)
                    .OrderByDescending(m => m.CreatedAt)
                    .Take(6)
                    .ToListAsync();

                latestUpdated = await _context.Mangas
                    .Include(m => m.MangaGenres).ThenInclude(mg => mg.Genre)
                    .Include(m => m.Chapters)
                    .OrderByDescending(m => m.Chapters.Max(c => (DateTime?)c.UploadedAt) ?? m.CreatedAt)
                    .Take(12)
                    .ToListAsync();
            }
            catch (SqlException ex)
            {
                _logger.LogWarning(ex, "Manga database is unavailable; rendering the home page with empty sections.");
                featured = [];
                latestUpdated = [];
            }

            ViewBag.Featured = featured;
            ViewBag.LatestUpdated = latestUpdated;
            return View();
        }
    }
}
