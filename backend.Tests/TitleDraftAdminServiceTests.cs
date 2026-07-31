using MangaNPK.Data;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public class TitleDraftAdminServiceTests
{
    private static MangaDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new MangaDbContext(options);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task RejectAsync_RejectsBlankReason(string reason)
    {
        await using var context = CreateContext();
        context.TitleDrafts.Add(new TitleDraft
        {
            Id = 1,
            Title = "Pending title",
            Description = "Description",
            CreatedByUserId = 1,
            ReviewStatus = TitleDraftReviewStatus.Pending
        });
        await context.SaveChangesAsync();

        var result = await new TitleDraftAdminService(
            context,
            new TitleDraftMangaCreator()).RejectAsync(1, reason, 2);

        Assert.Equal(TitleDraftAdminStatus.BadRequest, result.Status);
        Assert.Equal(TitleDraftReviewStatus.Pending, context.TitleDrafts.Single().ReviewStatus);
    }

    [Fact]
    public async Task RejectAsync_TrimsAndStoresReason()
    {
        await using var context = CreateContext();
        context.TitleDrafts.Add(new TitleDraft
        {
            Id = 1,
            Title = "Pending title",
            Description = "Description",
            CreatedByUserId = 1,
            ReviewStatus = TitleDraftReviewStatus.Pending
        });
        await context.SaveChangesAsync();

        var result = await new TitleDraftAdminService(
            context,
            new TitleDraftMangaCreator()).RejectAsync(1, "  Missing cover  ", 2);

        Assert.Equal(TitleDraftAdminStatus.Success, result.Status);
        Assert.Equal("Missing cover", context.TitleDrafts.Single().RejectionReason);
    }
}
