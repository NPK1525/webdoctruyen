# Chapter Admin Service Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Move chapter query, validation, transaction and page-update nghiệp vụ out of `AdminChapterController` while preserving every existing response and authorization rule.

**Architecture:** `ChapterAdminService` owns EF Core chapter operations and returns small result records; the controller remains an HTTP adapter that maps those results to the current status codes and JSON bodies. Existing pure validators remain reusable and are called by the service.

**Tech Stack:** .NET 10, ASP.NET Core, EF Core, xUnit.

## Global Constraints

- Keep `api/admin/chapter` routes, action names and `[RequireAdmin]` unchanged.
- Preserve contributor authorization, Vietnamese validation messages, status codes and response JSON.
- Do not change models, migrations, UI or JavaScript.
- Do not add a runtime database provider solely for tests.
- All source remains strict UTF-8 and follows the repository `.editorconfig`.

---

### Task 1: Lock the service boundary

**Files:**
- Create: `backend.Tests/ChapterAdminServiceArchitectureTests.cs`
- Modify: `backend/Controllers/AdminChapterController.cs`

- [ ] Write a failing reflection test requiring `AdminChapterController` to have a constructor dependency on `ChapterAdminService` and no direct `MangaDbContext` field.
- [ ] Run the filtered test and observe RED because the controller currently owns the context.
- [ ] Keep the existing three public action names in the test so contributor authorization remains compatible.

### Task 2: Add result contracts and service

**Files:**
- Create: `backend/Services/ChapterAdminService.cs`
- Create: `backend/Services/ChapterAdminResults.cs`
- Test: `backend.Tests/ChapterAdminServiceTests.cs`

- [ ] Add pure result records for edit payload, update outcome and create outcome.
- [ ] Add tests for invalid chapter number, MangaDex page-edit rejection, empty local page list, and page renumbering before writing service code.
- [ ] Implement the service with `MangaDbContext`, `ChapterUploadValidator`, `ChapterUpdateService`, and explicit transactions; map all current messages into result records.
- [ ] Run focused tests and then the full backend suite.

### Task 3: Make controller an HTTP adapter

**Files:**
- Modify: `backend/Controllers/AdminChapterController.cs`
- Modify: `backend/Program.cs`

- [ ] Inject `ChapterAdminService` instead of `MangaDbContext`.
- [ ] Map service outcomes to the exact current `NotFound`, `BadRequest`, `Conflict`, `StatusCode(500)` and `Ok` JSON responses.
- [ ] Register the service with `AddScoped<ChapterAdminService>()`.
- [ ] Run architecture, chapter, full backend and JavaScript checks.

### Task 4: Refresh evidence

**Files:**
- Modify: `docs/quality/codebase-baseline.md`
- Modify: `tools/codebase-baseline.ps1`

- [ ] Regenerate and compare the baseline report.
- [ ] Record service/controller line counts and all verification results.
- [ ] Keep LocalDB/browser smoke explicitly unavailable if the environment still cannot start LocalDB.

## Self-review

- The plan changes only chapter backend internals and leaves routes, UI and schema untouched.
- Every service outcome has an explicit HTTP mapping requirement; no generic exception-to-200 fallback is allowed.
- Tests are pure and do not require a new database provider.
