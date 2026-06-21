using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers
{
    public class HomeController(MangaDbContext context) : Controller
    {
        private readonly MangaDbContext _context = context;

        public async Task<IActionResult> Index()
        {
            var featured = await _context.Mangas
                .Include(m => m.MangaGenres).ThenInclude(mg => mg.Genre)
                .Include(m => m.Chapters)
                .OrderByDescending(m => m.CreatedAt)
                .Take(6)
                .ToListAsync();

            var latestUpdated = await _context.Mangas
                .Include(m => m.MangaGenres).ThenInclude(mg => mg.Genre)
                .Include(m => m.Chapters)
                .OrderByDescending(m => m.Chapters.Max(c => (DateTime?)c.UploadedAt) ?? m.CreatedAt)
                .Take(12)
                .ToListAsync();

            ViewBag.Featured = featured;
            ViewBag.LatestUpdated = latestUpdated;
            return View();
        }
    }
}
