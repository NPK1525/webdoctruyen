using MangaNPK.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers
{
    [Route("recently-added")]
    public class RecentlyAddedViewController(MangaDbContext context) : Controller
    {
        private readonly MangaDbContext _context = context;

        [HttpGet("")]
        public async Task<IActionResult> Index()
        {
            // Lấy các bộ truyện mới được thêm vào hệ thống, khác với Latest Updates là cập nhật chương mới.
            var mangas = await _context.Mangas
                .AsNoTracking()
                .Include(m => m.MangaGenres)
                    .ThenInclude(mg => mg.Genre)
                .Include(m => m.MangaThemes)
                    .ThenInclude(mt => mt.Theme)
                .OrderByDescending(m => m.CreatedAt)
                .Take(120)
                .Select(m => new
                {
                    id = m.Id,
                    title = m.Title,
                    description = m.Description,
                    coverUrl = m.CoverUrl,
                    status = m.Status,
                    viewCount = m.ViewCount,
                    createdAt = m.CreatedAt,
                    genres = m.MangaGenres.Select(mg => mg.Genre.Name).ToList(),
                    themes = m.MangaThemes.Select(mt => mt.Theme.Name).ToList(),
                    ratingAverage = _context.Ratings
                        .Where(rating => rating.MangaId == m.Id)
                        .Select(rating => (double?)rating.Score)
                        .Average() ?? 0,
                    commentCount = _context.Comments.Count(comment => comment.MangaId == m.Id),
                    followCount = _context.UserMangaLibraries.Count(library => library.MangaId == m.Id)
                })
                .ToListAsync();

            ViewBag.RecentlyAddedJson = System.Text.Json.JsonSerializer.Serialize(mangas);
            return View();
        }
    }
}
