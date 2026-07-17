using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace MangaNPK.Filters
{
    public class RequireAuthAttribute : Attribute, IAuthorizationFilter
    {
        public void OnAuthorization(AuthorizationFilterContext context)
        {
            if (context.HttpContext.Session.GetInt32("UserId") == null)
            {
                context.Result = new UnauthorizedObjectResult(new { message = "Cần đăng nhập để sử dụng tính năng này." });
            }
        }
    }
}
