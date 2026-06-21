using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController(MangaDbContext context) : ControllerBase
    {
        private readonly MangaDbContext _context = context;

        // POST: api/admin/author
        [HttpPost("author")]
        public async Task<IActionResult> CreateAuthor([FromBody] CreateAuthorDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Author name is required" });

            var author = new Author
            {
                Name = dto.Name.Trim(),
                Biography = dto.Biography?.Trim() ?? string.Empty
            };

            _context.Authors.Add(author);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(CreateAuthor), new { id = author.Id }, author);
        }

        // POST: api/admin/genre
        [HttpPost("genre")]
        public async Task<IActionResult> CreateGenre([FromBody] CreateGenreDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Genre name is required" });

            var slug = string.IsNullOrWhiteSpace(dto.Slug)
                ? dto.Name.Trim().ToLower().Replace(" ", "-")
                : dto.Slug.Trim().ToLower();

            var genre = new Genre
            {
                Name = dto.Name.Trim(),
                Slug = slug
            };

            _context.Genres.Add(genre);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(CreateGenre), new { id = genre.Id }, genre);
        }

        // POST: api/admin/theme
        [HttpPost("theme")]
        public async Task<IActionResult> CreateTheme([FromBody] CreateThemeDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Theme name is required" });

            var slug = string.IsNullOrWhiteSpace(dto.Slug)
                ? dto.Name.Trim().ToLower().Replace(" ", "-")
                : dto.Slug.Trim().ToLower();

            var theme = new Theme
            {
                Name = dto.Name.Trim(),
                Slug = slug
            };

            _context.Themes.Add(theme);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(CreateTheme), new { id = theme.Id }, theme);
        }

        // POST: api/admin/manga
        [HttpPost("manga")]
        public async Task<IActionResult> CreateManga([FromBody] CreateMangaDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(new { message = "Manga title is required" });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var manga = new Manga
                {
                    Title = dto.Title.Trim(),
                    AlternativeTitle = dto.AlternativeTitle?.Trim() ?? string.Empty,
                    Description = dto.Description?.Trim() ?? string.Empty,
                    CoverUrl = dto.CoverUrl?.Trim() ?? string.Empty,
                    Type = dto.Type,
                    Status = dto.Status,
                    Demographic = dto.Demographic,
                    Format = dto.Format,
                    ReleaseYear = dto.ReleaseYear,
                    CreatedAt = System.DateTime.UtcNow
                };

                _context.Mangas.Add(manga);
                await _context.SaveChangesAsync(); // Generates manga.Id

                // Associate Authors
                if (dto.Authors != null && dto.Authors.Count > 0)
                {
                    var mangaAuthors = dto.Authors.Select(a => new MangaAuthor
                    {
                        MangaId = manga.Id,
                        AuthorId = a.AuthorId,
                        Role = string.IsNullOrWhiteSpace(a.Role) ? "Story & Art" : a.Role.Trim()
                    }).ToList();
                    _context.MangaAuthors.AddRange(mangaAuthors);
                }

                // Associate Genres
                if (dto.GenreIds != null && dto.GenreIds.Count > 0)
                {
                    var mangaGenres = dto.GenreIds.Select(gid => new MangaGenre
                    {
                        MangaId = manga.Id,
                        GenreId = gid
                    }).ToList();
                    _context.MangaGenres.AddRange(mangaGenres);
                }

                // Associate Themes
                if (dto.ThemeIds != null && dto.ThemeIds.Count > 0)
                {
                    var mangaThemes = dto.ThemeIds.Select(tid => new MangaTheme
                    {
                        MangaId = manga.Id,
                        ThemeId = tid
                    }).ToList();
                    _context.MangaThemes.AddRange(mangaThemes);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Manga created successfully", mangaId = manga.Id });
            }
            catch (System.Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Error creating manga", error = ex.Message });
            }
        }

        // PUT: api/admin/manga/{id}
        [HttpPut("manga/{id}")]
        public async Task<IActionResult> UpdateManga(int id, [FromBody] CreateMangaDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(new { message = "Manga title is required" });

            var manga = await _context.Mangas
                .Include(m => m.MangaAuthors)
                .Include(m => m.MangaGenres)
                .Include(m => m.MangaThemes)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (manga == null)
                return NotFound(new { message = "Manga not found" });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                manga.Title = dto.Title.Trim();
                manga.AlternativeTitle = dto.AlternativeTitle?.Trim() ?? string.Empty;
                manga.Description = dto.Description?.Trim() ?? string.Empty;
                manga.CoverUrl = dto.CoverUrl?.Trim() ?? string.Empty;
                manga.Type = dto.Type;
                manga.Status = dto.Status;
                manga.Demographic = dto.Demographic;
                manga.Format = dto.Format;
                manga.ReleaseYear = dto.ReleaseYear;

                // Remove existing authors
                _context.MangaAuthors.RemoveRange(manga.MangaAuthors);

                // Associate new Authors
                if (dto.Authors != null && dto.Authors.Count > 0)
                {
                    var mangaAuthors = dto.Authors.Select(a => new MangaAuthor
                    {
                        MangaId = manga.Id,
                        AuthorId = a.AuthorId,
                        Role = string.IsNullOrWhiteSpace(a.Role) ? "Story & Art" : a.Role.Trim()
                    }).ToList();
                    _context.MangaAuthors.AddRange(mangaAuthors);
                }

                // Remove existing genres
                _context.MangaGenres.RemoveRange(manga.MangaGenres);

                // Associate new Genres
                if (dto.GenreIds != null && dto.GenreIds.Count > 0)
                {
                    var mangaGenres = dto.GenreIds.Select(gid => new MangaGenre
                    {
                        MangaId = manga.Id,
                        GenreId = gid
                    }).ToList();
                    _context.MangaGenres.AddRange(mangaGenres);
                }

                // Remove existing themes
                _context.MangaThemes.RemoveRange(manga.MangaThemes);

                // Associate new Themes
                if (dto.ThemeIds != null && dto.ThemeIds.Count > 0)
                {
                    var mangaThemes = dto.ThemeIds.Select(tid => new MangaTheme
                    {
                        MangaId = manga.Id,
                        ThemeId = tid
                    }).ToList();
                    _context.MangaThemes.AddRange(mangaThemes);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Manga updated successfully" });
            }
            catch (System.Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Error updating manga", error = ex.Message });
            }
        }

        // POST: api/admin/chapter
        [HttpPost("chapter")]
        public async Task<IActionResult> CreateChapter([FromBody] CreateChapterDto dto)
        {
            var manga = await _context.Mangas.FindAsync(dto.MangaId);
            if (manga == null)
                return BadRequest(new { message = "Manga not found" });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var chapter = new Chapter
                {
                    MangaId = dto.MangaId,
                    ChapterNumber = dto.ChapterNumber,
                    Title = dto.Title?.Trim() ?? $"Chương {dto.ChapterNumber}",
                    UploadedAt = System.DateTime.UtcNow
                };

                _context.Chapters.Add(chapter);
                await _context.SaveChangesAsync(); // Generates chapter.Id

                if (dto.PageUrls != null && dto.PageUrls.Count > 0)
                {
                    var pages = dto.PageUrls
                        .Select((url, idx) => new Page
                        {
                            ChapterId = chapter.Id,
                            PageNumber = idx + 1,
                            ImageUrl = url.Trim()
                        })
                        .Where(p => !string.IsNullOrWhiteSpace(p.ImageUrl))
                        .ToList();

                    _context.Pages.AddRange(pages);
                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();
                return Ok(new { message = "Chapter created successfully", chapterId = chapter.Id });
            }
            catch (System.Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Error creating chapter", error = ex.Message });
            }
        }

        // DELETE: api/admin/manga/{id}
        [HttpDelete("manga/{id}")]
        public async Task<IActionResult> DeleteManga(int id)
        {
            var manga = await _context.Mangas.FindAsync(id);
            if (manga == null)
                return NotFound(new { message = "Manga not found" });

            _context.Mangas.Remove(manga);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Manga deleted successfully" });
        }
    }

    // DTO Classes
    public class CreateAuthorDto
    {
        public string Name { get; set; } = string.Empty;
        public string Biography { get; set; } = string.Empty;
    }

    public class CreateGenreDto
    {
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
    }

    public class CreateThemeDto
    {
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
    }

    public class CreateMangaDto
    {
        public string Title { get; set; } = string.Empty;
        public string AlternativeTitle { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string CoverUrl { get; set; } = string.Empty;
        public MangaType Type { get; set; }
        public MangaStatus Status { get; set; }
        public MangaDemographic Demographic { get; set; }
        public MangaFormat Format { get; set; }
        public int? ReleaseYear { get; set; }
        public List<MangaAuthorDto> Authors { get; set; } = [];
        public List<int> GenreIds { get; set; } = [];
        public List<int> ThemeIds { get; set; } = [];
    }

    public class MangaAuthorDto
    {
        public int AuthorId { get; set; }
        public string Role { get; set; } = "Story & Art";
    }

    public class CreateChapterDto
    {
        public int MangaId { get; set; }
        public double ChapterNumber { get; set; }
        public string Title { get; set; } = string.Empty;
        public List<string> PageUrls { get; set; } = [];
    }
}
