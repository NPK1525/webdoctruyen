using MangaNPK.Data;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public sealed class UpdateReportStatusCommandHandlerTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Pending")]
    [InlineData("Unknown")]
    public async Task InvalidStatus_ReturnsBadRequest_WithoutChangingReport(string? status)
    {
        await using var context = CreateContext();
        var report = CreateReport();
        context.Reports.Add(report);
        await context.SaveChangesAsync();
        var handler = CreateHandler(context);

        var result = await handler.ExecuteAsync(
            new UpdateReportStatusCommand(report.Id, status, "note", 2));

        Assert.Equal(ReportCommandStatus.BadRequest, result.Status);
        Assert.Equal(ReportStatus.Pending, report.Status);
        Assert.Null(report.ResolvedAt);
        Assert.Null(report.ResolvedByUserId);
    }

    [Fact]
    public async Task MissingReport_ReturnsNotFound()
    {
        await using var context = CreateContext();
        var handler = CreateHandler(context);

        var result = await handler.ExecuteAsync(
            new UpdateReportStatusCommand(404, "Resolved", null, 2));

        Assert.Equal(ReportCommandStatus.NotFound, result.Status);
    }

    [Theory]
    [InlineData("Resolved", ReportStatus.Resolved)]
    [InlineData("Dismissed", ReportStatus.Dismissed)]
    public async Task ValidStatus_PersistsResolution(
        string input,
        ReportStatus expectedStatus)
    {
        await using var context = CreateContext();
        var report = CreateReport();
        context.Reports.Add(report);
        await context.SaveChangesAsync();
        var handler = CreateHandler(context);

        var result = await handler.ExecuteAsync(
            new UpdateReportStatusCommand(report.Id, input, "  reviewed  ", 9));

        Assert.Equal(ReportCommandStatus.Success, result.Status);
        Assert.Equal(report.Id, result.ReportId);
        Assert.Equal(expectedStatus, result.ReportStatus);
        Assert.Equal(expectedStatus, report.Status);
        Assert.Equal(FixedUtcNow.UtcDateTime, report.ResolvedAt);
        Assert.Equal(9, report.ResolvedByUserId);
        Assert.Equal("reviewed", report.AdminNote);
    }

    [Fact]
    public async Task WhitespaceAdminNote_IsStoredAsNull()
    {
        await using var context = CreateContext();
        var report = CreateReport();
        context.Reports.Add(report);
        await context.SaveChangesAsync();
        var handler = CreateHandler(context);

        await handler.ExecuteAsync(
            new UpdateReportStatusCommand(report.Id, "Resolved", "   ", 9));

        Assert.Null(report.AdminNote);
    }

    private static readonly DateTimeOffset FixedUtcNow =
        new(2026, 7, 31, 6, 7, 8, TimeSpan.Zero);

    private static UpdateReportStatusCommandHandler CreateHandler(
        MangaDbContext context) =>
        new(context, new FixedTimeProvider(FixedUtcNow));

    private static Report CreateReport() => new()
    {
        ReporterId = 1,
        TargetType = ReportTargetType.Manga,
        MangaId = 1,
        Reason = "Other",
        Status = ReportStatus.Pending
    };

    private static MangaDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new MangaDbContext(options);
    }

    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
