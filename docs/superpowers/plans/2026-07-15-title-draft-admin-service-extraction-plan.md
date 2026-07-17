# Title Draft Admin Service Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Move admin title-draft listing, editing, approval and rejection out of `AdminTitleDraftController` without changing its seven endpoint contracts.

**Architecture:** `TitleDraftAdminService` owns validation, serialization, EF queries and approval transactions, returning a typed status plus optional response data. The controller keeps session identity and maps outcomes to HTTP.

**Tech Stack:** .NET 10, EF Core, ASP.NET Core, xUnit.

## Global Constraints

- Preserve all seven title-draft routes, messages, status codes and JSON properties.
- Preserve author resolution, contributor grant and MangaDex source metadata.
- Do not change UI, schema, migration or public title-submission flow.

---

### Task 1: Add a failing architecture test

- [ ] Require `AdminTitleDraftController` to depend on `TitleDraftAdminService` rather than `MangaDbContext`.
- [ ] Keep the existing 17-endpoint inventory green.

### Task 2: Extract the service

- [ ] Create typed list/detail/operation outcomes.
- [ ] Move validation, DTO application, JSON parsing, author attachment, approval transaction and rejection updates unchanged.
- [ ] Register the scoped service and reduce the controller to session/HTTP mapping.

### Task 3: Verify

- [ ] Run architecture tests, all backend tests, Release build, JavaScript tests/syntax and deterministic baseline comparison.
- [ ] Keep LocalDB/browser smoke explicitly unavailable.
