using MangaNPK.Controllers;
using MangaNPK.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public class AdminTitleReviewRouteTests
{
    [Fact]
    public void LegacyTitleDrafts_RedirectsToIntegratedReviewTab()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var context = new MangaDbContext(options);
        var result = new AdminViewController(context).TitleDrafts();

        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.Equal("/admin?tab=title-review", redirect.Url);
    }
}
