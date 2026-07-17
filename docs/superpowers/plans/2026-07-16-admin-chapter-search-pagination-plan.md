# Admin Chapter Search And Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make admin chapter selection usable for large catalogs by adding manga search, server-side chapter search/pagination, and quick filters for author/genre management tables.

**Architecture:** The existing manga endpoint supplies search results for a bounded manga picker. A new admin chapter endpoint queries only one chapter page at a time and returns metadata for pagination. Author and genre management pages keep their existing forms/actions and filter already-rendered rows in the browser.

**Tech Stack:** ASP.NET Core, Entity Framework Core, Razor, vanilla JavaScript, Node.js tests.

## Global Constraints

- Preserve current admin colors, spacing, labels, and form submission behavior.
- Default chapter page size is 20.
- Search must not load all chapters into the browser.
- Do not change chapter upload/edit authorization or payloads.
- Do not commit the dirty working tree.

---

### Task 1: Chapter query contract

**Files:** `backend/Services/ChapterAdminService.cs`, `backend/Controllers/AdminChapterController.cs`, `backend.Tests/js/admin-chapter-edit.test.cjs`

- [ ] Add a failing contract for the endpoint path, search parameters, and page metadata.
- [ ] Run the focused test and confirm RED.
- [ ] Add `GetPageAsync(mangaId, search, page, pageSize, cancellationToken)` using `Skip/Take`, ordered by chapter number descending.
- [ ] Add `GET api/admin/manga/{mangaId}/chapters` returning `items`, `page`, `pageSize`, `totalItems`, and `totalPages`.
- [ ] Run focused tests and confirm GREEN.

### Task 2: Admin chapter picker

**Files:** `backend/Views/AdminView/Index.cshtml`, `backend/wwwroot/js/admin.js`, `backend/wwwroot/css/style.css`

- [ ] Add a compact manga search input and result list beside the existing chapter form.
- [ ] Keep the selected manga in the existing `chapter-form-manga-select` field for compatibility with submit/edit code.
- [ ] Add chapter search input, 20-item result window, and pagination controls to `chapter-list-panel`.
- [ ] Update JavaScript to query manga search and the paginated chapter endpoint; reset page to 1 when search or manga changes.
- [ ] Keep existing edit buttons and chapter payload behavior unchanged.

### Task 3: Author and genre quick search

**Files:** `backend/Views/AdminView/Authors.cshtml`, `backend/Views/AdminView/Genres.cshtml`

- [ ] Add one search input above each existing table.
- [ ] Add a small script that filters rows by visible name/slug without changing create/delete forms.
- [ ] Preserve empty-state and anti-forgery behavior.

### Task 4: Verification

- [ ] Run all JavaScript tests.
- [ ] Run backend tests without rebuilding if the active debugger locks Debug DLLs.
- [ ] Build Release with zero errors.
- [ ] Run `git diff --check` on changed files.
