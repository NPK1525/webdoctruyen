using MangaNPK.Data;
using MangaNPK.Filters;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers
{
    [Route("admin")]
    [RequireAdmin]
    public class AdminViewController(
        MangaDbContext context,
        IWebHostEnvironment environment,
        ILogger<AdminViewController> logger) : Controller
    {
        private readonly MangaDbContext _context = context;
        private readonly IWebHostEnvironment _environment = environment;
        private readonly ILogger<AdminViewController> _logger = logger;

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

        // ── MANGA ──────────────────────────────────────────────────────────────

        [HttpGet("manga")]
        public async Task<IActionResult> MangaList()
        {
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
            var manga = await _context.Mangas.FindAsync(id);
            if (manga != null) { _context.Mangas.Remove(manga); await _context.SaveChangesAsync(); }
            return RedirectToAction("MangaList");
        }

        // ── CHAPTER ────────────────────────────────────────────────────────────

        [HttpGet("chapter/create/{mangaId:int}")]
        public async Task<IActionResult> ChapterCreate(int mangaId)
        {
            var manga = await _context.Mangas.FindAsync(mangaId);
            if (manga == null) return NotFound();
            ViewBag.Manga = manga;
            return View();
        }

        [HttpPost("chapter/create/{mangaId:int}")]
        [ValidateAntiForgeryToken]
        [RequestSizeLimit(500L * 1024 * 1024)]
        public async Task<IActionResult> ChapterCreate(
            int mangaId,
            double chapterNumber,
            string? title,
            string? pageUrls,
            List<IFormFile>? pageFiles)
        {
            var manga = await _context.Mangas.FindAsync(mangaId);
            if (manga == null) return NotFound();

            pageFiles ??= [];
            ViewBag.Manga = manga;
            ViewBag.ChapterNumber = chapterNumber;
            ViewBag.ChapterTitle = title;
            ViewBag.PageUrls = pageUrls;

            if (chapterNumber < 0)
                return ChapterCreateError("Số chapter không được nhỏ hơn 0.");

            var duplicateExists = await _context.Chapters.AnyAsync(c =>
                c.MangaId == mangaId
                && c.ChapterNumber == chapterNumber
                && c.Source == "Local");
            if (duplicateExists)
                return ChapterCreateError($"Chapter {chapterNumber} đã tồn tại trong truyện này.");

            var imageError = await ChapterImageValidator.ValidateAsync(pageFiles, HttpContext.RequestAborted);
            if (imageError != null)
                return ChapterCreateError(imageError);

            var parsedUrls = ChapterUploadValidator.ParsePageUrls(pageUrls);
            if (parsedUrls.Error != null)
                return ChapterCreateError(parsedUrls.Error);

            var pagesError = ChapterUploadValidator.ValidateHasPages(pageFiles.Count, parsedUrls.Urls.Count);
            if (pagesError != null)
                return ChapterCreateError(pagesError);

            await using var transaction = await _context.Database.BeginTransactionAsync(HttpContext.RequestAborted);
            string? chapterDirectory = null;

            try
            {
                var chapter = new Chapter
                {
                    MangaId = mangaId,
                    ChapterNumber = chapterNumber,
                    Title = string.IsNullOrWhiteSpace(title) ? $"Chương {chapterNumber}" : title.Trim(),
                    UploadedAt = DateTime.UtcNow,
                    Source = "Local"
                };
                _context.Chapters.Add(chapter);
                await _context.SaveChangesAsync(HttpContext.RequestAborted);

                chapterDirectory = Path.Combine(
                    _environment.WebRootPath,
                    "uploads",
                    "manga",
                    mangaId.ToString(),
                    "chapters",
                    chapter.Id.ToString());
                Directory.CreateDirectory(chapterDirectory);

                var pages = new List<Page>();
                var pageNumber = 1;
                foreach (var file in pageFiles)
                {
                    var fileName = $"{pageNumber:0000}{ChapterImageValidator.GetSafeExtension(file.FileName)}";
                    var filePath = Path.Combine(chapterDirectory, fileName);
                    await using (var stream = new FileStream(filePath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                    {
                        await file.CopyToAsync(stream, HttpContext.RequestAborted);
                    }

                    pages.Add(new Page
                    {
                        ChapterId = chapter.Id,
                        PageNumber = pageNumber++,
                        ImageUrl = $"/uploads/manga/{mangaId}/chapters/{chapter.Id}/{fileName}"
                    });
                }

                foreach (var url in parsedUrls.Urls)
                {
                    pages.Add(new Page
                    {
                        ChapterId = chapter.Id,
                        PageNumber = pageNumber++,
                        ImageUrl = url
                    });
                }

                _context.Pages.AddRange(pages);
                await _context.SaveChangesAsync(HttpContext.RequestAborted);
                await transaction.CommitAsync(HttpContext.RequestAborted);

                return RedirectToAction("Detail", "MangaView", new { id = mangaId });
            }
            catch (Exception exception)
            {
                await ChapterUploadCleanup.TryCleanupAsync(
                    () => transaction.RollbackAsync(),
                    () =>
                    {
                        if (chapterDirectory != null && Directory.Exists(chapterDirectory))
                            Directory.Delete(chapterDirectory, recursive: true);
                    },
                    cleanupException => _logger.LogWarning(
                        cleanupException,
                        "Không thể hoàn tất cleanup cho chapter {ChapterDirectory}",
                        chapterDirectory));

                _logger.LogError(exception, "Không thể upload chapter {ChapterNumber} cho manga {MangaId}", chapterNumber, mangaId);
                return ChapterCreateError("Không thể tải chapter lên. Vui lòng thử lại.");
            }

            ViewResult ChapterCreateError(string message)
            {
                ViewBag.Error = message;
                return View("ChapterCreate");
            }
        }

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
