# Chapter View Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store, increment, return, and display a distinct read count for every manga chapter.

**Architecture:** Add a zero-defaulted `Chapter.ViewCount` column. Extend the existing manga view endpoint to increment the manga and selected chapter under the same session-deduplication rule, then project the chapter value through detail and update DTOs to the shared frontend renderers.

**Tech Stack:** ASP.NET Core MVC/API, Entity Framework Core, SQL Server migrations, Razor, browser JavaScript, xUnit, Node.js test runner.

## Global Constraints

- Preserve all existing `Manga.ViewCount` values.
- Initialize existing `Chapter.ViewCount` values to `0`.
- Count one read per manga/chapter pair per session.
- Reject mismatched manga/chapter identifiers without changing counts.
- Keep Library Updates and Latest Updates on the shared renderer.

---

### Task 1: Persist and increment chapter views

**Files:**
- Modify: `backend/Models/Chapter.cs`
- Modify: `backend/Controllers/MangaController.cs`
- Create: `backend/Migrations/20260802000000_AddChapterViewCount.cs`
- Modify: `backend/Migrations/MangaDbContextModelSnapshot.cs`
- Create: `backend.Tests/ChapterViewCountTests.cs`

**Interfaces:**
- Produces: `Chapter.ViewCount : int`
- Produces: `POST /api/manga/{id}/view?chapterId={chapterId}` response `{ viewCount, chapterViewCount }`

- [ ] Write tests asserting the property exists, the migration uses default `0`, a valid first read increments both counters, and a duplicate session read does not.
- [ ] Run `dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --filter ChapterViewCountTests` and verify failure because the field is absent.
- [ ] Add the property, migration, snapshot entry, and minimal endpoint increment.
- [ ] Run the focused backend tests and verify they pass.

### Task 2: Project per-chapter counts

**Files:**
- Modify: `backend/Controllers/MangaController.cs`
- Modify: `backend/Services/FollowedUpdatesService.cs`
- Modify: `backend/Views/MangaView/Detail.cshtml`
- Modify: `backend/Views/ChapterView/Read.cshtml`
- Modify: `backend.Tests/FollowedUpdatesServiceTests.cs`

**Interfaces:**
- Consumes: `Chapter.ViewCount`
- Produces: chapter JSON property `viewCount`
- Produces: `FollowedUpdateItem.ViewCount` sourced from the chapter

- [ ] Write failing contract/query tests for chapter projections and update-query source.
- [ ] Run the focused tests and verify the old manga-wide projection fails them.
- [ ] Change all chapter projections to include `c.ViewCount` and change the updates service to use `chapter.ViewCount`.
- [ ] Run the focused tests and verify they pass.

### Task 3: Display chapter counts

**Files:**
- Modify: `backend/wwwroot/js/detail.js`
- Modify: `backend/wwwroot/js/reader.js`
- Modify: `backend/wwwroot/js/updates.js`
- Modify: `backend/Views/MangaView/Detail.cshtml`
- Modify: `backend/Views/ChapterView/Read.cshtml`
- Test: `backend.Tests/js/detail-module-contract.test.cjs`
- Test: `backend.Tests/js/followed-updates-contract.test.cjs`

**Interfaces:**
- Consumes: chapter `viewCount`
- Produces: an eye icon and compact count in each detail chapter row

- [ ] Write failing frontend tests proving detail rows use `c.viewCount` and update rows use `item.viewCount`.
- [ ] Run the focused Node tests and verify the detail assertion fails.
- [ ] Render the count, update the current chapter value from `chapterViewCount`, and bump affected script cache versions.
- [ ] Run the focused and full Node suites.

### Task 4: Full verification

- [ ] Run all Node tests under `backend.Tests/js`.
- [ ] Run backend tests in Release, excluding only the known inaccessible external `appthoitrang_ascii` encoding scan if necessary.
- [ ] Run `dotnet build backend/MangaNPK.csproj -c Release --no-restore`.
- [ ] Run `git diff --check` and review the final diff for unrelated files.
