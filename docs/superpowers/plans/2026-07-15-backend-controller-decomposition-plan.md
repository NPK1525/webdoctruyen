# Backend Controller Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách `AdminController` theo Catalog/Manga, Chapter, MangaDex và Title Draft mà vẫn giữ nguyên toàn bộ URL, HTTP verb, JSON response và quyền truy cập hiện tại.

**Architecture:** Bốn API controller cùng dùng route gốc tường minh `api/admin`, mỗi controller chỉ nhận dependency cần cho nhóm endpoint của mình. DTO được chuyển sang `Contracts/Admin`; nghiệp vụ vẫn được di chuyển nguyên trạng trong bước này để diff có thể kiểm chứng, còn việc tách service sẽ là kế hoạch backend tiếp theo.

**Tech Stack:** .NET 10, ASP.NET Core MVC, EF Core, xUnit reflection tests.

## Global Constraints

- Giữ nguyên UI, DOM contract, API URL, HTTP verb, status code và JSON property hiện tại.
- Giữ `[RequireAdmin]` trên mọi API controller được tách.
- Giữ nguyên ngoại lệ contributor cho các action chapter dựa trên tên action hiện tại.
- Không đổi model, migration hoặc database schema.
- Không format hàng loạt và không sửa file ngoài phạm vi.
- Mọi file text phải là UTF-8; `.editorconfig` phải khớp đặc tả CRLF đã duyệt.

---

### Task 1: Lock the admin API contract and decomposition boundary

**Files:**
- Create: `backend.Tests/AdminControllerArchitectureTests.cs`
- Modify: `.editorconfig`

**Interfaces:**
- Consumes: action attributes currently declared in `AdminController`.
- Produces: reflection test inventory for 17 endpoints and four required controller types.

- [ ] **Step 1: Write a failing architecture test**

Create a test that loads the backend assembly and requires these controller types:

```csharp
var expected = new[]
{
    "MangaNPK.Controllers.AdminCatalogController",
    "MangaNPK.Controllers.AdminChapterController",
    "MangaNPK.Controllers.AdminMangaDexController",
    "MangaNPK.Controllers.AdminTitleDraftController"
};
Assert.Empty(expected.Where(name => assembly.GetType(name) is null));
```

The same test file must inventory and assert the exact method/route pairs:

```text
POST author
POST genre
POST theme
POST manga
PUT manga/{id}
DELETE manga/{id}
GET chapter/{id}
PUT chapter/{id}
POST chapter
POST mangadex/preview
POST mangadex/import
GET title-drafts
GET title-drafts/{id}
POST title-drafts
PUT title-drafts/{id}
POST title-drafts/{id}/approve
POST title-drafts/{id}/reject
```

Every discovered controller must inherit `ControllerBase`, have `[ApiController]`, `[Route("api/admin")]`, and `[RequireAdmin]`.

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --filter FullyQualifiedName~AdminControllerArchitectureTests --no-restore
```

Expected: FAIL because the four focused controller types do not exist.

- [ ] **Step 3: Correct the phase-1 line-ending rule**

Change only this `.editorconfig` value to match the approved design:

```ini
end_of_line = crlf
```

- [ ] **Step 4: Run encoding tests**

Run:

```powershell
dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --filter FullyQualifiedName~SourceEncodingTests --no-restore
```

Expected: 2 passed.

### Task 2: Extract admin request DTOs

**Files:**
- Create: `backend/Contracts/Admin/CatalogDtos.cs`
- Create: `backend/Contracts/Admin/ChapterDtos.cs`
- Create: `backend/Contracts/Admin/MangaDexDtos.cs`
- Create: `backend/Contracts/Admin/TitleDraftDtos.cs`
- Modify: `backend/Controllers/AdminController.cs`

**Interfaces:**
- Consumes: existing public DTO properties and enum types without renaming.
- Produces: namespace `MangaNPK.Contracts.Admin` containing `CreateAuthorDto`, `CreateGenreDto`, `CreateThemeDto`, `CreateMangaDto`, `MangaAuthorDto`, `CreateChapterDto`, `UpdateChapterDto`, `MangaDexImportRequest`, `SaveTitleDraftDto`, and `RejectTitleDraftDto`.

- [ ] **Step 1: Add a failing DTO location test**

Extend `AdminControllerArchitectureTests` to require:

```csharp
Assert.Equal("MangaNPK.Contracts.Admin", typeof(CreateMangaDto).Namespace);
Assert.Equal("MangaNPK.Contracts.Admin", typeof(SaveTitleDraftDto).Namespace);
```

Run the filtered test and expect failure because DTOs still use `MangaNPK.Controllers`.

- [ ] **Step 2: Move DTOs without changing their shape**

Copy each existing property, default value and collection type exactly into the four contract files under:

```csharp
namespace MangaNPK.Contracts.Admin;
```

Add `using MangaNPK.Contracts.Admin;` to the controller and remove the DTO declarations from its bottom.

- [ ] **Step 3: Verify DTO and full backend tests**

Run the filtered architecture test; it may still fail only on the missing focused controllers. Run the full backend suite and require all pre-existing tests plus the new DTO assertions to pass where applicable.

### Task 3: Split the controller by responsibility

**Files:**
- Create: `backend/Controllers/AdminCatalogController.cs`
- Create: `backend/Controllers/AdminChapterController.cs`
- Create: `backend/Controllers/AdminMangaDexController.cs`
- Create: `backend/Controllers/AdminTitleDraftController.cs`
- Delete: `backend/Controllers/AdminController.cs`

**Interfaces:**
- Consumes: DTOs from `MangaNPK.Contracts.Admin`, `MangaDbContext`, `MangaDexService`, existing models and helpers.
- Produces: four controllers with a shared attribute header and unchanged action names/routes.

- [ ] **Step 1: Apply the common controller contract**

Every new controller must use this exact class-level contract:

```csharp
[ApiController]
[Route("api/admin")]
[RequireAdmin]
public class AdminCatalogController(MangaDbContext context) : ControllerBase
```

Use the corresponding class name/dependencies for the other three controllers.

- [ ] **Step 2: Move catalog actions exactly**

Move `CreateAuthor`, `CreateGenre`, `CreateTheme`, `CreateManga`, `UpdateManga`, and `DeleteManga` into `AdminCatalogController`. Preserve action attributes, response bodies, transaction boundaries and validation strings.

- [ ] **Step 3: Move chapter actions exactly**

Move `GetChapterForEditing`, `UpdateChapter`, and `CreateChapter` into `AdminChapterController`. Preserve action names because `RequireAdminAttribute.IsContributorChapterRequest` depends on them.

- [ ] **Step 4: Move MangaDex actions and helpers exactly**

Move `PreviewMangaDex`, `ImportMangaDex`, `UpsertMangaDexAuthorsAsync`, `UpsertMangaDexTagsAsync`, `FindOrCreateGenreAsync`, `FindOrCreateThemeAsync`, `MergeAuthorRoles`, and `Slugify` into `AdminMangaDexController`.

- [ ] **Step 5: Move title-draft actions and helpers exactly**

Move all seven title-draft endpoints plus `ValidateTitleDraft`, `ApplyTitleDraftDto`, `ToSaveTitleDraftDto`, `ToTitleDraftResponse`, `ReadIntList`, `ReadStringList`, `BuildAlternativeTitle`, and both `AttachDraftAuthorAsync` overloads into `AdminTitleDraftController`.

- [ ] **Step 6: Remove the original controller after all actions compile**

Delete `AdminController.cs`; no endpoint may exist in both old and new controllers.

- [ ] **Step 7: Verify GREEN**

Run the filtered architecture test. Expected: all four controller types exist, all 17 endpoint contracts appear exactly once, and all controllers carry required authorization metadata.

### Task 4: Full regression verification

**Files:**
- Modify: `docs/quality/codebase-baseline.md`
- Modify: `tools/codebase-baseline.ps1`

**Interfaces:**
- Consumes: final controller/file layout.
- Produces: refreshed deterministic baseline and phase-2 verification evidence.

- [ ] **Step 1: Regenerate the baseline**

Run `tools/codebase-baseline.ps1`, update the saved Markdown with changed large-file results, and prove generated output equals the saved file.

- [ ] **Step 2: Run all backend and frontend checks**

Run Release build, all backend tests, strict encoding/mojibake tests, `node --check` for all JavaScript sources, and every `backend.Tests/js/*.test.cjs` test.

- [ ] **Step 3: Inspect endpoint uniqueness**

Require the reflection inventory test to prove each admin route/verb combination occurs exactly once.

- [ ] **Step 4: Record environment limitations honestly**

Keep LocalDB/browser smoke marked unavailable unless it actually runs successfully; do not infer success from unit tests.

## Self-review

- Spec coverage: this plan completes controller and DTO decomposition while deliberately deferring business-service extraction to the next independently testable backend plan.
- Placeholder scan: every implementation step is explicit.
- Type consistency: all action DTOs come from `MangaNPK.Contracts.Admin`; route and action names match the current controller inventory.
- Safety: no schema, UI, DOM or API contract change is authorized.
