using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using MangaNPK.Data;

namespace MangaNPK.Filters
{
    /// <summary>
    /// Enforces admin access.
    /// - API controllers (ControllerBase): returns HTTP 401/403 JSON.
    /// - MVC controllers (Controller/ViewResult): redirects to login page.
    /// </summary>
    public class RequireAdminAttribute : Attribute, IAuthorizationFilter
    {
        public void OnAuthorization(AuthorizationFilterContext context)
        {
            var role = context.HttpContext.Session.GetString("Role");
            var userId = context.HttpContext.Session.GetInt32("UserId");

            // Determine if this is an MVC (View) controller request by checking
            // whether the action descriptor comes from a Controller (not ControllerBase)
            var descriptor = context.ActionDescriptor as Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor;
            var isMvcRequest = descriptor != null
                && typeof(Microsoft.AspNetCore.Mvc.Controller).IsAssignableFrom(descriptor.ControllerTypeInfo);

            if (userId == null)
            {
                if (isMvcRequest)
                    context.Result = new RedirectToActionResult("Login", "Account",
                        new { returnUrl = context.HttpContext.Request.Path });
                else
                    context.Result = new UnauthorizedObjectResult(new { message = "Cần đăng nhập để sử dụng tính năng này." });
                return;
            }

            if (role != "Admin" && IsContributorChapterRequest(context, descriptor, userId.Value))
                return;

            if (role != "Admin")
            {
                if (isMvcRequest)
                    context.Result = new RedirectToActionResult("Index", "Home", null);
                else
                    context.Result = new ObjectResult(new { message = "Yêu cầu quyền quản trị viên." })
                    {
                        StatusCode = 403
                    };
            }
        }

        private static bool IsContributorChapterRequest(
            AuthorizationFilterContext context,
            Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor? descriptor,
            int userId)
        {
            if (descriptor == null || !string.Equals(context.HttpContext.Session.GetString("Role"), "User", StringComparison.OrdinalIgnoreCase))
                return false;

            var actionName = descriptor.ActionName;
            var isChapterAction = string.Equals(actionName, "ChapterCreate", StringComparison.Ordinal)
                || string.Equals(actionName, "GetChapterForEditing", StringComparison.Ordinal)
                || string.Equals(actionName, "UpdateChapter", StringComparison.Ordinal);
            if (!isChapterAction) return false;

            var mangaId = context.RouteData.Values.TryGetValue("mangaId", out var routeMangaId)
                && int.TryParse(routeMangaId?.ToString(), out var parsedMangaId)
                ? parsedMangaId
                : (int?)null;

            if (!mangaId.HasValue && context.RouteData.Values.TryGetValue("id", out var routeId)
                && int.TryParse(routeId?.ToString(), out var chapterId))
            {
                var db = context.HttpContext.RequestServices.GetRequiredService<MangaDbContext>();
                mangaId = db.Chapters.Where(chapter => chapter.Id == chapterId)
                    .Select(chapter => (int?)chapter.MangaId)
                    .FirstOrDefault();
            }

            if (!mangaId.HasValue) return false;
            var contextDb = context.HttpContext.RequestServices.GetRequiredService<MangaDbContext>();
            return contextDb.MangaContributors.Any(contributor =>
                contributor.UserId == userId && contributor.MangaId == mangaId.Value);
        }
    }
}
