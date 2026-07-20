using System.Text.Json;
using MangaNPK.Contracts.Admin;
using MangaNPK.Controllers;
using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public class AdminUserManagementTests
{
    [Fact]
    public async Task List_SearchesFiltersAndPaginatesWithoutPasswordHash()
    {
        await using var context = CreateContext();
        context.Users.AddRange(
            new User { Username = "alpha", Email = "alpha@test.local", PasswordHash = "secret", Role = "User" },
            new User { Username = "beta", Email = "beta@test.local", PasswordHash = "secret", Role = "Admin" },
            new User { Username = "locked-alpha", Email = "locked@test.local", PasswordHash = "secret", Role = "User", IsLocked = true });
        await context.SaveChangesAsync();
        var controller = CreateController(context, 2);

        var result = Assert.IsType<OkObjectResult>(await controller.List(1, 20, "alpha", "User", "active"));
        var payload = Assert.IsType<AdminUserListResponse>(result.Value);

        Assert.Single(payload.Items);
        Assert.Equal("alpha", payload.Items[0].Username);
        Assert.Equal(1, payload.TotalItems);
        Assert.DoesNotContain("PasswordHash", JsonSerializer.Serialize(payload), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task List_ClampsPageSizeToOneHundred()
    {
        await using var context = CreateContext();
        var controller = CreateController(context, 1);

        var result = Assert.IsType<OkObjectResult>(await controller.List(1, 500, null, null, null));
        var payload = Assert.IsType<AdminUserListResponse>(result.Value);

        Assert.Equal(100, payload.PageSize);
    }

    [Fact]
    public async Task UpdateRole_RejectsSelfDemotion()
    {
        await using var context = CreateContext();
        var admin = new User { Username = "admin", Email = "admin@test.local", Role = "Admin" };
        context.Users.Add(admin); await context.SaveChangesAsync();
        var controller = CreateController(context, admin.Id);

        var result = await controller.UpdateRole(admin.Id, new UpdateUserRoleDto { Role = "User" });

        Assert.IsType<ConflictObjectResult>(result);
        Assert.Equal("Admin", (await context.Users.FindAsync(admin.Id))!.Role);
    }

    [Fact]
    public async Task UpdateRole_RejectsLastActiveAdminDemotion()
    {
        await using var context = CreateContext();
        var current = new User { Username = "current", Email = "current@test.local", Role = "Admin" };
        var target = new User { Username = "target", Email = "target@test.local", Role = "Admin", IsLocked = true };
        context.Users.AddRange(current, target); await context.SaveChangesAsync();
        var controller = CreateController(context, current.Id);

        var result = await controller.UpdateRole(current.Id, new UpdateUserRoleDto { Role = "User" });

        Assert.IsType<ConflictObjectResult>(result);
    }

    [Fact]
    public async Task UpdateLock_ChangesAnotherUsersStatus()
    {
        await using var context = CreateContext();
        var admin = new User { Username = "admin", Email = "admin@test.local", Role = "Admin" };
        var user = new User { Username = "reader", Email = "reader@test.local", Role = "User" };
        context.Users.AddRange(admin, user); await context.SaveChangesAsync();
        var controller = CreateController(context, admin.Id);

        var result = Assert.IsType<OkObjectResult>(await controller.UpdateLock(user.Id, new UpdateUserLockDto { IsLocked = true }));

        Assert.True((await context.Users.FindAsync(user.Id))!.IsLocked);
        Assert.IsType<AdminUserListItemDto>(result.Value);
    }

    [Fact]
    public async Task UpdateLock_RejectsSelfLockAndLastActiveAdminLock()
    {
        await using var context = CreateContext();
        var admin = new User { Username = "admin", Email = "admin@test.local", Role = "Admin" };
        context.Users.Add(admin); await context.SaveChangesAsync();
        var controller = CreateController(context, admin.Id);

        var result = await controller.UpdateLock(admin.Id, new UpdateUserLockDto { IsLocked = true });

        Assert.IsType<ConflictObjectResult>(result);
        Assert.False((await context.Users.FindAsync(admin.Id))!.IsLocked);
    }

    private static MangaDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new MangaDbContext(options);
    }

    private static AdminUsersController CreateController(MangaDbContext context, int adminId)
    {
        var session = new TestSession();
        session.SetInt32("UserId", adminId);
        return new AdminUsersController(context)
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
        public string Id => "admin-user-test";
        public IEnumerable<string> Keys => _values.Keys;
        public void Clear() => _values.Clear();
        public Task CommitAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task LoadAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public void Remove(string key) => _values.Remove(key);
        public void Set(string key, byte[] value) => _values[key] = value;
        public bool TryGetValue(string key, out byte[] value) => _values.TryGetValue(key, out value!);
    }
}
