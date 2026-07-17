using System.Text.Json;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;

namespace MangaNPK.Controllers;

[Route("follow-updates")]
public sealed class FollowedUpdatesViewController(IFollowedUpdatesService updatesService) : Controller
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly IFollowedUpdatesService _updatesService = updatesService;

    [HttpGet("")]
    public async Task<IActionResult> Index()
    {
        var userId = HttpContext.Session.GetInt32("UserId");
        ViewBag.IsAuthenticated = userId.HasValue;

        IReadOnlyList<FollowedUpdateItem> updates = userId.HasValue
            ? await _updatesService.GetAsync(userId.Value, 100, HttpContext.RequestAborted)
            : [];

        ViewBag.UpdatesJson = JsonSerializer.Serialize(updates, JsonOptions);
        return View();
    }
}
