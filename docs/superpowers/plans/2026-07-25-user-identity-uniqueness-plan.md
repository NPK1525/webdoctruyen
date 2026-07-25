# User Identity Uniqueness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Enforce case-insensitive unique usernames and email addresses in the database and every account-management flow, with clear conflict responses.

**Architecture:** Persist invariant-uppercase normalized identity columns on `User`, normalize centrally in `MangaDbContext`, and enforce uniqueness with SQL Server indexes. Controllers perform fast prechecks and map duplicate-key save failures so concurrent requests cannot produce 500 errors.

**Tech Stack:** ASP.NET Core, Entity Framework Core, SQL Server, xUnit, Node.js source tests.

## Global Constraints

- Never delete or rename existing duplicate accounts automatically.
- Migration must stop with a descriptive error before unique indexes are created when legacy duplicates exist.
- Preserve display casing in `Username` and the normalized lowercase display form currently used for `Email`.
- Run the full JavaScript and .NET test suites before completion.

---

### Task 1: Add normalized identity fields and model indexes

**Files:**
- Modify: `backend/Models/User.cs`
- Modify: `backend/Data/MangaDbContext.cs`
- Test: `backend.Tests/UserIdentityUniquenessTests.cs`

- [ ] **Step 1: Write failing model tests**

Add tests that assert `User` exposes `NormalizedUsername` and `NormalizedEmail`, and that the EF model metadata contains unique indexes named `IX_Users_NormalizedUsername` and `IX_Users_NormalizedEmail`.

- [ ] **Step 2: Run the focused test**

Run `dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore --filter FullyQualifiedName~UserIdentityUniquenessTests` and confirm it fails because the properties and indexes do not exist.

- [ ] **Step 3: Implement the model metadata**

Add the two string properties to `User`. In `OnModelCreating`, configure max lengths and unique indexes named `IX_Users_NormalizedUsername` and `IX_Users_NormalizedEmail`.

- [ ] **Step 4: Run the focused test**

Confirm the focused test passes.

- [ ] **Step 5: Commit**

Run `git add backend/Models/User.cs backend/Data/MangaDbContext.cs backend.Tests/UserIdentityUniquenessTests.cs` and commit with `feat: add normalized user identity fields`.

### Task 2: Create the safe backfill migration

**Files:**
- Create: `backend/Migrations/20260725090000_AddNormalizedUserIdentity.cs`
- Create: `backend/Migrations/20260725090000_AddNormalizedUserIdentity.Designer.cs`
- Modify: `backend/Migrations/MangaDbContextModelSnapshot.cs`
- Test: `backend.Tests/UserIdentityMigrationTests.cs`

- [ ] **Step 1: Write failing migration tests**

Assert the migration contains backfill expressions using `LTRIM/RTRIM` and `UPPER`, duplicate detection for both normalized columns, a `THROW` before index creation, and unique indexes for both columns.

- [ ] **Step 2: Run the focused test and verify failure**

Run `dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore --filter FullyQualifiedName~UserIdentityMigrationTests` and confirm the expected migration is absent.

- [ ] **Step 3: Generate and edit the migration**

Generate the EF migration, then add SQL that fills normalized values, checks duplicate groups and throws a descriptive error before adding either unique index. Use nullable-safe SQL for existing rows and remove any temporary default after backfill.

- [ ] **Step 4: Run focused migration tests**

Confirm the migration tests pass and `dotnet build backend/MangaNPK.csproj --no-restore` succeeds.

- [ ] **Step 5: Commit**

Commit the migration and tests with `feat: enforce unique normalized user identities`.

### Task 3: Normalize all user writes centrally

**Files:**
- Modify: `backend/Data/MangaDbContext.cs`
- Test: `backend.Tests/UserIdentityNormalizationTests.cs`

- [ ] **Step 1: Write failing insert/update tests**

Create an in-memory context, save a user with padded mixed-case username/email, then assert normalized fields contain trimmed invariant-uppercase values. Modify the same user and assert the values are refreshed.

- [ ] **Step 2: Run focused tests and confirm failure**

Run `dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore --filter FullyQualifiedName~UserIdentityNormalizationTests`.

- [ ] **Step 3: Implement centralized normalization**

Override `SaveChangesAsync` (and synchronous `SaveChanges`) or use a shared pre-save method that visits added/modified `User` entities and sets `NormalizedUsername = Username.Trim().ToUpperInvariant()` and `NormalizedEmail = Email.Trim().ToUpperInvariant()`.

- [ ] **Step 4: Run focused tests**

Confirm insert and update normalization tests pass.

- [ ] **Step 5: Commit**

Commit with `feat: normalize user identities on save`.

### Task 4: Update authentication and admin validation

**Files:**
- Modify: `backend/Controllers/AuthController.cs`
- Modify: `backend/Controllers/AdminUsersController.cs`
- Modify: `backend/Services/PasswordResetService.cs`
- Test: `backend.Tests/AuthIdentityUniquenessTests.cs`
- Test: `backend.Tests/AdminUserManagementTests.cs`

- [ ] **Step 1: Write failing behavior tests**

Cover registration with casing/whitespace duplicate username and email, login with different username/email casing, password reset lookup with email casing differences, and admin edits that conflict with another user’s normalized identity.

- [ ] **Step 2: Run focused tests and verify failure**

Run `dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore --filter FullyQualifiedName~AuthIdentityUniquenessTests` and the duplicate admin tests; confirm the new normalized-field cases fail.

- [ ] **Step 3: Implement normalized queries and prechecks**

Normalize request values once, query normalized columns, exclude the current user in admin edits, and keep display values separate from normalized values.

- [ ] **Step 4: Run focused tests**

Confirm all registration, login, reset, and admin duplicate tests pass.

- [ ] **Step 5: Commit**

Commit with `feat: use normalized identities across account flows`.

### Task 5: Map SQL duplicate-key errors to friendly responses

**Files:**
- Create: `backend/Services/UserIdentityConflict.cs`
- Modify: `backend/Controllers/AuthController.cs`
- Modify: `backend/Controllers/AdminUsersController.cs`
- Test: `backend.Tests/UserIdentityConflictTests.cs`

- [ ] **Step 1: Write failing detector/controller tests**

Test SQL Server numbers 2601 and 2627 are recognized, index names identify username versus email, and a conflict response contains the corresponding Vietnamese message.

- [ ] **Step 2: Run focused tests and verify failure**

Run `dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore --filter FullyQualifiedName~UserIdentityConflictTests`.

- [ ] **Step 3: Implement conflict mapping**

Add a small detector that walks `DbUpdateException.InnerException`, recognizes SQL error numbers 2601/2627 and normalized index names, and returns a typed conflict result. Catch it around registration and admin profile saves; return `BadRequest` for registration and `Conflict` for admin editing with “Tên đăng nhập đã tồn tại.” or “Email đã được sử dụng.”.

- [ ] **Step 4: Run focused tests**

Confirm detector and controller tests pass without swallowing unrelated database errors.

- [ ] **Step 5: Commit**

Commit with `feat: handle duplicate identity database errors`.

### Task 6: Full verification and migration review

**Files:**
- Review: all files changed by Tasks 1–5

- [ ] **Step 1: Run source and integration tests**

Run `node --test backend.Tests/js` and `dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore`.

- [ ] **Step 2: Build the application**

Run `dotnet build backend/MangaNPK.csproj --no-restore` and confirm zero errors and warnings.

- [ ] **Step 3: Review migration safety**

Inspect the generated SQL/migration ordering to confirm duplicate detection executes before either unique index and no delete/update statement changes display identity values.

- [ ] **Step 4: Check repository hygiene**

Run `git diff --check` and `git status --short`.

- [ ] **Step 5: Commit verification if needed**

Only commit additional verification fixes if tests reveal a real issue; otherwise leave the working tree clean with the feature commits from Tasks 1–5.
