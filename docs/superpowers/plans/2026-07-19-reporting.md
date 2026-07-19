# Manga and Chapter Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authenticated manga/chapter reports with target-specific reasons and an admin review queue.

**Architecture:** A single `Report` entity stores either a manga or chapter target, reason, explanation, status, and audit fields. A protected API serves creation and admin review; one shared client modal is opened from detail and reader pages. Admins use a dedicated MVC page backed by the same API.

**Tech Stack:** ASP.NET Core MVC, EF Core SQL Server, Razor views, vanilla JavaScript, Node contract tests, xUnit backend tests.

## Global Constraints

- Reports require an authenticated user.
- No Google reCAPTCHA; reject duplicate pending reports for the same user, target, and reason.
- `Other` requires a non-empty explanation; explanations are limited to 1,000 characters.
- Manga and chapter reason lists remain distinct and match the approved labels.
- User text is HTML-escaped in every rendered list or modal.

---

### Task 1: Report persistence and validation API

**Files:**
- Create: `backend/Models/Report.cs`
- Modify: `backend/Data/MangaDbContext.cs`
- Create: `backend/Controllers/ReportsController.cs`
- Create: `backend/Migrations/<timestamp>_AddReports.cs` through `dotnet ef migrations add AddReports`
- Test: `backend.Tests/ReportsControllerTests.cs`

- [ ] Write failing tests for authenticated creation, invalid reason rejection, required `Other` explanation, duplicate pending rejection, and unauthenticated rejection.
- [ ] Run `dotnet test backend.Tests/MangaNPK.Tests.csproj --no-build --no-restore`; confirm the new tests fail because the entity/controller do not exist.
- [ ] Add the `Report` entity with `TargetType`, nullable `MangaId`/`ChapterId`, `Reason`, `Explanation`, `Status`, reporter and resolution audit fields.
- [ ] Add EF relationships and a migration.
- [ ] Implement `POST /api/reports` with target validation, reason allowlists, explanation length validation, authentication, and duplicate pending protection.
- [ ] Run the focused backend tests and confirm they pass.

### Task 2: Shared report modal and client submission

**Files:**
- Create: `backend/wwwroot/js/report-modal.js`
- Modify: `backend/Views/MangaView/Detail.cshtml`
- Modify: `backend/Views/ChapterView/Read.cshtml`
- Modify: `backend/wwwroot/js/detail.js`
- Modify: `backend/wwwroot/js/reader.js`
- Modify: `backend/wwwroot/css/style.css`
- Test: `backend.Tests/js/report-modal-contract.test.cjs`

- [ ] Write failing contract tests for both trigger bindings, the two reason lists, `Other` validation, target metadata, and submit endpoint.
- [ ] Run the focused Node test and confirm it fails.
- [ ] Add one shared modal markup/style and load it on both pages.
- [ ] Implement `openReportModal({ type, mangaId, chapterId, ...metadata })`, target-specific reason rendering, explanation validation, login handoff, and `POST /api/reports` submission.
- [ ] Replace detail and reader “coming soon” handlers with the shared modal trigger.
- [ ] Run focused and full JavaScript tests.

### Task 3: Admin report queue

**Files:**
- Modify: `backend/Controllers/ReportsController.cs`
- Create: `backend/Controllers/ReportsViewController.cs`
- Create: `backend/Views/AdminView/Reports.cshtml`
- Create: `backend/wwwroot/js/admin-reports.js`
- Modify: `backend/Views/AdminView/Index.cshtml`
- Test: `backend.Tests/ReportsControllerTests.cs`
- Test: `backend.Tests/js/admin-reports-contract.test.cjs`

- [ ] Write failing tests for admin-only listing, status filtering, status updates, and non-admin rejection.
- [ ] Add `GET /api/reports` and `PATCH /api/reports/{id}/status` behind admin authorization.
- [ ] Add the admin Reports page link and table with target, reporter, reason, explanation, status, timestamps, and Resolve/Dismiss actions.
- [ ] Implement loading, filtering, status updates, and escaped rendering in `admin-reports.js`.
- [ ] Run focused tests, all JavaScript tests, and backend tests.

### Task 4: Verification and cache refresh

**Files:**
- Modify: `backend/Views/MangaView/Detail.cshtml`
- Modify: `backend/Views/ChapterView/Read.cshtml`

- [ ] Bump the report modal script cache version on both pages.
- [ ] Run `node --test` over `backend.Tests/js/*.test.cjs`.
- [ ] Run `dotnet test backend.Tests/MangaNPK.Tests.csproj --no-build --no-restore`.
- [ ] Build to a temporary output directory if a running Visual Studio process locks the normal output.
