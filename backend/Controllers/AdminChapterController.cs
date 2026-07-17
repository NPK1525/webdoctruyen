using MangaNPK.Contracts.Admin;
using MangaNPK.Filters;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [RequireAdmin]
    public class AdminChapterController(ChapterAdminService chapterService) : ControllerBase
    {
        private readonly ChapterAdminService _chapterService = chapterService;

        [HttpGet("manga/{mangaId:int}/chapters")]
        public async Task<IActionResult> GetChapterPage(int mangaId, [FromQuery] string? search = "",
            [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var result = await _chapterService.GetPageAsync(mangaId, search, page, pageSize, HttpContext.RequestAborted);
            return result == null
                ? NotFound(new { message = "Không tìm thấy truyện." })
                : Ok(result);
        }

        [HttpGet("chapter/{id:int}")]
        public async Task<IActionResult> GetChapterForEditing(int id)
        {
            var chapter = await _chapterService.GetForEditingAsync(id, HttpContext.RequestAborted);
            if (chapter == null) return NotFound(new { message = "Không tìm thấy chapter." });
            return Ok(new { chapter.Id, chapter.MangaId, chapter.Source, chapter.ChapterNumber, chapter.Title,
                Pages = chapter.Pages.Select(page => new { page.Id, page.PageNumber, page.ImageUrl }) });
        }

        [HttpPut("chapter/{id:int}")]
        public async Task<IActionResult> UpdateChapter(int id, [FromBody] UpdateChapterDto dto)
            => ToActionResult(await _chapterService.UpdateAsync(id, dto, HttpContext.RequestAborted));

        [HttpPost("chapter")]
        public async Task<IActionResult> CreateChapter([FromBody] CreateChapterDto dto)
            => ToActionResult(await _chapterService.CreateAsync(dto, HttpContext.RequestAborted));

        private IActionResult ToActionResult(ChapterOperationResult result)
        {
            return result.Status switch
            {
                ChapterOperationStatus.NotFound => NotFound(new { message = result.Message }),
                ChapterOperationStatus.BadRequest => BadRequest(new { message = result.Message }),
                ChapterOperationStatus.Conflict => Conflict(new { message = result.Message }),
                ChapterOperationStatus.ServerError => StatusCode(500, new { message = result.Message, error = result.Error }),
                _ when result.ChapterId.HasValue && result.Message == "Chapter created successfully"
                    => Ok(new { message = result.Message, chapterId = result.ChapterId.Value }),
                _ => Ok(new { message = result.Message })
            };
        }
    }
}
