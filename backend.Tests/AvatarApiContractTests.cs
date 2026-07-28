using System.Text.Json;
using MangaNPK.Controllers;
using MangaNPK.Data;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public class AvatarApiContractTests
{
    [Fact]
    public async Task AuthResponses_IncludeSavedAvatarUrl()
    {
        await using var context = CreateContext();
        var user = new User
        {
            Username = "avatar-reader",
            Email = "avatar@test.local",
            PasswordHash = AuthService.HashPassword("Password1"),
            AvatarUrl = "/uploads/avatars/reader.png"
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var loginController = CreateAuthController(context, new TestSession());
        var login = Assert.IsType<OkObjectResult>(await loginController.Login(new LoginDto
        {
            Username = user.Username,
            Password = "Password1"
        }));
        Assert.Contains(user.AvatarUrl, JsonSerializer.Serialize(login.Value));

        var session = new TestSession();
        session.SetInt32("UserId", user.Id);
        var meController = CreateAuthController(context, session);
        var me = Assert.IsType<OkObjectResult>(await meController.Me());
        Assert.Contains(user.AvatarUrl, JsonSerializer.Serialize(me.Value));
    }

    [Fact]
    public async Task RegisterResponse_InitializesAvatarUrlContract()
    {
        await using var context = CreateContext();
        var controller = CreateAuthController(context, new TestSession());

        var result = Assert.IsType<OkObjectResult>(await controller.Register(new RegisterDto
        {
            Username = "new-reader",
            Email = "new-reader@test.local",
            Password = "Password1"
        }));

        Assert.Contains("\"avatarUrl\":null", JsonSerializer.Serialize(result.Value));
    }

    [Fact]
    public async Task CommentResponses_IncludeCommenterAvatarUrl()
    {
        await using var context = CreateContext();
        var user = new User
        {
            Username = "commenter",
            Email = "commenter@test.local",
            PasswordHash = "hash",
            AvatarUrl = "https://cdn.example.test/commenter.png"
        };
        var manga = new Manga { Title = "Avatar manga" };
        context.AddRange(user, manga);
        await context.SaveChangesAsync();
        context.Comments.Add(new Comment
        {
            UserId = user.Id,
            MangaId = manga.Id,
            Content = "Avatar comment"
        });
        await context.SaveChangesAsync();

        var controller = new CommentsController(context);
        var result = Assert.IsType<OkObjectResult>(await controller.GetComments(manga.Id, null));

        Assert.Contains(user.AvatarUrl, JsonSerializer.Serialize(result.Value));
    }

    private static MangaDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new MangaDbContext(options);
    }

    private static AuthController CreateAuthController(MangaDbContext context, TestSession session)
        => new(context, null!)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { Session = session }
            }
        };

    private sealed class TestSession : ISession
    {
        private readonly Dictionary<string, byte[]> _values = [];
        public bool IsAvailable => true;
        public string Id => "avatar-api-test";
        public IEnumerable<string> Keys => _values.Keys;
        public void Clear() => _values.Clear();
        public Task CommitAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task LoadAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public void Remove(string key) => _values.Remove(key);
        public void Set(string key, byte[] value) => _values[key] = value;
        public bool TryGetValue(string key, out byte[] value) => _values.TryGetValue(key, out value!);
    }
}
