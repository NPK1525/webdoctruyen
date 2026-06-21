using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MangaController(MangaDbContext context) : ControllerBase
    {
        private readonly MangaDbContext _context = context;

        // GET: api/manga
        [HttpGet]
        public async Task<IActionResult> GetMangas(
            [FromQuery] MangaType? type = null,
            [FromQuery] int? genreId = null,
            [FromQuery] MangaDemographic? demographic = null,
            [FromQuery] MangaFormat? format = null,
            [FromQuery] int? themeId = null,
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12)
        {
            var query = _context.Mangas
                .Include(m => m.MangaGenres).ThenInclude(mg => mg.Genre)
                .Include(m => m.MangaAuthors).ThenInclude(ma => ma.Author)
                .Include(m => m.MangaThemes).ThenInclude(mt => mt.Theme)
                .Include(m => m.Chapters)
                .AsQueryable();

            if (type.HasValue)
            {
                query = query.Where(m => m.Type == type.Value);
            }

            if (genreId.HasValue)
            {
                query = query.Where(m => m.MangaGenres.Any(mg => mg.GenreId == genreId.Value));
            }

            if (demographic.HasValue)
            {
                query = query.Where(m => m.Demographic == demographic.Value);
            }

            if (format.HasValue)
            {
                query = query.Where(m => m.Format == format.Value);
            }

            if (themeId.HasValue)
            {
                query = query.Where(m => m.MangaThemes.Any(mt => mt.ThemeId == themeId.Value));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var cleanSearch = search.Trim();
                query = query.Where(m => m.Title.Contains(cleanSearch, StringComparison.OrdinalIgnoreCase) || 
                                         m.AlternativeTitle.Contains(cleanSearch, StringComparison.OrdinalIgnoreCase));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(m => m.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(m => new {
                    m.Id,
                    m.Title,
                    m.AlternativeTitle,
                    m.Description,
                    m.CoverUrl,
                    m.Type,
                    m.Status,
                    m.Demographic,
                    m.Format,
                    m.ReleaseYear,
                    Genres = m.MangaGenres.Select(mg => mg.Genre.Name).ToList(),
                    Themes = m.MangaThemes.Select(mt => mt.Theme.Name).ToList(),
                    Authors = m.MangaAuthors.Select(ma => new { ma.Author.Name, ma.Role }).ToList(),
                    LatestChapters = m.Chapters
                        .OrderByDescending(c => c.ChapterNumber)
                        .Take(2)
                        .Select(c => new { c.Id, c.ChapterNumber, c.Title, c.UploadedAt })
                        .ToList()
                })
                .ToListAsync();

            return Ok(new { totalCount, items, page, pageSize });
        }

        // GET: api/manga/featured
        [HttpGet("featured")]
        public async Task<IActionResult> GetFeatured()
        {
            var featured = await _context.Mangas
                .Include(m => m.MangaGenres).ThenInclude(mg => mg.Genre)
                .Include(m => m.MangaAuthors).ThenInclude(ma => ma.Author)
                .Include(m => m.MangaThemes).ThenInclude(mt => mt.Theme)
                .OrderByDescending(m => m.CreatedAt)
                .Take(4)
                .Select(m => new {
                    m.Id,
                    m.Title,
                    m.AlternativeTitle,
                    m.Description,
                    m.CoverUrl,
                    m.Type,
                    m.Status,
                    m.Demographic,
                    m.Format,
                    Genres = m.MangaGenres.Select(mg => mg.Genre.Name).ToList(),
                    Themes = m.MangaThemes.Select(mt => mt.Theme.Name).ToList(),
                    Authors = m.MangaAuthors.Select(ma => new { ma.Author.Name, ma.Role }).ToList()
                })
                .ToListAsync();

            return Ok(featured);
        }

        // GET: api/manga/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetMangaDetail(int id)
        {
            var manga = await _context.Mangas
                .Include(m => m.MangaGenres).ThenInclude(mg => mg.Genre)
                .Include(m => m.MangaAuthors).ThenInclude(ma => ma.Author)
                .Include(m => m.MangaThemes).ThenInclude(mt => mt.Theme)
                .Include(m => m.Chapters)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (manga == null)
            {
                return NotFound(new { message = "Manga not found" });
            }

            var result = new
            {
                manga.Id,
                manga.Title,
                manga.AlternativeTitle,
                manga.Description,
                manga.CoverUrl,
                manga.Type,
                manga.Status,
                manga.Demographic,
                manga.Format,
                manga.ReleaseYear,
                manga.CreatedAt,
                Genres = manga.MangaGenres.Select(mg => new { mg.Genre.Id, mg.Genre.Name }).ToList(),
                Themes = manga.MangaThemes.Select(mt => new { mt.Theme.Id, mt.Theme.Name }).ToList(),
                Authors = manga.MangaAuthors.Select(ma => new { ma.Author.Id, ma.Author.Name, ma.Role }).ToList(),
                Chapters = manga.Chapters
                    .OrderByDescending(c => c.ChapterNumber)
                    .Select(c => new { c.Id, c.ChapterNumber, c.Title, c.UploadedAt })
                    .ToList()
            };

            return Ok(result);
        }

        // GET: api/manga/{id}/recommendations
        [HttpGet("{id}/recommendations")]
        public async Task<IActionResult> GetRecommendations(int id, [FromQuery] int limit = 6)
        {
            var manga = await _context.Mangas
                .Include(m => m.MangaGenres)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (manga == null)
            {
                return NotFound(new { message = "Manga not found" });
            }

            var genreIds = manga.MangaGenres.Select(mg => mg.GenreId).ToList();

            if (genreIds.Count == 0)
            {
                var fallback = await _context.Mangas
                    .Where(m => m.Id != id)
                    .OrderByDescending(m => m.CreatedAt)
                    .Take(limit)
                    .Select(m => new {
                        m.Id,
                        m.Title,
                        m.AlternativeTitle,
                        m.CoverUrl,
                        m.Type,
                        m.Status,
                        m.ReleaseYear
                    })
                    .ToListAsync();
                return Ok(fallback);
            }

            var recommendations = await _context.Mangas
                .Include(m => m.MangaGenres)
                .Where(m => m.Id != id)
                .Select(m => new {
                    Manga = new {
                        m.Id,
                        m.Title,
                        m.AlternativeTitle,
                        m.CoverUrl,
                        m.Type,
                        m.Status,
                        m.ReleaseYear
                    },
                    SharedCount = m.MangaGenres.Count(mg => genreIds.Contains(mg.GenreId))
                })
                .Where(x => x.SharedCount > 0)
                .OrderByDescending(x => x.SharedCount)
                .ThenByDescending(x => x.Manga.Id)
                .Take(limit)
                .Select(x => x.Manga)
                .ToListAsync();

            return Ok(recommendations);
        }
    }
}
