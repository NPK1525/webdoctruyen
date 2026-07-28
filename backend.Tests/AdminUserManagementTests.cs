using System.Text.Json;
using MangaNPK.Contracts.Admin;
using MangaNPK.Controllers;
using MangaNPK.Data;
using MangaNPK.Models;
using MangaNPK.Services;
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
    public async Task Get_ReturnsRequestedUserWithoutPasswordHash()
    {
        await using var context = CreateContext();
        var admin = new User { Username = "admin", Email = "admin@test.local", PasswordHash = "admin-secret", Role = "Admin" };
        var user = new User { Username = "reader", Email = "reader@test.local", PasswordHash = "reader-secret", Role = "User" };
        context.Users.AddRange(admin, user);
        await context.SaveChangesAsync();
        var controller = CreateController(context, admin.Id);

        var result = Assert.IsType<OkObjectResult>(await controller.Get(user.Id));
        var payload = Assert.IsType<AdminUserListItemDto>(result.Value);

        Assert.Equal(user.Id, payload.Id);
        Assert.Equal("reader", payload.Username);
        Assert.DoesNotContain("PasswordHash", JsonSerializer.Serialize(payload), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("reader-secret", JsonSerializer.Serialize(payload), StringComparison.Ordinal);
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

    [Fact]
    public async Task UpdateProfile_ChangesEditableUserFields()
    {
        await using var context = CreateContext();
        var admin = new User { Username = "admin", Email = "admin@test.local", Role = "Admin" };
        var user = new User { Username = "reader", Email = "reader@test.local", Role = "User" };
        context.Users.AddRange(admin, user); await context.SaveChangesAsync();
        var controller = CreateController(context, admin.Id);

        var result = Assert.IsType<OkObjectResult>(await controller.UpdateProfile(user.Id, new UpdateUserProfileDto
        {
            Username = "edited-reader", Email = "edited@test.local", AvatarUrl = "https://cdn.test/avatar.png",
            Bio = "Updated bio", Badge = "Contributor", Role = "Admin"
        }));

        var saved = await context.Users.FindAsync(user.Id);
        Assert.Equal("edited-reader", saved!.Username);
        Assert.Equal("edited@test.local", saved.Email);
        Assert.Equal("Updated bio", saved.Bio);
        Assert.Equal("Admin", saved.Role);
        Assert.IsType<AdminUserListItemDto>(result.Value);
    }

    [Fact]
    public async Task UpdateProfile_RejectsDuplicateEmail()
    {
        await using var context = CreateContext();
        var admin = new User { Username = "admin", Email = "admin@test.local", Role = "Admin" };
        var user = new User { Username = "reader", Email = "reader@test.local", Role = "User" };
        context.Users.AddRange(admin, user); await context.SaveChangesAsync();
        var controller = CreateController(context, admin.Id);

        var result = await controller.UpdateProfile(user.Id, new UpdateUserProfileDto
        {
            Username = "edited-reader", Email = "admin@test.local"
        });

        Assert.IsType<ConflictObjectResult>(result);
    }

    [Fact]
    public async Task UpdateProfile_RejectsDuplicateUsernameIgnoringCase()
    {
        await using var context = CreateContext();
        var admin = new User { Username = "admin", Email = "admin@test.local", Role = "Admin" };
        var user = new User { Username = "reader", Email = "reader@test.local", Role = "User" };
        context.Users.AddRange(admin, user); await context.SaveChangesAsync();
        var controller = CreateController(context, admin.Id);

        var result = await controller.UpdateProfile(user.Id, new UpdateUserProfileDto
        {
            Username = " ADMIN ", Email = "reader-new@test.local"
        });

        Assert.IsType<ConflictObjectResult>(result);
    }

    [Fact]
    public async Task UpdateProfile_AcceptsHttpsAvatarLongerThanFiveHundredCharacters()
    {
        await using var context = CreateContext();
        var admin = new User { Username = "admin", Email = "admin@test.local", Role = "Admin" };
        var user = new User { Username = "reader", Email = "reader@test.local", Role = "User" };
        context.Users.AddRange(admin, user);
        await context.SaveChangesAsync();
        var controller = CreateController(context, admin.Id);
        var avatarUrl = $"https://cdn.test/{new string('a', 600)}.png";

        var result = await controller.UpdateProfile(user.Id, new UpdateUserProfileDto
        {
            Username = user.Username,
            Email = user.Email,
            AvatarUrl = avatarUrl
        });

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal(avatarUrl, (await context.Users.FindAsync(user.Id))!.AvatarUrl);
    }

    [Theory]
    [InlineData("http://cdn.test/avatar.png")]
    [InlineData("data:image/png;base64,iVBORw0KGgo=")]
    [InlineData("/uploads/avatar.png")]
    public async Task UpdateProfile_RejectsNonHttpsAvatar(string avatarUrl)
    {
        await using var context = CreateContext();
        var admin = new User { Username = "admin", Email = "admin@test.local", Role = "Admin" };
        var user = new User { Username = "reader", Email = "reader@test.local", Role = "User" };
        context.Users.AddRange(admin, user);
        await context.SaveChangesAsync();
        var controller = CreateController(context, admin.Id);

        var result = await controller.UpdateProfile(user.Id, new UpdateUserProfileDto
        {
            Username = user.Username,
            Email = user.Email,
            AvatarUrl = avatarUrl
        });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Null((await context.Users.FindAsync(user.Id))!.AvatarUrl);
    }

    [Fact]
    public async Task UpdateProfile_RejectsAvatarLongerThanTwoThousandFortyEightCharacters()
    {
        await using var context = CreateContext();
        var admin = new User { Username = "admin", Email = "admin@test.local", Role = "Admin" };
        var user = new User { Username = "reader", Email = "reader@test.local", Role = "User" };
        context.Users.AddRange(admin, user);
        await context.SaveChangesAsync();
        var controller = CreateController(context, admin.Id);

        var result = await controller.UpdateProfile(user.Id, new UpdateUserProfileDto
        {
            Username = user.Username,
            Email = user.Email,
            AvatarUrl = $"https://cdn.test/{new string('a', 2049)}"
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ResetPassword_ReplacesHashWithoutCurrentPassword()
    {
        await using var context = CreateContext();
        var admin = new User { Username = "admin", Email = "admin@test.local", Role = "Admin" };
        var user = new User
        {
            Username = "reader",
            Email = "reader@test.local",
            Role = "User",
            PasswordHash = AuthService.HashPassword("OldPassword1")
        };
        context.Users.AddRange(admin, user);
        await context.SaveChangesAsync();
        var controller = CreateController(context, admin.Id);

        var result = await InvokeResetPassword(controller, user.Id, "NewPassword2", "NewPassword2");

        Assert.IsType<OkObjectResult>(result);
        var saved = await context.Users.FindAsync(user.Id);
        Assert.True(AuthService.VerifyPassword("NewPassword2", saved!.PasswordHash));
        Assert.False(AuthService.VerifyPassword("OldPassword1", saved.PasswordHash));
        Assert.DoesNotContain("PasswordHash", JsonSerializer.Serialize(((OkObjectResult)result).Value), StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("NewPassword2", "DifferentPassword3")]
    [InlineData("weak", "weak")]
    public async Task ResetPassword_RejectsInvalidPasswordRequest(string password, string confirmation)
    {
        await using var context = CreateContext();
        var admin = new User { Username = "admin", Email = "admin@test.local", Role = "Admin" };
        var user = new User { Username = "reader", Email = "reader@test.local", Role = "User", PasswordHash = "original" };
        context.Users.AddRange(admin, user);
        await context.SaveChangesAsync();
        var controller = CreateController(context, admin.Id);

        var result = await InvokeResetPassword(controller, user.Id, password, confirmation);

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("original", (await context.Users.FindAsync(user.Id))!.PasswordHash);
    }

    [Fact]
    public async Task ResetPassword_ReturnsNotFoundForMissingUser()
    {
        await using var context = CreateContext();
        var admin = new User { Username = "admin", Email = "admin@test.local", Role = "Admin" };
        context.Users.Add(admin);
        await context.SaveChangesAsync();
        var controller = CreateController(context, admin.Id);

        var result = await InvokeResetPassword(controller, 999, "NewPassword2", "NewPassword2");

        Assert.IsType<NotFoundObjectResult>(result);
    }

    private static async Task<IActionResult> InvokeResetPassword(
        AdminUsersController controller,
        int userId,
        string newPassword,
        string confirmPassword)
    {
        var method = typeof(AdminUsersController).GetMethod("ResetPassword");
        Assert.NotNull(method);
        var dtoType = method.GetParameters()[1].ParameterType;
        var dto = JsonSerializer.Deserialize(
            JsonSerializer.Serialize(new { newPassword, confirmPassword }),
            dtoType,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        var task = Assert.IsAssignableFrom<Task<IActionResult>>(method.Invoke(controller, [userId, dto]));
        return await task;
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
