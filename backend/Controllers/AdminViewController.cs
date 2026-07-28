using MangaNPK.Data;
using MangaNPK.Filters;
using MangaNPK.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers
{
    [Route("admin")]
    [RequireAdmin]
    public class AdminViewController(MangaDbContext context) : Controller
    {
        private readonly MangaDbContext _context = context;

        // GET /admin
        [HttpGet("")]
        public async Task<IActionResult> Index()
        {
            ViewBag.MangaCount = await _context.Mangas.CountAsync();
            ViewBag.ChapterCount = await _context.Chapters.CountAsync();
            ViewBag.UserCount = await _context.Users.CountAsync();
            ViewBag.AuthorCount = await _context.Authors.CountAsync();
            return View();
        }

        [HttpGet("reports")]
        public IActionResult Reports() => View();

        [HttpGet("users/{id:int}")]
        public async Task<IActionResult> UserDetail(int id)
        {
            var exists = await _context.Users.AsNoTracking().AnyAsync(user => user.Id == id);
            return exists ? View(id) : NotFound();
        }

        // ── MANGA ──────────────────────────────────────────────────────────────

        // Legacy chapter-create links now land on the current Admin chapter workflow.
        [HttpGet("chapter/create/{mangaId:int}")]
        public IActionResult ChapterCreate(int mangaId) => RedirectToAction(nameof(Index));

        // ── AUTHORS ────────────────────────────────────────────────────────────

        [HttpGet("authors")]
        public async Task<IActionResult> Authors()
        {
            var authors = await _context.Authors.OrderBy(a => a.Name).ToListAsync();
            return View(authors);
        }

        [HttpPost("author/create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AuthorCreate(string name, string biography)
        {
            if (!string.IsNullOrWhiteSpace(name))
            {
                _context.Authors.Add(new Author { Name = name.Trim(), Biography = biography?.Trim() ?? string.Empty });
                await _context.SaveChangesAsync();
            }
            return RedirectToAction("Authors");
        }

        [HttpPost("author/update/{id:int}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AuthorUpdate(int id, string name, string biography)
        {
            var author = await _context.Authors.FindAsync(id);
            if (author != null && !string.IsNullOrWhiteSpace(name))
            {
                author.Name = name.Trim(); author.Biography = biography?.Trim() ?? string.Empty;
                await _context.SaveChangesAsync();
            }
            return RedirectToAction(nameof(Authors));
        }

        [HttpPost("author/delete/{id:int}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AuthorDelete(int id)
        {
            var author = await _context.Authors.FindAsync(id);
            if (author != null) { _context.Authors.Remove(author); await _context.SaveChangesAsync(); }
            return RedirectToAction("Authors");
        }

        // ── GENRES ─────────────────────────────────────────────────────────────

        [HttpGet("genres")]
        public async Task<IActionResult> Genres()
        {
            var genres = await _context.Genres.OrderBy(g => g.Name).ToListAsync();
            return View(genres);
        }

        [HttpPost("genre/create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> GenreCreate(string name, string slug)
        {
            if (!string.IsNullOrWhiteSpace(name))
            {
                var s = string.IsNullOrWhiteSpace(slug) ? name.Trim().ToLower().Replace(" ", "-") : slug.Trim();
                _context.Genres.Add(new Genre { Name = name.Trim(), Slug = s });
                await _context.SaveChangesAsync();
            }
            return RedirectToAction("Genres");
        }

        [HttpPost("genre/update/{id:int}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> GenreUpdate(int id, string name, string slug)
        {
            var genre = await _context.Genres.FindAsync(id);
            if (genre != null && !string.IsNullOrWhiteSpace(name))
            {
                genre.Name = name.Trim();
                genre.Slug = string.IsNullOrWhiteSpace(slug) ? name.Trim().ToLowerInvariant().Replace(" ", "-") : slug.Trim();
                await _context.SaveChangesAsync();
            }
            return RedirectToAction(nameof(Genres));
        }

        [HttpPost("genre/delete/{id:int}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> GenreDelete(int id)
        {
            var genre = await _context.Genres.FindAsync(id);
            if (genre != null) { _context.Genres.Remove(genre); await _context.SaveChangesAsync(); }
            return RedirectToAction("Genres");
        }
    }
}
