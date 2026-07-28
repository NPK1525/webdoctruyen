# Shared Avatar Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display a user's saved profile avatar consistently in the shared header, account dropdown, and comments, with an icon fallback.

**Architecture:** Extend existing authentication and comment JSON responses with `avatarUrl`. Keep rendering in the existing shared JavaScript modules, validate image URLs before inserting them, and refresh the shared user state immediately after a profile update.

**Tech Stack:** ASP.NET Core MVC/API, Entity Framework Core, browser JavaScript, Node test runner, xUnit.

## Global Constraints

- Preserve the existing icon when an avatar is absent, unsafe, or fails to load.
- Do not add database schema changes because `User.AvatarUrl` already exists.
- Do not modify unrelated work in the dirty worktree.

---

### Task 1: Avatar API contracts

**Files:**
- Modify: `backend/Controllers/AuthController.cs`
- Modify: `backend/Controllers/CommentsController.cs`
- Test: `backend.Tests/AvatarApiContractTests.cs`

**Interfaces:**
- Produces: `user.avatarUrl` from register, login, and `/api/auth/me`.
- Produces: `comment.avatarUrl` from all comment read/write responses.

- [ ] **Step 1: Write failing API contract tests**

Assert that auth user projections and `CommentDto` expose `AvatarUrl`, and that comment projections assign it from the related user.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter AvatarApiContractTests --no-restore`

Expected: failures because the response contracts do not yet include avatar data.

- [ ] **Step 3: Add the minimal API properties and projections**

Add `avatarUrl = user.AvatarUrl` to auth payloads and `AvatarUrl` to `CommentDto`, including list, detail, create, and update projections.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter AvatarApiContractTests --no-restore`

Expected: all focused tests pass.

### Task 2: Shared avatar rendering and live profile refresh

**Files:**
- Modify: `backend/wwwroot/js/common.js`
- Modify: `backend/wwwroot/js/profile.js`
- Modify: `backend/wwwroot/js/detail-comments.js`
- Test: `backend.Tests/js/avatar-sync.test.cjs`

**Interfaces:**
- Produces: `renderUserAvatar(avatarUrl, size, iconSize)` for safe reusable avatar markup.
- Consumes: `currentUser.avatarUrl` and `comment.avatarUrl`.

- [ ] **Step 1: Write failing browser contract tests**

Assert that header and dropdown call the shared renderer, comments consume `comment.avatarUrl`, and profile save updates shared user state and re-renders the header.

- [ ] **Step 2: Run the focused JavaScript test and verify RED**

Run: `node --test backend.Tests/js/avatar-sync.test.cjs`

Expected: failures because shared avatar rendering and refresh are missing.

- [ ] **Step 3: Implement safe avatar markup and fallback behavior**

Allow only absolute HTTP(S) or root-relative URLs, escape attribute values, use `onerror` to hide a failed image and reveal the Lucide fallback icon, and reuse this output in both header locations and comments.

- [ ] **Step 4: Synchronize state after profile save**

Copy the returned `avatarUrl` into `currentUser`, persist it in `localStorage`, and call `renderHeaderUserArea()`.

- [ ] **Step 5: Run the focused JavaScript test and verify GREEN**

Run: `node --test backend.Tests/js/avatar-sync.test.cjs`

Expected: all focused tests pass.

### Task 3: Full verification

**Files:**
- Verify only; no new production files.

**Interfaces:**
- Consumes: completed API and browser avatar behavior.

- [ ] **Step 1: Run all JavaScript tests**

Run: `node --test backend.Tests/js`

Expected: all tests pass.

- [ ] **Step 2: Run all .NET tests**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore --verbosity quiet`

Expected: all tests pass.

- [ ] **Step 3: Build the application**

Run: `dotnet build backend/MangaNPK.csproj -c Release --no-restore --verbosity quiet`

Expected: build succeeds without errors.

- [ ] **Step 4: Check patch formatting**

Run: `git diff --check`

Expected: no whitespace errors.
