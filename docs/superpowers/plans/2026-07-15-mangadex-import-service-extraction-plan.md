# MangaDex Import Service Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Move MangaDex preview/import persistence, author merging and taxonomy synchronization out of `AdminMangaDexController` while preserving its two API endpoints.

**Architecture:** `MangaDexImportService` composes the existing remote `MangaDexService` with EF Core and returns typed preview/import outcomes. The controller maps these outcomes to the existing 200/400/502/500 JSON responses.

**Tech Stack:** .NET 10, EF Core, ASP.NET Core, xUnit.

## Global Constraints

- Preserve `POST api/admin/mangadex/preview` and `POST api/admin/mangadex/import` exactly.
- Preserve Vietnamese response messages, metadata mapping, content-warning normalization and chapter sync semantics.
- Do not change UI, JavaScript, models, migrations or remote MangaDex request behavior.

---

### Task 1: Lock the boundary

- [ ] Add a failing architecture test requiring `AdminMangaDexController` to depend only on `MangaDexImportService` for import persistence.
- [ ] Keep both action names and route attributes protected by the existing endpoint inventory test.

### Task 2: Extract the service

- [ ] Create `backend/Services/MangaDexImportService.cs` with typed preview/import outcomes.
- [ ] Move transaction, manga upsert, author-role merge, genre/theme upsert, chapter sync and slug generation unchanged.
- [ ] Preserve ArgumentException, HttpRequestException and unexpected-exception mappings.
- [ ] Register the service with scoped lifetime and reduce the controller to HTTP mapping.

### Task 3: Verify

- [ ] Run architecture tests, all backend tests, Release build, JavaScript syntax/tests and deterministic baseline comparison.
- [ ] Keep LocalDB/browser smoke marked unavailable unless it actually succeeds.
