# Admin User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm tab quản lý người dùng đồng bộ trong `/admin`, có tìm kiếm, lọc, phân trang, đổi vai trò và khóa/mở khóa an toàn.

**Architecture:** `AdminUsersController` cung cấp API phân trang và cập nhật tài khoản, sử dụng DTO riêng để không lộ password hash. Trạng thái khóa nằm trên model `User`; `AuthController` và `RequireAdminAttribute` kiểm tra lại trạng thái trong cơ sở dữ liệu. Giao diện là một pane trong trang admin hiện tại, còn logic trình duyệt nằm trong module `admin-users.js` với interface nhỏ `AdminUsers.init()` và `AdminUsers.activate()`.

**Tech Stack:** ASP.NET Core MVC/API net10.0, Entity Framework Core 10.0.9, SQL Server, xUnit 2.9.3, JavaScript ES2020, Node test runner, Razor, CSS variables.

## Global Constraints

- Không xóa vĩnh viễn tài khoản.
- Không trả `PasswordHash` qua API.
- Không cho admin đang đăng nhập tự khóa hoặc tự hạ quyền.
- Không cho thao tác làm số admin hoạt động giảm xuống 0.
- Danh sách phân trang phía server, mặc định 20 phần tử và tối đa 100.
- Giao diện nằm trong `/admin`, dùng tiếng Việt và biến theme hiện có.
- Module người dùng phải tải trước `admin.js`.
- Mọi thay đổi production phải có test thất bại trước khi triển khai.

---

## File map

- `backend/Models/User.cs`: lưu `IsLocked`.
- `backend/Migrations/<timestamp>_AddUserLockState.cs` và `.Designer.cs`: thêm cột SQL.
- `backend/Migrations/MangaDbContextModelSnapshot.cs`: snapshot schema.
- `backend/Contracts/Admin/UserManagementDtos.cs`: request/response DTO của API.
- `backend/Controllers/AdminUsersController.cs`: danh sách, đổi vai trò, khóa/mở khóa.
- `backend/Controllers/AuthController.cs`: chặn đăng nhập và hủy phiên của tài khoản khóa.
- `backend/Filters/RequireAdminAttribute.cs`: xác minh admin hiện vẫn hoạt động bằng dữ liệu hiện tại.
- `backend/Views/AdminView/Index.cshtml`: tab, filters, table, pagination và script include.
- `backend/wwwroot/js/admin-users.js`: state và hành vi của tab người dùng.
- `backend/wwwroot/js/admin.js`: khởi tạo/kích hoạt module người dùng.
- `backend/wwwroot/css/style.css`: layout responsive và theme.
- `backend.Tests/AdminUserManagementTests.cs`: hành vi API và bảo vệ admin.
- `backend.Tests/AuthLockingTests.cs`: đăng nhập, `/me` và filter admin.
- `backend.Tests/AdminControllerArchitectureTests.cs`: hợp đồng endpoint/controller/DTO.
- `backend.Tests/js/admin-user-management.test.cjs`: hợp đồng giao diện và module.

---

### Task 1: User lock state and database migration

**Files:**
- Create: `backend.Tests/UserLockingModelTests.cs`
- Modify: `backend/Models/User.cs`
- Create: `backend/Migrations/<timestamp>_AddUserLockState.cs`
- Create: `backend/Migrations/<timestamp>_AddUserLockState.Designer.cs`
- Modify: `backend/Migrations/MangaDbContextModelSnapshot.cs`

**Interfaces:**
- Produces: `User.IsLocked : bool`, mặc định `false`.
- Consumes: model `MangaNPK.Models.User` hiện có.

- [ ] **Step 1: Viết test model thất bại**

```csharp
using MangaNPK.Models;
using Xunit;

namespace MangaNPK.Tests;

public class UserLockingModelTests
{
    [Fact]
    public void NewUser_IsUnlockedByDefault()
    {
        var user = new User();

        Assert.False(user.IsLocked);
    }
}
```

- [ ] **Step 2: Chạy test và xác nhận RED**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter FullyQualifiedName~UserLockingModelTests --no-restore`

Expected: compile FAIL vì `User` chưa có `IsLocked`.

- [ ] **Step 3: Thêm trạng thái khóa tối thiểu**

Trong `User` thêm:

```csharp
public bool IsLocked { get; set; }
```

- [ ] **Step 4: Chạy test và xác nhận GREEN**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter FullyQualifiedName~UserLockingModelTests --no-restore`

Expected: 1 test PASS.

- [ ] **Step 5: Sinh migration EF**

Run: `dotnet ef migrations add AddUserLockState --project backend/MangaNPK.csproj --startup-project backend/MangaNPK.csproj`

Kiểm tra migration có đúng nội dung tương đương:

```csharp
migrationBuilder.AddColumn<bool>(
    name: "IsLocked",
    table: "Users",
    type: "bit",
    nullable: false,
    defaultValue: false);
```

Hàm `Down` phải gọi:

```csharp
migrationBuilder.DropColumn(name: "IsLocked", table: "Users");
```

- [ ] **Step 6: Kiểm tra build và commit**

Run: `dotnet build backend/MangaNPK.csproj --no-restore`

Expected: build PASS, 0 errors.

```powershell
git add backend/Models/User.cs backend/Migrations backend.Tests/UserLockingModelTests.cs
git commit -m "feat: add user lock state"
```

---

### Task 2: Paginated admin user list API

**Files:**
- Modify: `backend.Tests/MangaNPK.Tests.csproj`
- Create: `backend.Tests/AdminUserManagementTests.cs`
- Modify: `backend.Tests/AdminControllerArchitectureTests.cs`
- Create: `backend/Contracts/Admin/UserManagementDtos.cs`
- Create: `backend/Controllers/AdminUsersController.cs`

**Interfaces:**
- Produces: `GET api/admin/users`.
- Produces: `AdminUserListItemDto`, `UpdateUserRoleDto`, `UpdateUserLockDto`.
- Consumes: `MangaDbContext.Users` và session `UserId`.

- [ ] **Step 1: Thêm EF InMemory cho test và viết test danh sách thất bại**

Thêm package vào `backend.Tests/MangaNPK.Tests.csproj`:

```xml
<PackageReference Include="Microsoft.EntityFrameworkCore.InMemory" Version="10.0.9" />
```

Tạo fixture trong `AdminUserManagementTests.cs`:

```csharp
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
```

Viết các test:

```csharp
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
```

Trong architecture test, thêm `GET users` vào `ExpectedEndpoints`, thêm `AdminUsersController` vào `expectedNames`, và thêm các DTO sau vào theory:

```csharp
[InlineData("UpdateUserRoleDto")]
[InlineData("UpdateUserLockDto")]
```

- [ ] **Step 2: Chạy test và xác nhận RED**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter "FullyQualifiedName~AdminUserManagementTests|FullyQualifiedName~AdminControllerArchitectureTests"`

Expected: FAIL vì controller, DTO và endpoint chưa tồn tại.

- [ ] **Step 3: Tạo DTO cụ thể**

`UserManagementDtos.cs`:

```csharp
namespace MangaNPK.Contracts.Admin;

public sealed record AdminUserListItemDto(
    int Id,
    string Username,
    string Email,
    string Role,
    string? AvatarUrl,
    bool IsLocked,
    DateTime CreatedAt,
    bool IsCurrentUser);

public sealed record AdminUserListResponse(
    IReadOnlyList<AdminUserListItemDto> Items,
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages);

public sealed class UpdateUserRoleDto
{
    public string Role { get; set; } = string.Empty;
}

public sealed class UpdateUserLockDto
{
    public bool IsLocked { get; set; }
}
```

- [ ] **Step 4: Tạo controller và action danh sách tối thiểu**

Controller phải có khai báo:

```csharp
[ApiController]
[Route("api/admin")]
[RequireAdmin]
public sealed class AdminUsersController(MangaDbContext context) : ControllerBase
```

Action danh sách:

```csharp
[HttpGet("users")]
public async Task<IActionResult> List(
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 20,
    [FromQuery] string? search = null,
    [FromQuery] string? role = null,
    [FromQuery] string? status = null)
{
    page = Math.Max(1, page);
    pageSize = Math.Clamp(pageSize, 1, 100);
    var currentUserId = HttpContext.Session.GetInt32("UserId")!.Value;
    var query = context.Users.AsNoTracking();
    var term = search?.Trim();
    if (!string.IsNullOrWhiteSpace(term))
        query = query.Where(user => user.Username.Contains(term) || user.Email.Contains(term));
    if (string.Equals(role, "User", StringComparison.OrdinalIgnoreCase)) query = query.Where(user => user.Role == "User");
    if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase)) query = query.Where(user => user.Role == "Admin");
    if (string.Equals(status, "active", StringComparison.OrdinalIgnoreCase)) query = query.Where(user => !user.IsLocked);
    if (string.Equals(status, "locked", StringComparison.OrdinalIgnoreCase)) query = query.Where(user => user.IsLocked);

    var totalItems = await query.CountAsync();
    var totalPages = Math.Max(1, (int)Math.Ceiling(totalItems / (double)pageSize));
    page = Math.Min(page, totalPages);
    var items = await query.OrderByDescending(user => user.CreatedAt).ThenByDescending(user => user.Id)
        .Skip((page - 1) * pageSize).Take(pageSize)
        .Select(user => new AdminUserListItemDto(user.Id, user.Username, user.Email, user.Role,
            user.AvatarUrl, user.IsLocked, user.CreatedAt, user.Id == currentUserId))
        .ToListAsync();
    return Ok(new AdminUserListResponse(items, page, pageSize, totalItems, totalPages));
}
```

- [ ] **Step 5: Chạy test và xác nhận GREEN**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter "FullyQualifiedName~AdminUserManagementTests|FullyQualifiedName~AdminControllerArchitectureTests"`

Expected: các test danh sách và architecture PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend.Tests/MangaNPK.Tests.csproj backend.Tests/AdminUserManagementTests.cs backend.Tests/AdminControllerArchitectureTests.cs backend/Contracts/Admin/UserManagementDtos.cs backend/Controllers/AdminUsersController.cs
git commit -m "feat: add paginated admin user API"
```

---

### Task 3: Safe role and lock mutations

**Files:**
- Modify: `backend.Tests/AdminUserManagementTests.cs`
- Modify: `backend.Tests/AdminControllerArchitectureTests.cs`
- Modify: `backend/Controllers/AdminUsersController.cs`

**Interfaces:**
- Produces: `PUT api/admin/users/{id:int}/role` consuming `UpdateUserRoleDto`.
- Produces: `PUT api/admin/users/{id:int}/lock` consuming `UpdateUserLockDto`.
- Returns: `AdminUserListItemDto` on success; JSON `{ message }` on errors.

- [ ] **Step 1: Viết test mutation thất bại**

Thêm endpoint mong đợi:

```csharp
"PUT users/{id:int}/lock",
"PUT users/{id:int}/role"
```

Thêm các test hành vi:

```csharp
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
```

- [ ] **Step 2: Chạy test và xác nhận RED**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter "FullyQualifiedName~AdminUserManagementTests|FullyQualifiedName~AdminControllerArchitectureTests"`

Expected: FAIL vì hai action chưa tồn tại.

- [ ] **Step 3: Thêm helper cập nhật trong transaction**

Trong controller thêm:

```csharp
private async Task<IDbContextTransaction?> BeginGuardTransactionAsync()
{
    if (!context.Database.IsRelational()) return null;
    return await context.Database.BeginTransactionAsync(IsolationLevel.Serializable, HttpContext.RequestAborted);
}

private static AdminUserListItemDto ToDto(User user, int currentUserId) =>
    new(user.Id, user.Username, user.Email, user.Role, user.AvatarUrl,
        user.IsLocked, user.CreatedAt, user.Id == currentUserId);

private Task<int> CountActiveAdminsAsync() => context.Users.CountAsync(
    user => user.Role == "Admin" && !user.IsLocked,
    HttpContext.RequestAborted);
```

Thêm `using System.Data;` và `using Microsoft.EntityFrameworkCore.Storage;`.

- [ ] **Step 4: Thêm action đổi vai trò**

```csharp
[HttpPut("users/{id:int}/role")]
public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateUserRoleDto dto)
{
    var role = dto.Role.Trim();
    if (role is not ("User" or "Admin")) return BadRequest(new { message = "Vai trò không hợp lệ." });
    var currentUserId = HttpContext.Session.GetInt32("UserId")!.Value;
    await using var transaction = await BeginGuardTransactionAsync();
    var user = await context.Users.FindAsync([id], HttpContext.RequestAborted);
    if (user is null) return NotFound(new { message = "Không tìm thấy người dùng." });
    if (id == currentUserId && role == "User") return Conflict(new { message = "Bạn không thể tự hạ quyền tài khoản đang đăng nhập." });
    if (user.Role == "Admin" && role == "User" && !user.IsLocked && await CountActiveAdminsAsync() <= 1)
        return Conflict(new { message = "Không thể hạ quyền quản trị viên hoạt động cuối cùng." });
    user.Role = role;
    await context.SaveChangesAsync(HttpContext.RequestAborted);
    if (transaction is not null) await transaction.CommitAsync(HttpContext.RequestAborted);
    return Ok(ToDto(user, currentUserId));
}
```

- [ ] **Step 5: Thêm action khóa/mở khóa**

```csharp
[HttpPut("users/{id:int}/lock")]
public async Task<IActionResult> UpdateLock(int id, [FromBody] UpdateUserLockDto dto)
{
    var currentUserId = HttpContext.Session.GetInt32("UserId")!.Value;
    await using var transaction = await BeginGuardTransactionAsync();
    var user = await context.Users.FindAsync([id], HttpContext.RequestAborted);
    if (user is null) return NotFound(new { message = "Không tìm thấy người dùng." });
    if (id == currentUserId && dto.IsLocked) return Conflict(new { message = "Bạn không thể tự khóa tài khoản đang đăng nhập." });
    if (user.Role == "Admin" && !user.IsLocked && dto.IsLocked && await CountActiveAdminsAsync() <= 1)
        return Conflict(new { message = "Không thể khóa quản trị viên hoạt động cuối cùng." });
    user.IsLocked = dto.IsLocked;
    await context.SaveChangesAsync(HttpContext.RequestAborted);
    if (transaction is not null) await transaction.CommitAsync(HttpContext.RequestAborted);
    return Ok(ToDto(user, currentUserId));
}
```

- [ ] **Step 6: Chạy test và xác nhận GREEN**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter "FullyQualifiedName~AdminUserManagementTests|FullyQualifiedName~AdminControllerArchitectureTests"`

Expected: toàn bộ test mutation và architecture PASS.

- [ ] **Step 7: Commit**

```powershell
git add backend.Tests/AdminUserManagementTests.cs backend.Tests/AdminControllerArchitectureTests.cs backend/Controllers/AdminUsersController.cs
git commit -m "feat: safely manage user roles and locks"
```

---

### Task 4: Enforce locks in authentication and admin authorization

**Files:**
- Create: `backend.Tests/AuthLockingTests.cs`
- Modify: `backend/Controllers/AuthController.cs`
- Modify: `backend/Filters/RequireAdminAttribute.cs`

**Interfaces:**
- Consumes: `User.IsLocked`.
- Produces: login 403 for locked account; `/api/auth/me` clears session and returns 403; admin filter revalidates DB state.

- [ ] **Step 1: Viết test xác thực thất bại**

Tạo `AuthLockingTests.cs` với context InMemory và `TestSession`. Viết ba test:

```csharp
[Fact]
public async Task Login_ReturnsForbiddenForLockedAccount()
{
    await using var context = CreateContext();
    context.Users.Add(new User { Username = "locked", Email = "locked@test.local", PasswordHash = AuthService.HashPassword("Password1"), IsLocked = true });
    await context.SaveChangesAsync();
    var controller = CreateAuthController(context, new TestSession());

    var result = await controller.Login(new LoginDto { Username = "locked", Password = "Password1" });

    Assert.IsType<ObjectResult>(result);
    Assert.Equal(403, ((ObjectResult)result).StatusCode);
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
    var user = new User { Username = "former-admin", Email = "admin@test.local", Role = "User", IsLocked = false };
    context.Users.Add(user); context.SaveChanges();
    var authorizationContext = CreateAuthorizationContext(context, user.Id, "Admin");

    new RequireAdminAttribute().OnAuthorization(authorizationContext);

    Assert.Equal(403, Assert.IsType<ObjectResult>(authorizationContext.Result).StatusCode);
}
```

- [ ] **Step 2: Chạy test và xác nhận RED**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter FullyQualifiedName~AuthLockingTests`

Expected: locked login và session/filter tests FAIL vì production code chỉ tin session.

- [ ] **Step 3: Chặn tài khoản khóa trong login và `/me`**

Trong `Login`, ngay sau kiểm tra mật khẩu thành công và trước nâng cấp hash/session:

```csharp
if (user.IsLocked)
    return StatusCode(StatusCodes.Status403Forbidden, new { message = "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên." });
```

Trong `Me`, sau khi tìm user và xử lý `user == null`:

```csharp
if (user.IsLocked)
{
    HttpContext.Session.Clear();
    return StatusCode(StatusCodes.Status403Forbidden, new { message = "Tài khoản đã bị khóa." });
}
```

- [ ] **Step 4: Xác minh admin hiện tại bằng cơ sở dữ liệu**

Trong `RequireAdminAttribute.OnAuthorization`, sau kiểm tra `userId == null` và trước contributor exception, thêm:

```csharp
if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
{
    var db = context.HttpContext.RequestServices.GetRequiredService<MangaDbContext>();
    var activeAdmin = db.Users.AsNoTracking().Any(user =>
        user.Id == userId.Value && user.Role == "Admin" && !user.IsLocked);
    if (!activeAdmin)
    {
        context.HttpContext.Session.Clear();
        context.Result = isMvcRequest
            ? new RedirectToActionResult("Index", "Home", null)
            : new ObjectResult(new { message = "Phiên quản trị không còn hợp lệ." }) { StatusCode = 403 };
        return;
    }
}
```

Thêm `using Microsoft.EntityFrameworkCore;`.

- [ ] **Step 5: Chạy test và xác nhận GREEN**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter FullyQualifiedName~AuthLockingTests`

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend.Tests/AuthLockingTests.cs backend/Controllers/AuthController.cs backend/Filters/RequireAdminAttribute.cs
git commit -m "feat: enforce locked user sessions"
```

---

### Task 5: Integrated admin user pane and responsive theme styles

**Files:**
- Create: `backend.Tests/js/admin-user-management.test.cjs`
- Modify: `backend/Views/AdminView/Index.cshtml`
- Modify: `backend/wwwroot/css/style.css`

**Interfaces:**
- Produces DOM IDs: `adm-content-users`, `admin-user-search`, `admin-user-role`, `admin-user-status`, `admin-user-reset`, `admin-user-list`, `admin-user-summary`, `admin-user-pagination`.
- Consumes: `.admin-tab-btn`, `.admin-tab-pane`, `.form-control`, `.btn`, theme variables.

- [ ] **Step 1: Viết frontend contract test thất bại**

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const view = fs.readFileSync(path.join(root, 'backend/Views/AdminView/Index.cshtml'), 'utf8');
const css = fs.readFileSync(path.join(root, 'backend/wwwroot/css/style.css'), 'utf8');

test('admin user management is an integrated themed tab', () => {
  assert.match(view, /data-tab="users"/);
  assert.match(view, /id="adm-content-users"/);
  for (const id of ['admin-user-search', 'admin-user-role', 'admin-user-status', 'admin-user-reset', 'admin-user-list', 'admin-user-summary', 'admin-user-pagination']) {
    assert.match(view, new RegExp(`id="${id}"`));
  }
  assert.match(css, /\.admin-user-toolbar/);
  assert.match(css, /var\(--bg-card\)|var\(--bg-secondary\)/);
  assert.match(css, /@media\s*\(max-width:\s*768px\)/);
});

test('admin user module loads before the coordinator', () => {
  assert.ok(view.indexOf('/js/admin-users.js') > -1);
  assert.ok(view.indexOf('/js/admin-users.js') < view.indexOf('/js/admin.js'));
});
```

- [ ] **Step 2: Chạy test và xác nhận RED**

Run: `node --test backend.Tests/js/admin-user-management.test.cjs`

Expected: FAIL vì tab, pane và stylesheet chưa tồn tại.

- [ ] **Step 3: Thêm tab và pane**

Thêm vào menu quản lý:

```html
<button class="admin-tab-btn" data-tab="users">
  <i data-lucide="user-cog"></i><span>Quản lý người dùng</span>
</button>
```

Thêm pane vào cùng glass card:

```html
<div id="adm-content-users" class="admin-tab-pane" style="display:none;">
  <div class="admin-section-heading">
    <div><h3>Quản lý người dùng</h3><p>Tìm kiếm, phân quyền và kiểm soát trạng thái tài khoản.</p></div>
  </div>
  <div class="admin-user-toolbar">
    <label class="admin-user-search"><i data-lucide="search"></i><input id="admin-user-search" class="form-control" type="search" placeholder="Tìm theo tên đăng nhập hoặc email..." /></label>
    <select id="admin-user-role" class="form-control"><option value="">Tất cả vai trò</option><option value="User">User</option><option value="Admin">Admin</option></select>
    <select id="admin-user-status" class="form-control"><option value="">Tất cả trạng thái</option><option value="active">Hoạt động</option><option value="locked">Đã khóa</option></select>
    <button id="admin-user-reset" type="button" class="btn btn-secondary">Đặt lại</button>
  </div>
  <div id="admin-user-summary" class="admin-user-summary"></div>
  <div id="admin-user-list" class="admin-user-list"><div class="management-empty">Chọn tab để tải danh sách người dùng.</div></div>
  <div id="admin-user-pagination" class="catalog-pagination"></div>
</div>
```

Nạp module trước coordinator:

```html
<script src="/js/admin-users.js?v=1.0"></script>
<script src="/js/admin.js?v=3.9"></script>
```

- [ ] **Step 4: Thêm CSS dùng theme chung**

```css
.admin-user-toolbar { display:grid; grid-template-columns:minmax(240px,1fr) 170px 170px auto; gap:10px; margin-bottom:16px; }
.admin-user-search { position:relative; display:flex; align-items:center; }
.admin-user-search svg { position:absolute; left:12px; width:18px; color:var(--text-muted); }
.admin-user-search input { padding-left:40px; }
.admin-user-summary { color:var(--text-muted); font-size:.85rem; margin-bottom:10px; }
.admin-user-list { border:1px solid var(--border-subtle); border-radius:var(--radius-md); overflow:hidden; background:var(--bg-card); }
.admin-user-row { display:grid; grid-template-columns:minmax(220px,1.4fr) minmax(220px,1.4fr) 130px 130px 150px minmax(220px,auto); gap:12px; align-items:center; padding:13px 15px; border-bottom:1px solid var(--border-subtle); color:var(--text-main); }
.admin-user-row:last-child { border-bottom:0; }
.admin-user-identity { display:flex; align-items:center; gap:10px; min-width:0; }
.admin-user-avatar { width:38px; height:38px; border-radius:50%; object-fit:cover; background:var(--bg-secondary); }
.admin-user-actions { display:flex; justify-content:flex-end; gap:8px; }
.admin-user-badge { display:inline-flex; width:max-content; padding:4px 9px; border-radius:999px; background:var(--bg-secondary); color:var(--text-main); font-size:.78rem; font-weight:700; }
.admin-user-badge.locked { color:var(--danger); }
@media (max-width: 1100px) { .admin-user-toolbar { grid-template-columns:1fr 1fr; } .admin-user-row { grid-template-columns:1fr 1fr; } }
@media (max-width: 768px) { .admin-user-toolbar, .admin-user-row { grid-template-columns:1fr; } .admin-user-actions { justify-content:flex-start; flex-wrap:wrap; } }
```

- [ ] **Step 5: Chạy test và xác nhận GREEN**

Run: `node --test backend.Tests/js/admin-user-management.test.cjs`

Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend.Tests/js/admin-user-management.test.cjs backend/Views/AdminView/Index.cshtml backend/wwwroot/css/style.css
git commit -m "feat: add integrated admin user pane"
```

---

### Task 6: User management browser module

**Files:**
- Modify: `backend.Tests/js/admin-user-management.test.cjs`
- Create: `backend/wwwroot/js/admin-users.js`
- Modify: `backend/wwwroot/js/admin.js`

**Interfaces:**
- Produces global: `window.AdminUsers = { init, activate }`.
- Consumes global: `API_BASE`, `apiFetch`, `showToast`, `currentUser`, `adminEscapeHtml`, `lucide`.
- Consumes DOM IDs from Task 5 and API from Tasks 2–3.

- [ ] **Step 1: Viết module contract test thất bại**

Mở rộng test:

```javascript
const js = fs.readFileSync(path.join(root, 'backend/wwwroot/js/admin-users.js'), 'utf8');
const coordinator = fs.readFileSync(path.join(root, 'backend/wwwroot/js/admin.js'), 'utf8');

test('admin users use server pagination and guarded role/lock endpoints', () => {
  assert.match(js, /pageSize:\s*'20'/);
  assert.match(js, /\/admin\/users\?/);
  assert.match(js, /\/role/);
  assert.match(js, /\/lock/);
  assert.match(js, /setTimeout\([^,]+,\s*250\)/s);
  assert.match(js, /window\.AdminUsers\s*=\s*\{\s*init,\s*activate\s*\}/);
  assert.match(coordinator, /AdminUsers\?\.init\(\)/);
  assert.match(coordinator, /tabName\s*===\s*['"]users['"].*AdminUsers\?\.activate\(\)/s);
});
```

- [ ] **Step 2: Chạy test và xác nhận RED**

Run: `node --test backend.Tests/js/admin-user-management.test.cjs`

Expected: FAIL vì `admin-users.js` chưa tồn tại.

- [ ] **Step 3: Tạo state, query và renderer**

`admin-users.js` phải định nghĩa:

```javascript
(() => {
  const state = { initialized: false, loaded: false, loading: false, page: 1, pageSize: 20, totalPages: 1, timer: null };
  const value = id => document.getElementById(id)?.value.trim() || '';
  const escape = value => window.adminEscapeHtml ? window.adminEscapeHtml(value) : String(value ?? '');
  const formatDate = value => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value));

  async function load() {
    if (state.loading) return;
    state.loading = true;
    const root = document.getElementById('admin-user-list');
    if (root) root.innerHTML = '<div class="management-empty">Đang tải người dùng...</div>';
    const params = new URLSearchParams({ page: String(state.page), pageSize: '20', search: value('admin-user-search'), role: value('admin-user-role'), status: value('admin-user-status') });
    [...params.keys()].forEach(key => { if (!params.get(key)) params.delete(key); });
    try {
      const response = await apiFetch(`${API_BASE}/admin/users?${params}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Không thể tải danh sách người dùng.');
      state.loaded = true;
      state.page = payload.page || 1;
      state.totalPages = payload.totalPages || 1;
      renderRows(payload.items || []);
      renderSummary(payload.totalItems || 0);
      renderPagination();
    } catch (error) {
      if (root) root.innerHTML = `<div class="management-empty">${escape(error.message)}</div>`;
      showToast(error.message, false);
    } finally { state.loading = false; }
  }
```

Renderer mỗi dòng phải tạo select role, badge trạng thái và hai nút có các data attributes sau:

```javascript
data-user-role="${user.id}"
data-user-save-role="${user.id}"
data-user-toggle-lock="${user.id}"
```

Với `user.isCurrentUser`, disable select role, nút lưu vai trò và nút khóa. Avatar fallback dùng `/images/default-avatar.png` nếu `avatarUrl` trống.

- [ ] **Step 4: Nối mutation, pagination và debounce**

Mutation role:

```javascript
const response = await apiFetch(`${API_BASE}/admin/users/${id}/role`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role })
});
```

Mutation lock:

```javascript
const response = await apiFetch(`${API_BASE}/admin/users/${id}/lock`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isLocked })
});
```

Trước mutation hiển thị `confirm`; trong lúc gọi API disable các control của dòng; lỗi lấy `payload.message`, gọi `showToast(message, false)` và tải lại dòng/list để phục hồi trạng thái server. Thành công gọi `showToast(...)` rồi `await load()`.

Pagination tạo nút trước, tối đa năm số trang quanh trang hiện tại, và nút sau; click cập nhật `state.page` rồi gọi `load()`.

Khởi tạo và kích hoạt:

```javascript
function init() {
  if (state.initialized) return;
  state.initialized = true;
  document.getElementById('admin-user-search')?.addEventListener('input', () => {
    clearTimeout(state.timer);
    state.timer = setTimeout(() => { state.page = 1; load(); }, 250);
  });
  ['admin-user-role', 'admin-user-status'].forEach(id => document.getElementById(id)?.addEventListener('change', () => { state.page = 1; load(); }));
  document.getElementById('admin-user-reset')?.addEventListener('click', () => {
    ['admin-user-search', 'admin-user-role', 'admin-user-status'].forEach(id => { const element = document.getElementById(id); if (element) element.value = ''; });
    state.page = 1; load();
  });
}

function activate() { if (!state.loaded) load(); }
window.AdminUsers = { init, activate };
})();
```

- [ ] **Step 5: Nối module vào coordinator**

Trong callback `DOMContentLoaded`, sau `initAdminTabs()`:

```javascript
window.AdminUsers?.init();
```

Cuối `switchTab(tabName)`:

```javascript
if (tabName === 'users') window.AdminUsers?.activate();
```

- [ ] **Step 6: Chạy test và xác nhận GREEN**

Run: `node --test backend.Tests/js/admin-user-management.test.cjs`

Expected: 3 tests PASS.

- [ ] **Step 7: Commit**

```powershell
git add backend.Tests/js/admin-user-management.test.cjs backend/wwwroot/js/admin-users.js backend/wwwroot/js/admin.js backend/Views/AdminView/Index.cshtml
git commit -m "feat: connect admin user management UI"
```

---

### Task 7: Regression verification and cache consistency

**Files:**
- Modify only if required by failing tests: `backend.Tests/AdminControllerArchitectureTests.cs`, `backend/Views/AdminView/Index.cshtml`, `backend/wwwroot/js/admin-users.js`, `backend/wwwroot/css/style.css`

**Interfaces:**
- Verifies all interfaces produced in Tasks 1–6.

- [ ] **Step 1: Chạy toàn bộ JavaScript tests**

Run: `node --test backend.Tests/js`

Expected: all tests PASS, 0 failures.

- [ ] **Step 2: Chạy toàn bộ backend tests**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore`

Expected: all tests PASS, 0 failures.

- [ ] **Step 3: Build backend**

Run: `dotnet build backend/MangaNPK.csproj --no-restore`

Expected: build succeeded, 0 errors. Nếu server phát triển đang khóa DLL đầu ra, dùng output tạm rõ ràng:

```powershell
dotnet build backend/MangaNPK.csproj --no-restore -p:BaseOutputPath=D:\webdoctruyen\.tmp-user-management-build\
```

Sau khi xác minh, xóa đúng thư mục build tạm này và bảo đảm nó không được stage.

- [ ] **Step 4: Kiểm tra migration và diff**

Run: `dotnet ef migrations list --project backend/MangaNPK.csproj --startup-project backend/MangaNPK.csproj --no-connect`

Expected: `AddUserLockState` là migration mới nhất.

Run: `git diff --check`

Expected: không có whitespace errors.

- [ ] **Step 5: Kiểm tra thủ công trên localhost**

Mở `/admin`, xác nhận:

1. Chỉ tab “Quản lý người dùng” được tô màu khi chọn.
2. Search username/email, filter role/status và phân trang hoạt động.
3. Đổi role và khóa/mở khóa cập nhật toast và dòng dữ liệu.
4. Nút tự hạ quyền/tự khóa bị disable.
5. Tài khoản bị khóa không đăng nhập được.
6. Bố cục không tràn ở desktop và màn hình hẹp; light/dark mode dùng đúng surface của web.

- [ ] **Step 6: Commit sửa hồi quy nếu có**

Nếu không có file thay đổi sau kiểm thử, bỏ qua commit này. Nếu có sửa theo test thất bại:

```powershell
git add backend backend.Tests
git commit -m "test: verify admin user management"
```
