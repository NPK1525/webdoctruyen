# Followed Updates MVC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a personalized MVC updates page containing chapters from every manga in the signed-in user's Library.

**Architecture:** Add a focused MVC controller and view for `/follow-updates`. Keep the global `/updates` controller unchanged, reuse its client renderer, and separate the two sidebar routes in shared navigation.

**Tech Stack:** ASP.NET Core MVC, Entity Framework Core, Razor, vanilla JavaScript, xUnit, Node test runner.

## Global Constraints

- Use MVC `_Header`, `_Sidebar`, and `_AuthModal` partials.
- Include every Library reading status.
- Do not change `/updates` global behavior.
- Preserve the current visual layout and do not restore notification, report, or subscription UI.
- Do not commit because the workspace contains unrelated uncommitted work.

---

### Task 1: Personalized update query

**Files:**
- Create: `backend/Services/FollowedUpdatesService.cs`
- Test: `backend.Tests/FollowedUpdatesServiceTests.cs`

**Interfaces:**
- Consumes: `MangaDbContext`, authenticated `userId`, cancellation token.
- Produces: `Task<IReadOnlyList<FollowedUpdateItem>> GetAsync(int userId, int limit, CancellationToken cancellationToken)`.

- [ ] Write a failing EF-backed test proving only chapters from the current user's Library are returned, all statuses are included, and results are newest-first.
- [ ] Run `dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore --filter FullyQualifiedName~FollowedUpdatesServiceTests` and confirm failure because the service does not exist.
- [ ] Implement a no-tracking projection filtered through `UserMangaLibraries.Any(...)`, ordered by `UploadedAt`, limited to 100 rows.
- [ ] Run the focused test and confirm it passes.

### Task 2: MVC route and view

**Files:**
- Create: `backend/Controllers/FollowedUpdatesViewController.cs`
- Create: `backend/Views/FollowedUpdatesView/Index.cshtml`
- Modify: `backend/Program.cs`
- Test: `backend.Tests/FollowedUpdatesViewControllerTests.cs`

**Interfaces:**
- Consumes: `FollowedUpdatesService.GetAsync` and session key `UserId`.
- Produces: `GET /follow-updates`, `ViewBag.IsAuthenticated`, and `ViewBag.UpdatesJson`.

- [ ] Write failing controller tests for signed-out and signed-in requests.
- [ ] Register the service and add the controller action.
- [ ] Add a Razor view using `_Header`, `_Sidebar`, `_AuthModal`, the current update-card renderer, login prompt, and personalized empty state.
- [ ] Run focused controller tests and confirm they pass.

### Task 3: Separate sidebar destinations

**Files:**
- Modify: `backend/wwwroot/js/common.js`
- Modify: `backend.Tests/js/common-auth-contract.test.cjs`

**Interfaces:**
- Produces: `nav-updates-btn -> /follow-updates`; `nav-latest-updates-btn -> /updates`.

- [ ] Add a failing source-contract test asserting the two routes are distinct and active-state mapping recognizes `/follow-updates`.
- [ ] Change only the personalized update handler and active-state mapping.
- [ ] Bump the shared `common.js` cache version across its consumers.
- [ ] Run `node --test backend.Tests/js` and confirm all JavaScript tests pass.

### Task 4: Full verification

**Files:**
- Verify only; no production edits unless a test exposes a defect.

- [ ] Run `node --test backend.Tests/js`.
- [ ] Run `dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore`.
- [ ] Run `dotnet build backend/MangaNPK.csproj -c Release --no-restore`.
- [ ] Confirm `/follow-updates` and `/updates` resolve to different MVC endpoints without changing the existing layout.
