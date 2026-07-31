using MangaNPK.Controllers;
using MangaNPK.Data;
using MangaNPK.Filters;
using MangaNPK.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public sealed class ReportCommandArchitectureTests
{
    [Fact]
    public void ReportsController_DelegatesModerationToCommandHandler()
    {
        var parameters = typeof(ReportsController)
            .GetConstructors()
            .Single()
            .GetParameters();

        Assert.Contains(
            parameters,
            parameter => parameter.ParameterType == typeof(IReportCommandHandler));
    }

    [Fact]
    public void UpdateStatus_KeepsPatchRouteAndAdminProtection()
    {
        var method = typeof(ReportsController).GetMethod(
            nameof(ReportsController.UpdateStatus));
        Assert.NotNull(method);

        var patch = Assert.Single(
            method!.GetCustomAttributes(typeof(HttpPatchAttribute), false)
                .Cast<HttpPatchAttribute>());
        Assert.Equal("{id:int}", patch.Template);
        Assert.Single(
            method.GetCustomAttributes(typeof(RequireAdminAttribute), false));
    }

    [Fact]
    public async Task UpdateStatus_PreservesNonCancelableModerationBehavior()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var context = new MangaDbContext(options);
        var handler = new RecordingHandler();
        using var aborted = new CancellationTokenSource();
        aborted.Cancel();
        var controller = new ReportsController(context, handler)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    Session = new TestSession(),
                    RequestAborted = aborted.Token
                }
            }
        };

        await controller.UpdateStatus(
            1,
            new UpdateReportDto { Status = "Resolved" });

        Assert.False(handler.Token.CanBeCanceled);
    }

    private sealed class RecordingHandler : IReportCommandHandler
    {
        public CancellationToken Token { get; private set; }

        public Task<ReportCommandResult> ExecuteAsync(
            UpdateReportStatusCommand command,
            CancellationToken cancellationToken = default)
        {
            Token = cancellationToken;
            return Task.FromResult(new ReportCommandResult(
                ReportCommandStatus.Success,
                ReportId: command.ReportId,
                ReportStatus: Models.ReportStatus.Resolved));
        }
    }

    private sealed class TestSession : ISession
    {
        private readonly Dictionary<string, byte[]> _values = [];

        public bool IsAvailable => true;
        public string Id => "report-command-test";
        public IEnumerable<string> Keys => _values.Keys;

        public void Clear() => _values.Clear();
        public Task CommitAsync(CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
        public Task LoadAsync(CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
        public void Remove(string key) => _values.Remove(key);
        public void Set(string key, byte[] value) => _values[key] = value;
        public bool TryGetValue(string key, out byte[] value) =>
            _values.TryGetValue(key, out value!);
    }
}
