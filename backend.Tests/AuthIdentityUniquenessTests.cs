using MangaNPK.Controllers;
using MangaNPK.Data;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public class AuthIdentityUniquenessTests
{
    [Fact]
    public async Task Register_RejectsUsernameDuplicateIgnoringCaseAndWhitespace()
    {
        await using var context = CreateContext();
        context.Users.Add(new User
        {
            Username = "ExistingUser",
            Email = "existing@example.test",
            PasswordHash = "hash"
        });
        await context.SaveChangesAsync();
        var controller = CreateController(context);

        var result = await controller.Register(new RegisterDto
        {
            Username = " existinguser ",
            Email = "new@example.test",
            Password = "Password1"
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Register_RejectsEmailDuplicateIgnoringCaseAndWhitespace()
    {
        await using var context = CreateContext();
        context.Users.Add(new User
        {
            Username = "existing-user",
            Email = "Existing@Example.Test",
            PasswordHash = "hash"
        });
        await context.SaveChangesAsync();
        var controller = CreateController(context);

        var result = await controller.Register(new RegisterDto
        {
            Username = "new-user",
            Email = " existing@example.test ",
            Password = "Password1"
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    private static MangaDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new MangaDbContext(options);
    }

    private static AuthController CreateController(MangaDbContext context)
    {
        var session = new TestSession();
        return new AuthController(context, null!)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { Session = session }
            }
        };
    }

    private sealed class TestSession : ISession
    {
        private readonly Dictionary<string, byte[]> values = [];
        public bool IsAvailable => true;
        public string Id => "auth-identity-test";
        public IEnumerable<string> Keys => values.Keys;
        public void Clear() => values.Clear();
        public Task CommitAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task LoadAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public void Remove(string key) => values.Remove(key);
        public void Set(string key, byte[] value) => values[key] = value;
        public bool TryGetValue(string key, out byte[] value) => values.TryGetValue(key, out value!);
    }
}
