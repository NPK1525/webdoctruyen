# Admin User Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict avatars to HTTPS URLs, let admins reset user passwords, and prevent users from changing their own email.

**Architecture:** Keep profile edits and password resets as separate API operations. Enforce every permission and validation rule on the server, then mirror those rules in the admin and profile interfaces for clear feedback.

**Tech Stack:** ASP.NET Core API/MVC, Entity Framework Core, browser JavaScript, xUnit, Node test runner.

## Global Constraints

- Avatar URLs must be empty or absolute `https://` URLs no longer than 2,048 characters.
- Admin password reset never requires the user's current password.
- User self-service profile updates cannot change email.
- Password hashes and plain-text passwords must never appear in API responses.
- Preserve all unrelated changes in the dirty worktree.

---

### Task 1: Server-side avatar and email rules

**Files:**
- Modify: `backend/Controllers/AdminUsersController.cs`
- Modify: `backend/Controllers/UserProfileController.cs`
- Test: `backend.Tests/AdminUserManagementTests.cs`
- Test: `backend.Tests/UserProfileSecurityTests.cs`

**Interfaces:**
- Consumes: `UpdateUserProfileDto.AvatarUrl`, `UpdateProfileDto.Email`.
- Produces: admin profile updates accepting only empty or HTTPS avatar URLs up to 2,048 characters; self-service email changes return `400`.

- [ ] **Step 1: Write failing tests**

Add xUnit tests proving that an HTTPS URL longer than 500 characters is accepted, HTTP/base64/over-2,048 URLs are rejected, and `/api/userprofile/me` cannot alter email.

- [ ] **Step 2: Verify RED**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter "AdminUserManagementTests|UserProfileSecurityTests" --no-restore`

Expected: failures caused by the current 500-character rule, missing HTTPS validation, and self-service email assignment.

- [ ] **Step 3: Implement validation**

Use `Uri.TryCreate(..., UriKind.Absolute, out var uri)` with `uri.Scheme == Uri.UriSchemeHttps`, accept blank avatar as removal, cap nonblank values at 2,048 characters, and return `400` when a self-service payload contains email.

- [ ] **Step 4: Verify GREEN**

Run the same focused .NET test command and expect all focused tests to pass.

### Task 2: Admin password reset API

**Files:**
- Modify: `backend/Contracts/Admin/UserManagementDtos.cs`
- Modify: `backend/Controllers/AdminUsersController.cs`
- Test: `backend.Tests/AdminUserManagementTests.cs`

**Interfaces:**
- Produces: `ResetUserPasswordDto` with `NewPassword` and `ConfirmPassword`.
- Produces: `PUT /api/admin/users/{id}/password`.

- [ ] **Step 1: Write failing reset tests**

Test successful reset without current password, mismatched confirmation, weak password, missing user, and response serialization without password data.

- [ ] **Step 2: Verify RED**

Run the focused admin user management tests and expect failures because the endpoint and DTO do not exist.

- [ ] **Step 3: Implement the endpoint**

Validate confirmation with ordinal comparison, validate strength through `AuthService.IsValidPassword`, hash through `AuthService.HashPassword`, save, and return only a success message.

- [ ] **Step 4: Verify GREEN**

Run the focused admin user management tests and expect all to pass.

### Task 3: Admin and profile interfaces

**Files:**
- Modify: `backend/Views/AdminView/UserDetail.cshtml`
- Modify: `backend/wwwroot/js/admin-user-detail.js`
- Modify: `backend/wwwroot/profile.html`
- Modify: `backend/wwwroot/js/profile.js`
- Test: `backend.Tests/js/admin-user-management.test.cjs`
- Test: `backend.Tests/js/admin-user-security.test.cjs`

**Interfaces:**
- Consumes: admin password endpoint and HTTPS avatar validation.
- Produces: separate password-reset form, 2,048-character avatar input, read-only profile email, and self-service payload without email.

- [ ] **Step 1: Write failing UI contract tests**

Assert the admin view has a separate reset form, password confirmation, avatar `maxlength="2048"`, profile email is readonly, and profile save omits email.

- [ ] **Step 2: Verify RED**

Run: `node --test backend.Tests/js/admin-user-management.test.cjs backend.Tests/js/admin-user-security.test.cjs`

Expected: failures because the new controls and behavior are absent.

- [ ] **Step 3: Implement the interfaces**

Submit password reset separately, clear both password fields on success, preserve them on errors, validate matching inputs client-side, render the email field readonly, and remove email from the self-service request body.

- [ ] **Step 4: Bust changed asset caches**

Increment `admin-user-detail.js` and `profile.js` query versions in their consumers.

- [ ] **Step 5: Verify GREEN**

Run the focused Node tests and expect all to pass.

### Task 4: Full verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes: all completed behavior.

- [ ] **Step 1: Run all JavaScript tests**

Run: `node --test backend.Tests/js`

Expected: all tests pass.

- [ ] **Step 2: Run all .NET tests**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore --verbosity quiet`

Expected: all tests pass.

- [ ] **Step 3: Build Release**

Run: `dotnet build backend/MangaNPK.csproj -c Release --no-restore --verbosity quiet`

Expected: zero errors and zero warnings.

- [ ] **Step 4: Check patch formatting**

Run: `git diff --check`

Expected: no whitespace errors.
