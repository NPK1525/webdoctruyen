using MangaNPK.Contracts.Admin;
using MangaNPK.Filters;
using MangaNPK.Services;
using MangaNPK.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [RequireAdmin]
    public class AdminCatalogController(CatalogAdminService catalogService, MangaDbContext context) : ControllerBase
    {
        private readonly CatalogAdminService _catalogService = catalogService;
        private readonly MangaDbContext _context = context;

        [HttpPost("author")]
        public async Task<IActionResult> CreateAuthor([FromBody] CreateAuthorDto dto)
        {
            var result = await _catalogService.CreateAuthorAsync(dto, HttpContext.RequestAborted);
            return result.Entity == null ? BadRequest(new { message = result.Error }) : CreatedAtAction(nameof(CreateAuthor), new { id = result.Entity.Id }, result.Entity);
        }

        [HttpPost("genre")]
        public async Task<IActionResult> CreateGenre([FromBody] CreateGenreDto dto)
        {
            var result = await _catalogService.CreateGenreAsync(dto, HttpContext.RequestAborted);
            return result.Entity == null ? BadRequest(new { message = result.Error }) : CreatedAtAction(nameof(CreateGenre), new { id = result.Entity.Id }, result.Entity);
        }

        [HttpPut("author/{id:int}")]
        public async Task<IActionResult> UpdateAuthor(int id, [FromBody] CreateAuthorDto dto)
        {
            var author = await _context.Authors.FindAsync(id);
            if (author == null) return NotFound();
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest(new { message = "Tên tác giả không được trống." });
            author.Name = dto.Name.Trim(); author.Biography = dto.Biography?.Trim() ?? string.Empty;
            await _context.SaveChangesAsync(); return Ok(author);
        }

        [HttpDelete("author/{id:int}")]
        public async Task<IActionResult> DeleteAuthor(int id)
        {
            if (await _context.MangaAuthors.AnyAsync(x => x.AuthorId == id)) return Conflict(new { message = "Tác giả đang được sử dụng trong truyện." });
            var author = await _context.Authors.FindAsync(id); if (author == null) return NotFound();
            _context.Authors.Remove(author); await _context.SaveChangesAsync(); return NoContent();
        }

        [HttpPut("genre/{id:int}")]
        public async Task<IActionResult> UpdateGenre(int id, [FromBody] CreateGenreDto dto)
        {
            var genre = await _context.Genres.FindAsync(id); if (genre == null) return NotFound();
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest(new { message = "Tên thể loại không được trống." });
            genre.Name = dto.Name.Trim(); genre.Slug = string.IsNullOrWhiteSpace(dto.Slug) ? dto.Name.Trim().ToLowerInvariant().Replace(" ", "-") : dto.Slug.Trim();
            await _context.SaveChangesAsync(); return Ok(genre);
        }

        [HttpDelete("genre/{id:int}")]
        public async Task<IActionResult> DeleteGenre(int id)
        {
            if (await _context.MangaGenres.AnyAsync(x => x.GenreId == id)) return Conflict(new { message = "Thể loại đang được sử dụng trong truyện." });
            var genre = await _context.Genres.FindAsync(id); if (genre == null) return NotFound();
            _context.Genres.Remove(genre); await _context.SaveChangesAsync(); return NoContent();
        }

        [HttpPost("theme")]
        public async Task<IActionResult> CreateTheme([FromBody] CreateThemeDto dto)
        {
            var result = await _catalogService.CreateThemeAsync(dto, HttpContext.RequestAborted);
            return result.Entity == null ? BadRequest(new { message = result.Error }) : CreatedAtAction(nameof(CreateTheme), new { id = result.Entity.Id }, result.Entity);
        }

        [HttpPost("manga")]
        public async Task<IActionResult> CreateManga([FromBody] CreateMangaDto dto)
            => ToMangaResult(await _catalogService.CreateMangaAsync(dto, HttpContext.RequestAborted));

        [HttpPut("manga/{id}")]
        public async Task<IActionResult> UpdateManga(int id, [FromBody] CreateMangaDto dto)
            => ToMangaResult(await _catalogService.UpdateMangaAsync(id, dto, HttpContext.RequestAborted));

        [HttpDelete("manga/{id}")]
        public async Task<IActionResult> DeleteManga(int id)
            => ToMangaResult(await _catalogService.DeleteMangaAsync(id, HttpContext.RequestAborted));

        private IActionResult ToMangaResult(CatalogOperationResult result)
        {
            return result.Status switch
            {
                CatalogOperationStatus.NotFound => NotFound(new { message = result.Message }),
                CatalogOperationStatus.BadRequest => BadRequest(new { message = result.Message }),
                CatalogOperationStatus.ServerError => StatusCode(500, new { message = result.Message, error = result.Error }),
                _ when result.Message == "Manga created successfully" => Ok(new { message = result.Message, mangaId = result.EntityId }),
                _ => Ok(new { message = result.Message })
            };
        }
    }
}
