using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers
{
    [Route("admin")]
    public class AdminViewController(MangaDbContext context) : Controller
    {
        private readonly MangaDbContext _context = context;

        private IActionResult RequireAdmin()
        {
            if (HttpContext.Session.GetString("Role") != "Admin")
                return RedirectToAction("Login", "Account");
            return null!;
        }

        // GET /admin
        [HttpGet("")]
        public async Task<IActionResult> Index()
        {
            var check = RequireAdmin();
            if (check != null) return check;

            ViewBag.MangaCount = await _context.Mangas.CountAsync();
            ViewBag.ChapterCount = await _context.Chapters.CountAsync();
            ViewBag.UserCount = await _context.Users.CountAsync();
            ViewBag.AuthorCount = await _context.Authors.CountAsync();
            return View();
        }

        // ── MANGA ──────────────────────────────────────────────────────────────

        [HttpGet("manga")]
        public async Task<IActionResult> MangaList()
        {
            var check = RequireAdmin();
            if (check != null) return check;

            var mangas = await _context.Mangas
                .Include(m => m.MangaGenres).ThenInclude(mg => mg.Genre)
                .Include(m => m.Chapters)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();
            return View(mangas);
        }

        [HttpGet("manga/create")]
        public async Task<IActionResult> MangaCreate()
        {
            var check = RequireAdmin();
            if (check != null) return check;

            ViewBag.Genres = await _context.Genres.OrderBy(g => g.Name).ToListAsync();
            ViewBag.Themes = await _context.Themes.OrderBy(t => t.Name).ToListAsync();
            ViewBag.Authors = await _context.Authors.OrderBy(a => a.Name).ToListAsync();
            return View();
        }

        [HttpPost("manga/create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> MangaCreate(
            string title, string alternativeTitle, string description, string coverUrl,
            MangaType type, MangaStatus status, MangaDemographic demographic, MangaFormat format,
            int? releaseYear, int[]? genreIds, int[]? themeIds, int[]? authorIds, string[]? authorRoles)
        {
            var check = RequireAdmin();
            if (check != null) return check;

            if (string.IsNullOrWhiteSpace(title))
            {
                ViewBag.Error = "Tên manga không được trống.";
                ViewBag.Genres = await _context.Genres.OrderBy(g => g.Name).ToListAsync();
                ViewBag.Themes = await _context.Themes.OrderBy(t => t.Name).ToListAsync();
                ViewBag.Authors = await _context.Authors.OrderBy(a => a.Name).ToListAsync();
                return View();
            }

            var manga = new Manga
            {
                Title = title.Trim(),
                AlternativeTitle = alternativeTitle?.Trim() ?? string.Empty,
                Description = description?.Trim() ?? string.Empty,
                CoverUrl = coverUrl?.Trim() ?? string.Empty,
                Type = type, Status = status, Demographic = demographic, Format = format,
                ReleaseYear = releaseYear,
                CreatedAt = DateTime.UtcNow
            };
            _context.Mangas.Add(manga);
            await _context.SaveChangesAsync();

            if (genreIds != null)
                _context.MangaGenres.AddRange(genreIds.Select(gid => new MangaGenre { MangaId = manga.Id, GenreId = gid }));

            if (themeIds != null)
                _context.MangaThemes.AddRange(themeIds.Select(tid => new MangaTheme { MangaId = manga.Id, ThemeId = tid }));

            if (authorIds != null)
                for (int i = 0; i < authorIds.Length; i++)
                    _context.MangaAuthors.Add(new MangaAuthor
                    {
                        MangaId = manga.Id,
                        AuthorId = authorIds[i],
                        Role = (authorRoles != null && i < authorRoles.Length) ? authorRoles[i] : "Story & Art"
                    });

            await _context.SaveChangesAsync();
            return RedirectToAction("MangaList");
        }

        [HttpGet("manga/edit/{id:int}")]
        public async Task<IActionResult> MangaEdit(int id)
        {
            var check = RequireAdmin();
            if (check != null) return check;

            var manga = await _context.Mangas
                .Include(m => m.MangaGenres)
                .Include(m => m.MangaThemes)
                .Include(m => m.MangaAuthors)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (manga == null) return NotFound();

            ViewBag.Genres = await _context.Genres.OrderBy(g => g.Name).ToListAsync();
            ViewBag.Themes = await _context.Themes.OrderBy(t => t.Name).ToListAsync();
            ViewBag.Authors = await _context.Authors.OrderBy(a => a.Name).ToListAsync();
            return View(manga);
        }

        [HttpPost("manga/edit/{id:int}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> MangaEdit(
            int id, string title, string alternativeTitle, string description, string coverUrl,
            MangaType type, MangaStatus status, MangaDemographic demographic, MangaFormat format,
            int? releaseYear, int[]? genreIds, int[]? themeIds, int[]? authorIds, string[]? authorRoles)
        {
            var check = RequireAdmin();
            if (check != null) return check;

            var manga = await _context.Mangas
                .Include(m => m.MangaGenres)
                .Include(m => m.MangaThemes)
                .Include(m => m.MangaAuthors)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (manga == null) return NotFound();

            manga.Title = title.Trim();
            manga.AlternativeTitle = alternativeTitle?.Trim() ?? string.Empty;
            manga.Description = description?.Trim() ?? string.Empty;
            manga.CoverUrl = coverUrl?.Trim() ?? string.Empty;
            manga.Type = type; manga.Status = status;
            manga.Demographic = demographic; manga.Format = format;
            manga.ReleaseYear = releaseYear;

            _context.MangaGenres.RemoveRange(manga.MangaGenres);
            _context.MangaThemes.RemoveRange(manga.MangaThemes);
            _context.MangaAuthors.RemoveRange(manga.MangaAuthors);
            await _context.SaveChangesAsync();

            if (genreIds != null)
                _context.MangaGenres.AddRange(genreIds.Select(gid => new MangaGenre { MangaId = id, GenreId = gid }));
            if (themeIds != null)
                _context.MangaThemes.AddRange(themeIds.Select(tid => new MangaTheme { MangaId = id, ThemeId = tid }));
            if (authorIds != null)
                for (int i = 0; i < authorIds.Length; i++)
                    _context.MangaAuthors.Add(new MangaAuthor
                    {
                        MangaId = id,
                        AuthorId = authorIds[i],
                        Role = (authorRoles != null && i < authorRoles.Length) ? authorRoles[i] : "Story & Art"
                    });

            await _context.SaveChangesAsync();
            return RedirectToAction("MangaList");
        }

        [HttpPost("manga/delete/{id:int}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> MangaDelete(int id)
        {
            var check = RequireAdmin();
            if (check != null) return check;

            var manga = await _context.Mangas.FindAsync(id);
            if (manga != null) { _context.Mangas.Remove(manga); await _context.SaveChangesAsync(); }
            return RedirectToAction("MangaList");
        }

        // ── CHAPTER ────────────────────────────────────────────────────────────

        [HttpGet("chapter/create/{mangaId:int}")]
        public async Task<IActionResult> ChapterCreate(int mangaId)
        {
            var check = RequireAdmin();
            if (check != null) return check;

            var manga = await _context.Mangas.FindAsync(mangaId);
            if (manga == null) return NotFound();
            ViewBag.Manga = manga;
            return View();
        }

        [HttpPost("chapter/create/{mangaId:int}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ChapterCreate(int mangaId, double chapterNumber, string title, string pageUrls)
        {
            var check = RequireAdmin();
            if (check != null) return check;

            var manga = await _context.Mangas.FindAsync(mangaId);
            if (manga == null) return NotFound();

            var chapter = new Chapter
            {
                MangaId = mangaId,
                ChapterNumber = chapterNumber,
                Title = string.IsNullOrWhiteSpace(title) ? $"Chương {chapterNumber}" : title.Trim(),
                UploadedAt = DateTime.UtcNow
            };
            _context.Chapters.Add(chapter);
            await _context.SaveChangesAsync();

            if (!string.IsNullOrWhiteSpace(pageUrls))
            {
                var urls = pageUrls.Split('\n', StringSplitOptions.RemoveEmptyEntries);
                var pages = urls.Select((url, idx) => new Page
                {
                    ChapterId = chapter.Id,
                    PageNumber = idx + 1,
                    ImageUrl = url.Trim()
                }).Where(p => !string.IsNullOrWhiteSpace(p.ImageUrl)).ToList();
                _context.Pages.AddRange(pages);
                await _context.SaveChangesAsync();
            }

            return RedirectToAction("Detail", "MangaView", new { id = mangaId });
        }

        // ── AUTHORS ────────────────────────────────────────────────────────────

        [HttpGet("authors")]
        public async Task<IActionResult> Authors()
        {
            var check = RequireAdmin();
            if (check != null) return check;

            var authors = await _context.Authors.OrderBy(a => a.Name).ToListAsync();
            return View(authors);
        }

        [HttpPost("author/create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AuthorCreate(string name, string biography)
        {
            var check = RequireAdmin();
            if (check != null) return check;

            if (!string.IsNullOrWhiteSpace(name))
            {
                _context.Authors.Add(new Author { Name = name.Trim(), Biography = biography?.Trim() ?? string.Empty });
                await _context.SaveChangesAsync();
            }
            return RedirectToAction("Authors");
        }

        [HttpPost("author/delete/{id:int}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AuthorDelete(int id)
        {
            var check = RequireAdmin();
            if (check != null) return check;

            var author = await _context.Authors.FindAsync(id);
            if (author != null) { _context.Authors.Remove(author); await _context.SaveChangesAsync(); }
            return RedirectToAction("Authors");
        }

        // ── GENRES ─────────────────────────────────────────────────────────────

        [HttpGet("genres")]
        public async Task<IActionResult> Genres()
        {
            var check = RequireAdmin();
            if (check != null) return check;

            var genres = await _context.Genres.OrderBy(g => g.Name).ToListAsync();
            return View(genres);
        }

        [HttpPost("genre/create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> GenreCreate(string name, string slug)
        {
            var check = RequireAdmin();
            if (check != null) return check;

            if (!string.IsNullOrWhiteSpace(name))
            {
                var s = string.IsNullOrWhiteSpace(slug) ? name.Trim().ToLower().Replace(" ", "-") : slug.Trim();
                _context.Genres.Add(new Genre { Name = name.Trim(), Slug = s });
                await _context.SaveChangesAsync();
            }
            return RedirectToAction("Genres");
        }

        [HttpPost("genre/delete/{id:int}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> GenreDelete(int id)
        {
            var check = RequireAdmin();
            if (check != null) return check;

            var genre = await _context.Genres.FindAsync(id);
            if (genre != null) { _context.Genres.Remove(genre); await _context.SaveChangesAsync(); }
            return RedirectToAction("Genres");
        }
    }
}
