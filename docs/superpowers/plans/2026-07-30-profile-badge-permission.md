# Profile Badge Permission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent users from assigning their own profile badge while preserving administrator badge management and badge display.

**Architecture:** The public profile update contract will no longer accept a `Badge` field, and the profile controller will no longer write badges. Profile responses and the separate admin user-management contract remain unchanged, preserving display and administrator control.

**Tech Stack:** ASP.NET Core MVC, Entity Framework Core InMemory provider, xUnit, .NET 10

## Global Constraints

- `PUT /api/userprofile/me` must not expose a writable `Badge` property.
- Existing badges must remain visible in profile responses.
- Only the existing administrator user-management endpoint may write badges.
- Do not change badge display, badge validation rules, roles, or other administrator permissions.

---

### Task 1: Remove badge writes from the personal profile endpoint

**Files:**
- Modify: `backend.Tests/UserProfileSecurityTests.cs`
- Modify: `backend/Controllers/UserProfileController.cs`

**Interfaces:**
- Consumes: `UserProfileController.UpdateMyProfile(UpdateProfileDto dto)` and the existing admin `UpdateUserProfileDto.Badge`.
- Produces: an `UpdateProfileDto` with only `Email`, `Bio`, and `AvatarUrl`; personal profile updates leave `User.Badge` unchanged.

- [ ] **Step 1: Add failing security contract and regression tests**

Add these tests to `UserProfileSecurityTests`:

```csharp
[Fact]
public void UpdateProfileDto_DoesNotExposeBadge()
{
    Assert.Null(typeof(UpdateProfileDto).GetProperty("Badge"));
}

[Fact]
public async Task UpdateMyProfile_PreservesAdministratorAssignedBadge()
{
    await using var context = CreateContext();
    var user = new User
    {
        Username = "reader",
        Email = "reader@test.local",
        Badge = "VIP"
    };
    context.Users.Add(user);
    await context.SaveChangesAsync();
    var controller = CreateController(context, user.Id);

    var result = await controller.UpdateMyProfile(new UpdateProfileDto
    {
        Bio = "Updated bio"
    });

    Assert.IsType<OkObjectResult>(result);
    var savedUser = (await context.Users.FindAsync(user.Id))!;
    Assert.Equal("Updated bio", savedUser.Bio);
    Assert.Equal("VIP", savedUser.Badge);
}
```

- [ ] **Step 2: Run the targeted tests and verify the contract test fails**

Run:

```powershell
dotnet test backend.Tests/MangaNPK.Tests.csproj --configuration Release --no-restore --filter "FullyQualifiedName~UserProfileSecurityTests" --verbosity quiet
```

Expected: `UpdateProfileDto_DoesNotExposeBadge` fails because `UpdateProfileDto` currently contains a public `Badge` property.

- [ ] **Step 3: Remove the personal badge write path**

In `UserProfileController.UpdateMyProfile`, remove:

```csharp
if (!string.IsNullOrWhiteSpace(dto.Badge))
    user.Badge = dto.Badge.Trim();
```

Change `UpdateProfileDto` from:

```csharp
public class UpdateProfileDto
{
    public string? Email { get; set; }
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Badge { get; set; }
}
```

to:

```csharp
public class UpdateProfileDto
{
    public string? Email { get; set; }
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
}
```

Do not remove `Badge` from `UserProfileDto`, `AdminUserListItemDto`, or `UpdateUserProfileDto`.

- [ ] **Step 4: Run the targeted tests and verify they pass**

Run:

```powershell
dotnet test backend.Tests/MangaNPK.Tests.csproj --configuration Release --no-restore --filter "FullyQualifiedName~UserProfileSecurityTests" --verbosity quiet
```

Expected: all `UserProfileSecurityTests` pass.

- [ ] **Step 5: Verify admin badge management remains covered**

Run:

```powershell
dotnet test backend.Tests/MangaNPK.Tests.csproj --configuration Release --no-restore --filter "FullyQualifiedName~AdminUserManagementTests" --verbosity quiet
```

Expected: all `AdminUserManagementTests` pass, including `UpdateProfile_ChangesEditableUserFields`.

- [ ] **Step 6: Run the complete backend test suite and build**

Run:

```powershell
dotnet test backend.Tests/MangaNPK.Tests.csproj --configuration Release --no-restore --verbosity quiet
dotnet build backend/MangaNPK.csproj --configuration Release --no-restore
```

Expected: all tests pass; build completes with zero errors.

- [ ] **Step 7: Commit the security fix**

```powershell
git add -- backend.Tests/UserProfileSecurityTests.cs backend/Controllers/UserProfileController.cs
git commit -m "fix: restrict badge updates to administrators"
```
