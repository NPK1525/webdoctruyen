# Profile Avatar Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users clear their avatar while preserving it when clients omit the avatar field.

**Architecture:** The profile API will use an empty string as an explicit clear command and `null` as no change. The profile form will send its trimmed input directly, and its script cache version will be bumped so browsers receive the behavior immediately.

**Tech Stack:** ASP.NET Core MVC, Entity Framework Core InMemory provider, xUnit, browser JavaScript, Node.js test runner

## Global Constraints

- Empty or whitespace-only `AvatarUrl` clears the saved avatar.
- Null or omitted `AvatarUrl` preserves the saved avatar.
- Valid HTTPS URL updates and invalid URL rejection remain unchanged.
- Administrator avatar management is unchanged.
- Badge editing and display are out of scope.

---

### Task 1: Define avatar clearing behavior with failing tests

**Files:**
- Modify: `backend.Tests/UserProfileSecurityTests.cs`
- Modify: `backend.Tests/js/avatar-sync.test.cjs`

**Interfaces:**
- Consumes: `UserProfileController.UpdateMyProfile(UpdateProfileDto dto)` and the profile form payload in `profile.js`.
- Produces: regression tests for blank-string clearing, null preservation, and frontend payload semantics.

- [ ] **Step 1: Add backend tests**

Add:

```csharp
[Fact]
public async Task UpdateMyProfile_BlankAvatarClearsExistingAvatar()
{
    await using var context = CreateContext();
    var user = new User
    {
        Username = "reader",
        Email = "reader@test.local",
        AvatarUrl = "https://cdn.test/avatar.png"
    };
    context.Users.Add(user);
    await context.SaveChangesAsync();
    var controller = CreateController(context, user.Id);

    var result = await controller.UpdateMyProfile(new UpdateProfileDto { AvatarUrl = "   " });

    Assert.IsType<OkObjectResult>(result);
    Assert.Null((await context.Users.FindAsync(user.Id))!.AvatarUrl);
}

[Fact]
public async Task UpdateMyProfile_NullAvatarPreservesExistingAvatar()
{
    await using var context = CreateContext();
    var user = new User
    {
        Username = "reader",
        Email = "reader@test.local",
        AvatarUrl = "https://cdn.test/avatar.png"
    };
    context.Users.Add(user);
    await context.SaveChangesAsync();
    var controller = CreateController(context, user.Id);

    var result = await controller.UpdateMyProfile(new UpdateProfileDto
    {
        AvatarUrl = null,
        Bio = "Updated bio"
    });

    Assert.IsType<OkObjectResult>(result);
    var savedUser = (await context.Users.FindAsync(user.Id))!;
    Assert.Equal("https://cdn.test/avatar.png", savedUser.AvatarUrl);
    Assert.Equal("Updated bio", savedUser.Bio);
}
```

- [ ] **Step 2: Add frontend contract assertions**

Add to `backend.Tests/js/avatar-sync.test.cjs`:

```javascript
test('profile sends an empty avatar string as an explicit clear command', () => {
  assert.match(profile, /avatarUrl:\s*avatarUrl,/);
  assert.doesNotMatch(profile, /avatarUrl:\s*avatarUrl\s*\|\|\s*null/);
});
```

- [ ] **Step 3: Run tests and verify the clear tests fail**

Run:

```powershell
dotnet test backend.Tests/MangaNPK.Tests.csproj --configuration Release --no-restore --filter "FullyQualifiedName~UserProfileSecurityTests" --verbosity quiet
node --test backend.Tests/js/avatar-sync.test.cjs
```

Expected: blank avatar remains unchanged and the frontend contract still finds `avatarUrl || null`.

---

### Task 2: Implement avatar clearing and cache refresh

**Files:**
- Modify: `backend/Controllers/UserProfileController.cs`
- Modify: `backend/wwwroot/js/profile.js`
- Modify: `backend/Views/ProfileView/Index.cshtml`
- Test: `backend.Tests/UserProfileSecurityTests.cs`
- Test: `backend.Tests/js/avatar-sync.test.cjs`

**Interfaces:**
- Consumes: nullable `UpdateProfileDto.AvatarUrl`.
- Produces: null persistence for explicit blank strings and unchanged persistence for null.

- [ ] **Step 1: Implement tri-state avatar handling**

Replace:

```csharp
if (!string.IsNullOrWhiteSpace(dto.AvatarUrl))
    user.AvatarUrl = dto.AvatarUrl.Trim();
```

with:

```csharp
if (dto.AvatarUrl is not null)
    user.AvatarUrl = string.IsNullOrWhiteSpace(dto.AvatarUrl)
        ? null
        : dto.AvatarUrl.Trim();
```

- [ ] **Step 2: Send the avatar input directly**

In `profile.js`, replace:

```javascript
avatarUrl: avatarUrl || null,
```

with:

```javascript
avatarUrl,
```

- [ ] **Step 3: Bump the profile script cache version**

Change the profile page script reference from `profile.js?v=1.3` to
`profile.js?v=1.4`, and update the existing avatar-sync contract assertion to
expect `profile.js?v=1.4`.

- [ ] **Step 4: Run targeted backend and frontend tests**

Run:

```powershell
dotnet test backend.Tests/MangaNPK.Tests.csproj --configuration Release --no-restore --filter "FullyQualifiedName~UserProfileSecurityTests" --verbosity quiet
node --test backend.Tests/js/avatar-sync.test.cjs
```

Expected: all targeted tests pass.

- [ ] **Step 5: Run regression tests and build**

Run:

```powershell
dotnet test backend.Tests/MangaNPK.Tests.csproj --configuration Release --no-restore --filter "FullyQualifiedName!~SourceEncodingTests" --verbosity quiet
node --test backend.Tests/js
dotnet build backend/MangaNPK.csproj --configuration Release --no-restore
```

Expected: all selected backend and JavaScript tests pass; build completes with zero errors.

- [ ] **Step 6: Review intended changes**

Run:

```powershell
git diff --check
git diff -- backend/Controllers/UserProfileController.cs backend/wwwroot/js/profile.js backend/Views/ProfileView/Index.cshtml backend.Tests/UserProfileSecurityTests.cs backend.Tests/js/avatar-sync.test.cjs
```

Do not stage or alter `appthoitrang_ascii/` or unrelated fuzzy/rating changes.
