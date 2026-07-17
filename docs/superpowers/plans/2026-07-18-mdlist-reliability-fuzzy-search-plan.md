# MDList Reliability and Fuzzy Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make MDList create/edit/delete reliable, align its empty and populated states with the supplied references, and add accent-insensitive partial and typo-tolerant title search.

**Architecture:** Keep the MVC page and vanilla JavaScript coordinator, but persist the complete MDList aggregate through transactional create/update endpoints. Add a focused fuzzy-ranking service behind the existing catalog endpoint and let the picker request server-side sorting and pagination.

**Tech Stack:** ASP.NET Core MVC .NET 10, Entity Framework Core SQL Server, Razor, vanilla JavaScript, xUnit, Node test runner.

## Global Constraints

- Keep the existing ASP.NET Core MVC, Razor, EF Core, and vanilla JavaScript architecture.
- Preserve `/lists` and the shared header, sidebar, and authentication modal.
- Do not add a frontend framework or a separate search service.
- Preserve existing item endpoints for compatibility.
- Do not commit the dirty workspace.

---

### Task 1: Transactional MDList aggregate persistence

**Files:**
- Modify: `backend/Controllers/MangaListController.cs`
- Create: `backend/Services/MangaListService.cs`
- Create: `backend.Tests/MangaListServiceTests.cs`
- Modify: `backend/Program.cs`

**Interfaces:**
- Produces: `MangaListSaveRequest` with `Name`, `Description`, `IsPublic`, and `List<int> MangaIds`.
- Produces: `MangaListService.CreateAsync(int userId, MangaListSaveRequest request)` and `UpdateAsync(int listId, int userId, MangaListSaveRequest request)`.
- Produces: create/update API responses containing the saved list ID.

- [ ] Write service tests proving create stores the exact ordered IDs, update adds/removes/reorders items, invalid IDs make no changes, and another user cannot update a list.
- [ ] Run `dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --filter FullyQualifiedName~MangaListServiceTests --no-restore` and verify the new tests fail because the service does not exist.
- [ ] Implement request validation and transactional aggregate persistence in `MangaListService`.
- [ ] Register the service and change POST/PUT controller actions to use it while keeping legacy item endpoints.
- [ ] Run the focused tests and verify they pass.

### Task 2: Ownership and private-list protection

**Files:**
- Modify: `backend/Controllers/MangaListController.cs`
- Create: `backend.Tests/MangaListControllerSecurityTests.cs`

**Interfaces:**
- Consumes: session user ID and existing `MangaLists.UserId` ownership.
- Produces: owner-only membership checks and `403 Forbid` responses for authenticated non-owners.

- [ ] Write tests for private-list reads, membership checks, update, and delete by non-owners.
- [ ] Run the focused test filter and verify failures identify the missing ownership guard.
- [ ] Apply one shared owner lookup/guard path to private reads and membership checks.
- [ ] Run focused security tests and service tests until green.

### Task 3: Fuzzy title ranking and complete sort mapping

**Files:**
- Create: `backend/Services/MangaSearchRanking.cs`
- Create: `backend.Tests/MangaSearchRankingTests.cs`
- Modify: `backend/Controllers/MangaController.cs`

**Interfaces:**
- Produces: `MangaSearchRanking.Normalize(string)` and `Score(string query, params string?[] candidates)`.
- Extends: `GET /api/manga` query parameters with `fuzzy=true` and picker sort values.

- [ ] Write tests proving `Doraemon` matches `Đôrêmon`, partial names rank above unrelated names, and one-character typos rank below exact matches.
- [ ] Run `dotnet test ... --filter FullyQualifiedName~MangaSearchRankingTests` and verify RED.
- [ ] Implement Unicode normalization, token matching, and bounded Levenshtein scoring.
- [ ] Add deterministic server sort mappings for best match, latest/oldest upload, title, rating, follows, created date, and release year.
- [ ] Run ranking tests and existing manga tests until green.

### Task 4: MDList behavior module and regression tests

**Files:**
- Modify: `backend/wwwroot/js/mdlists.js`
- Create: `backend.Tests/js/mdlists-behavior.test.cjs`
- Modify: `backend.Tests/js/mdlist-mvc-contract.test.cjs`

**Interfaces:**
- Produces testable helpers through `module.exports` when running under Node: payload construction, selected-ID normalization, search URL construction, and stale-response sequencing.
- Consumes atomic POST/PUT contracts from Task 1 and fuzzy catalog query from Task 3.

- [ ] Write Node tests proving create/edit payloads include description and final ordered IDs, every sort maps to an API value, stale searches are ignored, and pagination advances.
- [ ] Run `node --test backend.Tests/js/mdlists-behavior.test.cjs` and verify RED.
- [ ] Refactor page state into small helpers without changing browser globals expected by the page.
- [ ] Implement disabled save state, inline errors, atomic create/edit, menu Edit/Delete, confirmation, search pagination, and selected states.
- [ ] Run focused Node tests until green.

### Task 5: Reference-aligned Razor and CSS

**Files:**
- Modify: `backend/Views/MangaListsView/Index.cshtml`
- Modify: `backend/wwwroot/css/mdlists.css`
- Modify: `backend/wwwroot/js/mdlists.js`

**Interfaces:**
- Adds DOM hooks for tabs, description, inline status, card menus, picker loading/error, and load-more.
- Preserves existing IDs referenced by structural tests unless replaced in the same task.

- [ ] Extend structural tests for the description field, status region, tab treatment, and picker pagination controls; verify RED.
- [ ] Update Razor to match the empty overview and create editor references, including responsive semantics and accessible controls.
- [ ] Update CSS for wide cards, cover strips, editor proportions, active tab, menu, status, and mobile layout.
- [ ] Replace unsafe URL interpolation with DOM property assignment or validated/escaped URL rendering.
- [ ] Run focused structural and behavior tests until green.

### Task 6: Verification and review

**Files:**
- Modify only files needed to correct failures caused by Tasks 1-5.

**Interfaces:**
- Produces a clean verification record; no new runtime interface.

- [ ] Run `node --check backend/wwwroot/js/mdlists.js`.
- [ ] Run every `backend.Tests/js/*.test.cjs` with Node's test runner.
- [ ] Run `dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore`.
- [ ] Run `dotnet build backend/MangaNPK.csproj -c Release --no-restore`.
- [ ] Run `git diff --check` on all files changed for this feature.
- [ ] Review the final diff for accidental changes, unresolved silent returns, missing ownership checks, or incomplete sort mappings.
