using System.Reflection;
using MangaNPK.Controllers;
using MangaNPK.Data;
using MangaNPK.Filters;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace MangaNPK.Tests;

public class AuthLockingTests
{
    [Fact]
    public async Task Login_ReturnsForbiddenForLockedAccount()
    {
        await using var context = CreateContext();
        context.Users.Add(new User
        {
            Username = "locked", Email = "locked@test.local",
            PasswordHash = AuthService.HashPassword("Password1"), IsLocked = true
        });
        await context.SaveChangesAsync();
        var controller = CreateAuthController(context, new TestSession());

        var result = await controller.Login(new LoginDto { Username = "locked", Password = "Password1" });

        Assert.Equal(403, Assert.IsType<ObjectResult>(result).StatusCode);
    }

    [Fact]
    public async Task Me_ClearsLockedUsersSessionAndReturnsForbidden()
    {
        await using var context = CreateContext();
        var user = new User { Username = "locked", Email = "locked@test.local", IsLocked = true };
        context.Users.Add(user); await context.SaveChangesAsync();
        var session = new TestSession(); session.SetInt32("UserId", user.Id);
        var controller = CreateAuthController(context, session);

        var result = await controller.Me();

        Assert.Equal(403, Assert.IsType<ObjectResult>(result).StatusCode);
        Assert.False(session.TryGetValue("UserId", out _));
    }

    [Fact]
    public void RequireAdmin_RejectsLockedOrDemotedSessionUser()
    {
        using var context = CreateContext();
        var user = new User { Username = "former-admin", Email = "admin@test.local", Role = "User" };
        context.Users.Add(user); context.SaveChanges();
        var session = new TestSession();
        session.SetInt32("UserId", user.Id);
        session.SetString("Role", "Admin");
        var httpContext = new DefaultHttpContext
        {
            Session = session,
            RequestServices = new ServiceCollection().AddSingleton(context).BuildServiceProvider()
        };
        var descriptor = new ControllerActionDescriptor
        {
            ControllerTypeInfo = typeof(AdminUsersController).GetTypeInfo(),
            ActionName = "List"
        };
        var filterContext = new AuthorizationFilterContext(
            new ActionContext(httpContext, new RouteData(), descriptor), []);

        new RequireAdminAttribute().OnAuthorization(filterContext);

        Assert.Equal(403, Assert.IsType<ObjectResult>(filterContext.Result).StatusCode);
        Assert.False(session.TryGetValue("Role", out _));
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
        public string Id => "auth-locking-test";
        public IEnumerable<string> Keys => _values.Keys;
        public void Clear() => _values.Clear();
        public Task CommitAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task LoadAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public void Remove(string key) => _values.Remove(key);
        public void Set(string key, byte[] value) => _values[key] = value;
        public bool TryGetValue(string key, out byte[] value) => _values.TryGetValue(key, out value!);
    }
}
