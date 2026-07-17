# MDList MVC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the static MDList screen with an MVC MangaDex-style My MDLists flow.

**Architecture:** Add an MVC view/controller at `/lists`, preserve existing `/api/mangalist` persistence, and implement the editor/title-picker behavior in a focused page script. Redirect legacy `/lists.html` to `/lists` before static files.

**Tech Stack:** ASP.NET Core MVC, Razor, vanilla JavaScript, existing MangaNPK catalog/List APIs, xUnit, Node test runner.

## Global Constraints

- No Followed MDLists tab.
- Preserve current dark/orange interface system.
- Use MVC `_Header`, `_Sidebar`, and `_AuthModal`.
- Keep existing list API contracts unless a missing title-search endpoint is proven.
- Do not commit the dirty workspace.

### Task 1: Characterize current contracts

**Files:** `backend.Tests/js/mdlist-mvc-contract.test.cjs`, `backend.Tests/MangaListControllerArchitectureTests.cs`

- [ ] Add failing source tests for `/lists` MVC view, no Followed tab, Public/Private options, title-picker controls, sort values, and legacy redirect.
- [ ] Run focused Node/.NET tests and confirm the expected failures.

### Task 2: MVC route and page shell

**Files:** `backend/Controllers/MangaListsViewController.cs`, `backend/Views/MangaListsView/Index.cshtml`, `backend/Program.cs`

- [ ] Add authenticated MVC `/lists` action using shared partials and login state.
- [ ] Add the MangaDex-style overview/editor/title-picker shell without Followed MDLists.
- [ ] Add legacy `/lists.html` redirect to `/lists`.
- [ ] Run Razor compilation and focused controller tests.

### Task 3: MDList page behavior

**Files:** `backend/wwwroot/js/mdlists.js`, `backend/wwwroot/css/mdlists.css`

- [ ] Implement overview loading, card rendering, create/edit state, Public/Private dropdown, and API payloads.
- [ ] Implement title search, debounced catalog requests, selection, remove, sort options, and list/compact/grid controls.
- [ ] Add pagination/empty/loading/error states without changing global navigation.
- [ ] Run focused Node tests until green.

### Task 4: Link and cache integration

**Files:** `backend/wwwroot/js/common.js`, all common.js consumers, relevant i18n files

- [ ] Point account/sidebar MDList links to `/lists`.
- [ ] Bump the shared cache version once after the final script is stable.
- [ ] Verify no Followed MDLists markup or stale `lists.html` navigation remains.

### Task 5: Full verification

- [ ] Run `node --test backend.Tests/js`.
- [ ] Run `dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore`.
- [ ] Run `dotnet build backend/MangaNPK.csproj -c Release --no-restore`.
- [ ] Smoke-check `/lists`, `/lists.html`, create/edit, visibility, title search, and sort behavior.
