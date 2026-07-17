using MangaNPK.Contracts.Admin;
using MangaNPK.Filters;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [RequireAdmin]
    public class AdminMangaDexController(MangaDexImportService importService) : ControllerBase
    {
        private readonly MangaDexImportService _importService = importService;

        [HttpPost("mangadex/preview")]
        public async Task<IActionResult> PreviewMangaDex([FromBody] MangaDexImportRequest dto)
        {
            var result = await _importService.PreviewAsync(dto.Input, HttpContext.RequestAborted);
            if (result.Status != MangaDexImportStatus.Success) return ToError(result.Status, result.Message, result.Error);
            var preview = result.Preview!;
            return Ok(new { preview.Id, preview.Title, preview.AlternativeTitle, preview.Description, preview.CoverUrl,
                preview.Type, preview.Status, preview.Demographic, preview.Format, preview.ReleaseYear, preview.Authors,
                preview.Tags, result.ChapterCount, Language = "vi", result.Exists });
        }

        [HttpPost("mangadex/import")]
        public async Task<IActionResult> ImportMangaDex([FromBody] MangaDexImportRequest dto)
        {
            var result = await _importService.ImportAsync(dto.Input, HttpContext.RequestAborted);
            return result.Status == MangaDexImportStatus.Success
                ? Ok(new { message = result.Message, mangaId = result.MangaId, chapterCount = result.ChapterCount })
                : ToError(result.Status, result.Message, result.Error);
        }

        private IActionResult ToError(MangaDexImportStatus status, string message, string? error) => status switch
        {
            MangaDexImportStatus.BadRequest => BadRequest(new { message }),
            MangaDexImportStatus.BadGateway => StatusCode(502, new { message, error }),
            _ => StatusCode(500, new { message, error })
        };
    }
}
