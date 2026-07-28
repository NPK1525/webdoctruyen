using MangaNPK.Controllers;
using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public class UserProfileSecurityTests
{
    [Fact]
    public async Task UpdateMyProfile_RejectsEmailChange()
    {
        await using var context = CreateContext();
        var user = new User { Username = "reader", Email = "reader@test.local" };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var controller = CreateController(context, user.Id);

        var result = await controller.UpdateMyProfile(new UpdateProfileDto
        {
            Email = "changed@test.local",
            Bio = "Updated bio"
        });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("reader@test.local", (await context.Users.FindAsync(user.Id))!.Email);
    }

    [Theory]
    [InlineData("http://cdn.test/avatar.png")]
    [InlineData("data:image/png;base64,iVBORw0KGgo=")]
    public async Task UpdateMyProfile_RejectsNonHttpsAvatar(string avatarUrl)
    {
        await using var context = CreateContext();
        var user = new User { Username = "reader", Email = "reader@test.local" };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var controller = CreateController(context, user.Id);

        var result = await controller.UpdateMyProfile(new UpdateProfileDto { AvatarUrl = avatarUrl });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Null((await context.Users.FindAsync(user.Id))!.AvatarUrl);
    }

    private static MangaDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new MangaDbContext(options);
    }

    private static UserProfileController CreateController(MangaDbContext context, int userId)
    {
        var session = new TestSession();
        session.SetInt32("UserId", userId);
        return new UserProfileController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { Session = session }
            }
        };
    }

    private sealed class TestSession : ISession
    {
        private readonly Dictionary<string, byte[]> _values = [];
        public bool IsAvailable => true;
        public string Id => "user-profile-security-test";
        public IEnumerable<string> Keys => _values.Keys;
        public void Clear() => _values.Clear();
        public Task CommitAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task LoadAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public void Remove(string key) => _values.Remove(key);
        public void Set(string key, byte[] value) => _values[key] = value;
        public bool TryGetValue(string key, out byte[] value) => _values.TryGetValue(key, out value!);
    }
}
