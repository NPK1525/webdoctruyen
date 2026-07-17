# Catalog Admin Service Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Move author, genre, theme and manga persistence out of `AdminCatalogController` without changing its API contract.

**Architecture:** `CatalogAdminService` owns entity construction, relationship replacement and transactions. The controller remains a thin adapter mapping typed outcomes to the existing response bodies and status codes.

**Tech Stack:** .NET 10, EF Core, ASP.NET Core, xUnit.

## Global Constraints

- Preserve all six endpoint URLs, verbs, action names, messages and JSON properties.
- Preserve `MangaContentWarning.Normalize` and all relationship roles.
- Do not change schema, migrations, UI or JavaScript.
- Keep LocalDB-independent tests pure; do not add a new provider.

---

### Task 1: Lock the service boundary

**Files:** Create `backend.Tests/CatalogAdminServiceArchitectureTests.cs`.

- [ ] Require `AdminCatalogController` to depend on `CatalogAdminService`.
- [ ] Require the six existing action names to remain present.
- [ ] Run the filtered test and observe RED before adding the service dependency.

### Task 2: Implement service outcomes

**Files:** Create `backend/Services/CatalogAdminService.cs`, modify `AdminCatalogController.cs` and `Program.cs`.

- [ ] Add typed create/update/delete outcomes and pure tests for title validation, default role and warning normalization.
- [ ] Move transactions and relationship writes into the service.
- [ ] Map `NotFound`, `BadRequest`, `StatusCode(500)`, `CreatedAtAction` and `Ok` exactly as before.
- [ ] Register the service with scoped lifetime.

### Task 3: Verify and refresh baseline

- [ ] Run all backend tests, Release build, JavaScript syntax/tests and baseline comparison.
- [ ] Record the new line counts and keep LocalDB limitations explicit.
