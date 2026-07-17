using MangaNPK.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers
{
    [Route("updates")]
    public class UpdatesViewController(MangaDbContext context) : Controller
    {
        private readonly MangaDbContext _context = context;

        [HttpGet("")]
        public async Task<IActionResult> Index()
        {
            // Lấy các chương mới đăng của tất cả bộ truyện, dùng cho trang Latest Updates.
            // Trang này không phải truyện mới thêm; nó theo thời gian UploadedAt của Chapter.
            var chapters = await _context.Chapters
                .AsNoTracking()
                .Include(c => c.Manga)
                    .ThenInclude(m => m.MangaAuthors)
                    .ThenInclude(ma => ma.Author)
                .Include(c => c.Manga)
                    .ThenInclude(m => m.MangaGenres)
                    .ThenInclude(mg => mg.Genre)
                .OrderByDescending(c => c.UploadedAt)
                .Take(120)
                .Select(c => new
                {
                    mangaId = c.MangaId,
                    mangaTitle = c.Manga.Title,
                    coverUrl = c.Manga.CoverUrl,
                    viewCount = c.Manga.ViewCount,
                    genres = c.Manga.MangaGenres.Select(mg => mg.Genre.Name).ToList(),
                    authors = c.Manga.MangaAuthors.Select(ma => ma.Author.Name).ToList(),
                    chapterId = c.Id,
                    chapterNumber = c.ChapterNumber,
                    chapterTitle = c.Title,
                    uploadedAt = c.UploadedAt,
                    commentCount = _context.Comments.Count(comment => comment.ChapterId == c.Id)
                })
                .ToListAsync();

            ViewBag.UpdatesJson = System.Text.Json.JsonSerializer.Serialize(chapters);
            return View();
        }
    }
}
