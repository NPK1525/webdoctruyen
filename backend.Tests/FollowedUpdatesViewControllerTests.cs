using MangaNPK.Controllers;
using MangaNPK.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace MangaNPK.Tests;

public class FollowedUpdatesViewControllerTests
{
    [Fact]
    public async Task Index_WhenSignedOut_DoesNotQueryPersonalizedData()
    {
        var service = new FakeFollowedUpdatesService();
        var controller = CreateController(service, userId: null);

        var result = Assert.IsType<ViewResult>(await controller.Index());

        Assert.False(Assert.IsType<bool>(result.ViewData["IsAuthenticated"]));
        Assert.Equal(0, service.CallCount);
    }

    [Fact]
    public async Task Index_WhenSignedIn_QueriesCurrentUsersLibrary()
    {
        var service = new FakeFollowedUpdatesService();
        var controller = CreateController(service, userId: 37);

        var result = Assert.IsType<ViewResult>(await controller.Index());

        Assert.True(Assert.IsType<bool>(result.ViewData["IsAuthenticated"]));
        Assert.Equal(37, service.LastUserId);
        Assert.Contains("Followed title", Assert.IsType<string>(result.ViewData["UpdatesJson"]));
    }

    private static FollowedUpdatesViewController CreateController(
        FakeFollowedUpdatesService service,
        int? userId)
    {
        var session = new TestSession();
        if (userId.HasValue) session.SetInt32("UserId", userId.Value);

        return new FollowedUpdatesViewController(service)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { Session = session }
            }
        };
    }

    private sealed class FakeFollowedUpdatesService : IFollowedUpdatesService
    {
        public int CallCount { get; private set; }
        public int LastUserId { get; private set; }

        public Task<IReadOnlyList<FollowedUpdateItem>> GetAsync(
            int userId,
            int limit = 100,
            CancellationToken cancellationToken = default)
        {
            CallCount++;
            LastUserId = userId;
            IReadOnlyList<FollowedUpdateItem> result =
            [
                new FollowedUpdateItem { MangaTitle = "Followed title" }
            ];
            return Task.FromResult(result);
        }
    }

    private sealed class TestSession : ISession
    {
        private readonly Dictionary<string, byte[]> _values = [];
        public bool IsAvailable => true;
        public string Id => "test";
        public IEnumerable<string> Keys => _values.Keys;
        public void Clear() => _values.Clear();
        public Task CommitAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task LoadAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public void Remove(string key) => _values.Remove(key);
        public void Set(string key, byte[] value) => _values[key] = value;
        public bool TryGetValue(string key, out byte[] value) => _values.TryGetValue(key, out value!);
    }
}
