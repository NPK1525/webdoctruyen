using MangaNPK.Data;
using MangaNPK.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public class FollowedUpdatesServiceTests
{
    [Fact]
    public void BuildQuery_FiltersByCurrentUsersLibraryWithoutFilteringReadingStatus()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseSqlServer("Server=(local);Database=MangaNPK_Query_Test;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;
        using var context = new MangaDbContext(options);

        var sql = FollowedUpdatesService.BuildQuery(context, userId: 27, limit: 100).ToQueryString();

        Assert.Contains("UserMangaLibraries", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("UserId", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("ORDER BY", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("UploadedAt", sql, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("ReadingStatus", sql, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("[Status]", sql, StringComparison.OrdinalIgnoreCase);
    }
}
