using MangaNPK.Contracts.Admin;
using MangaNPK.Filters;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [RequireAdmin]
    public class AdminCatalogController(CatalogAdminService catalogService) : ControllerBase
    {
        private readonly CatalogAdminService _catalogService = catalogService;

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
