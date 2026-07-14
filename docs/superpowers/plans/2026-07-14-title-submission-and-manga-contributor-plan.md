# Title Submission and Manga Contributor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Hợp nhất form tạo truyện cho User/Admin, cho phép mọi User gửi Title Draft để duyệt, cấp quyền chapter theo từng Manga sau khi duyệt, và bảo vệ các endpoint bằng kiểm tra quyền ở máy chủ.

**Architecture:** Giữ role `User` và `Admin`, thêm quan hệ `MangaContributor` giữa User và Manga. Một application service nhận payload chung và chọn nhánh tạo `TitleDraft` Pending cho User hoặc tạo Manga trực tiếp cho Admin. Luồng duyệt dùng cùng mapper metadata, tạo Manga và quyền contributor trong một transaction; một authorization service dùng chung cho tất cả thao tác chapter.

**Tech Stack:** ASP.NET Core MVC/API, .NET 10, EF Core SQL Server LocalDB, Razor, vanilla JavaScript, xUnit, Node.js syntax/unit tests.

## Global Constraints

- Không thêm role Dịch giả hoặc quy trình xin role.
- Mọi User đã đăng nhập được gửi Title Draft; Admin đăng Manga trực tiếp.
- Chỉ Admin hoặc User có `MangaContributor` tương ứng được tạo, sửa, xóa chapter.
- Draft chưa duyệt không được xuất hiện trong các truy vấn công khai.
- Một Format chính duy nhất; giữ đầy đủ Content Warning, Demographic, Genre, Theme.
- Tác giả mới chỉ được ghi vào bảng chính thức khi Admin đăng trực tiếp hoặc duyệt draft.
- Không tạo hai form giao diện độc lập; User và Admin dùng cùng partial/thành phần form.
- Mọi thông báo mới phải là UTF-8 hợp lệ hoặc Unicode escape trong JavaScript.
- Không khôi phục `backend/wwwroot/admin.html`; route `/admin` Razor là giao diện Admin duy nhất.

---

### Task 1: Add contributor data model and migration

**Files:**
- Create: `backend/Models/MangaContributor.cs`
- Modify: `backend/Models/Manga.cs`
- Modify: `backend/Models/User.cs`
- Modify: `backend/Data/MangaDbContext.cs`
- Create: `backend/Migrations/*_AddMangaContributors.cs` via `dotnet ef migrations add AddMangaContributors`
- Create: `backend/Migrations/*_AddMangaContributors.Designer.cs` via the same migration command
- Modify: `backend/Migrations/MangaDbContextModelSnapshot.cs`
- Test: `backend.Tests/MangaContributorModelTests.cs`

**Interfaces:**
- Produces `MangaContributor { MangaId, UserId, GrantedAt, GrantedByUserId, Manga, User, GrantedByUser }`.
- Produces `DbSet<MangaContributor> MangaContributors`.
- Enforces unique `(MangaId, UserId)` and foreign keys with cascade delete for Manga/User ownership records.

- [ ] **Step 1: Write the failing test**

Add a model test that constructs a contributor and verifies required IDs, grant timestamp, and reviewer ID are retained. Add a DbContext model test that asserts the unique index exists.

- [ ] **Step 2: Run test to verify it fails**

Run `dotnet test backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~MangaContributorModelTests`. Expected: compile failure because `MangaContributor` and `MangaContributors` do not exist.

- [ ] **Step 3: Write minimal implementation**

Add the entity, navigation collections, DbSet, and `OnModelCreating` relationship/index configuration. Generate the EF migration with the existing project tooling and include the snapshot update.

- [ ] **Step 4: Run test to verify it passes**

Run the same filtered test and then `dotnet build backend/MangaNPK.csproj -c Release --no-restore`. Expected: PASS and zero build errors/warnings.

- [ ] **Step 5: Commit**

```text
git add backend/Models backend/Data backend/Migrations backend.Tests/MangaContributorModelTests.cs
git commit -m "feat: add manga contributor ownership"
```

### Task 2: Normalize draft authors and shared submission payload

**Files:**
- Create: `backend/Models/TitleDraftAuthor.cs`
- Modify: `backend/Models/TitleDraft.cs`
- Modify: `backend/Data/MangaDbContext.cs`
- Modify: `backend/Controllers/AdminController.cs`
- Modify: `backend/Services/MangaDexMetadataMapper.cs` if shared mapping helpers belong there
- Create: `backend/Services/TitleSubmissionService.cs`
- Create: `backend/Services/TitleSubmissionModels.cs`
- Create: `backend/Migrations/*_AddTitleDraftAuthors.cs` via `dotnet ef migrations add AddTitleDraftAuthors`
- Modify: `backend/Migrations/MangaDbContextModelSnapshot.cs`
- Test: `backend.Tests/TitleSubmissionServiceTests.cs`

**Interfaces:**
- `TitleSubmissionPayload` contains title fields, taxonomy IDs, one `Format`, content warnings, and `IReadOnlyList<TitleAuthorInput>`.
- `TitleAuthorInput` contains nullable `AuthorId`, proposed `Name`, and `Role` (`Story`, `Art`, or `Story & Art`).
- `TitleSubmissionService.SubmitAsync(payload, userId, isAdmin, cancellationToken)` returns `{ Kind: Draft|Manga, DraftId?, MangaId? }`.
- `TitleSubmissionService.ApproveAsync(draftId, reviewerId, cancellationToken)` returns the created Manga ID.

- [ ] **Step 1: Write the failing tests**

Cover: User submission creates Pending draft without Manga; Admin submission creates Manga immediately; duplicate author rows are rejected; a new author name is retained in draft data and not inserted into `Authors`.

- [ ] **Step 2: Run tests to verify they fail**

Run `dotnet test backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~TitleSubmissionServiceTests`. Expected: compile failure for missing service and normalized author entity.

- [ ] **Step 3: Write minimal implementation**

Create the normalized draft-author table with optional existing `AuthorId` and proposed name. Move new submissions to the service. Preserve legacy `StoryAuthor`/`Artist` values when reading old drafts and populate normalized rows on first update. Validate title, description, cover on submit, one Format, taxonomy IDs, author role and author name length. Use one transaction for direct Admin creation.

- [ ] **Step 4: Run tests to verify they pass**

Run the filtered tests, then all backend tests. Expected: all pass and no new warnings.

- [ ] **Step 5: Commit**

```text
git add backend/Models backend/Data backend/Services backend/Controllers/AdminController.cs backend/Migrations backend.Tests/TitleSubmissionServiceTests.cs
git commit -m "feat: unify title submission metadata and authors"
```

### Task 3: Enforce User/Admin draft ownership and approval permissions

**Files:**
- Create: `backend/Filters/RequireSignedInAttribute.cs` or a focused authorization helper following existing filter conventions
- Modify: `backend/Controllers/AdminController.cs`
- Create: `backend/Controllers/TitleSubmissionController.cs` if public User endpoints cannot safely live under AdminController
- Modify: `backend/Controllers/AdminViewController.cs`
- Modify: `backend/Program.cs` service registration
- Test: `backend.Tests/TitleSubmissionAuthorizationTests.cs`

**Interfaces:**
- Public endpoints: `POST /api/title-submissions`, `GET /api/title-submissions/{id}`, `PUT /api/title-submissions/{id}`.
- Admin endpoints: existing draft list/detail/approve/reject routes remain available only to Admin.
- Non-admin draft detail/update filters by `CreatedByUserId`; missing ownership returns `404`.
- Approval and rejection return `403` for non-Admin.

- [ ] **Step 1: Write the failing tests**

Cover anonymous submit (`401`), User submit (`Pending`), User reading another user’s draft (`404`), User updating a Pending draft (`409`), User resubmitting a Rejected draft (`Pending`), and non-Admin approval (`403`).

- [ ] **Step 2: Run tests to verify they fail**

Run `dotnet test backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~TitleSubmissionAuthorizationTests`. Expected: failures showing the current Admin-only filter and missing public routes.

- [ ] **Step 3: Write minimal implementation**

Move only submission actions that need User access behind signed-in checks; leave metadata administration and approval under `RequireAdmin`. Enforce owner filtering in queries, reject edits to Pending/Approved drafts, allow only Rejected resubmission, and make approval idempotent with a conflict response for Approved drafts.

- [ ] **Step 4: Run tests to verify they pass**

Run the filtered tests and the full backend test suite. Expected: PASS.

- [ ] **Step 5: Commit**

```text
git add backend/Filters backend/Controllers backend/Program.cs backend.Tests/TitleSubmissionAuthorizationTests.cs
git commit -m "feat: secure title submission workflow"
```

### Task 4: Grant contributor and protect chapter operations

**Files:**
- Create: `backend/Services/MangaContributorAuthorizationService.cs`
- Modify: `backend/Controllers/AdminViewController.cs`
- Modify: `backend/Controllers/ChapterController.cs`
- Modify: `backend/Controllers/ChapterViewController.cs`
- Modify: `backend/Controllers/AdminController.cs` chapter APIs
- Modify: chapter-related Razor views and `backend/wwwroot/js/admin-chapter-edit.js`
- Test: `backend.Tests/MangaContributorAuthorizationTests.cs`

**Interfaces:**
- `MangaContributorAuthorizationService.CanManageChapterAsync(userId, mangaId, cancellationToken)` returns true for Admin or an existing contributor row.
- `TitleSubmissionService.ApproveAsync` creates the contributor row for `CreatedByUserId` with `GrantedByUserId` set to reviewer.

- [ ] **Step 1: Write the failing tests**

Cover Admin access, contributor access to own Manga, denial for another User, and denial before draft approval. Cover approval creating exactly one contributor row and not duplicating it on a repeated request.

- [ ] **Step 2: Run tests to verify they fail**

Run `dotnet test backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~MangaContributorAuthorizationTests`. Expected: missing service/authorization behavior.

- [ ] **Step 3: Write minimal implementation**

Inject the service into every chapter create/edit/delete API and view action. Check before loading/uploading files. Use `403` for API and redirect/forbidden view behavior for MVC. Hide the chapter action in views unless the current session is Admin or contributor.

- [ ] **Step 4: Run tests to verify they pass**

Run the filtered tests, existing chapter upload tests, and full backend tests. Expected: PASS.

- [ ] **Step 5: Commit**

```text
git add backend/Services backend/Controllers backend/Views backend/wwwroot/js backend.Tests/MangaContributorAuthorizationTests.cs
git commit -m "feat: authorize chapter management per manga"
```

### Task 5: Build one shared create-title form and author selector

**Files:**
- Create or extract: `backend/Views/Shared/_TitleSubmissionForm.cshtml`
- Modify: `backend/Views/AdminView/Index.cshtml`
- Modify: `backend/Views/AdminView/MangaCreate.cshtml` or remove duplicate form after migration to shared partial
- Create: `backend/Views/Contribution/TitleCreate.cshtml`
- Create: `backend/Controllers/ContributionController.cs`
- Modify: `backend/wwwroot/js/admin.js`
- Create: `backend/wwwroot/js/title-submission.js`
- Modify: `backend/wwwroot/css/style.css`
- Test: `backend.Tests/js/title-submission.test.cjs`

**Interfaces:**
- `window.TitleSubmissionForm.collectPayload()` returns the shared payload shape.
- `window.TitleSubmissionForm.setMode({ isAdmin })` sets labels/button text without changing field structure.
- Author rows emit `{ authorId, name, role }` and prevent duplicate author-role combinations.

- [ ] **Step 1: Write the failing tests**

Add Node tests for one Format value, Content Warning/Genre/Theme serialization, selecting an existing author, adding a proposed author, duplicate prevention, and User/Admin button labels.

- [ ] **Step 2: Run tests to verify they fail**

Run `node --test backend.Tests/js/title-submission.test.cjs`. Expected: missing shared helper functions.

- [ ] **Step 3: Write minimal implementation**

Extract the existing form fields into a shared partial. Render existing authors with search/select plus a “Tác giả mới” input and role selector. Reuse current taxonomy chip classes and centered layout. Remove separate Create Title Draft navigation and expose the shared form as `Đóng góp truyện` for User and `Đăng truyện` for Admin. Keep one Format select/chip selection.

- [ ] **Step 4: Run tests to verify they pass**

Run Node tests and load both routes in the browser with a hard refresh. Expected: same visual form, correct button labels, no duplicate draft/create tabs, and valid UTF-8 text.

- [ ] **Step 5: Commit**

```text
git add backend/Views backend/wwwroot/js backend/wwwroot/css backend.Tests/js/title-submission.test.cjs
git commit -m "feat: share title submission form and author picker"
```

### Task 6: Hide unapproved titles and expose contributor actions in detail UI

**Files:**
- Modify: `backend/Controllers/MangaController.cs`
- Modify: `backend/Controllers/MangaViewController.cs`
- Modify: `backend/Views/MangaView/Detail.cshtml`
- Modify: `backend/wwwroot/js/detail.js`
- Modify: `backend/Views/Shared/_MangaCard.cshtml`
- Test: `backend.Tests/PublicMangaVisibilityTests.cs`

**Interfaces:**
- Public Manga queries include only actual Manga rows; no Pending/Rejected draft is projected into public results.
- Detail view receives `canManageChapters` and renders the chapter action only when true.

- [ ] **Step 1: Write the failing tests**

Cover that a Pending draft has no public card/detail, an Approved draft’s Manga is public, Admin sees chapter action, contributor sees chapter action, and unrelated User does not.

- [ ] **Step 2: Run tests to verify they fail**

Run `dotnet test backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~PublicMangaVisibilityTests`. Expected: missing contributor-aware view state or unfiltered draft-related query.

- [ ] **Step 3: Write minimal implementation**

Keep public Manga queries on `Mangas` only, load contributor state for the current session, and pass a boolean to the detail view/JSON. Update detail JS and MVC markup without exposing admin-only controls to unrelated Users.

- [ ] **Step 4: Run tests to verify they pass**

Run the filtered test and full backend suite. Expected: PASS.

- [ ] **Step 5: Commit**

```text
git add backend/Controllers backend/Views backend/wwwroot/js backend.Tests/PublicMangaVisibilityTests.cs
git commit -m "feat: expose title contributors in manga detail"
```

### Task 7: Backfill existing approved drafts and verify end-to-end behavior

**Files:**
- Modify: `backend/Migrations/*_AddMangaContributors.cs`
- Modify: `backend/Data/MangaDbSeeder.cs`
- Create: `backend.Tests/TitleWorkflowIntegrationTests.cs`
- Modify: `docs/README` or existing developer runbook if present

- [ ] **Step 1: Write the failing integration tests**

Use an isolated EF Core test database to exercise User submit → Admin approve → contributor chapter create, Admin direct publish, rejected resubmission, and duplicate approval conflict. Include a legacy approved draft with `ApprovedMangaId` and verify its contributor row is backfilled.

- [ ] **Step 2: Run tests to verify they fail**

Run `dotnet test backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~TitleWorkflowIntegrationTests`. Expected: failure until migration/backfill and all workflow pieces are connected.

- [ ] **Step 3: Write minimal implementation**

Add idempotent migration SQL/backfill for approved drafts. Ensure startup migration/seeding does not create duplicate contributor rows. Add a short runbook note describing `User` and `Admin` behavior.

- [ ] **Step 4: Run the complete verification suite**

Run:

```text
dotnet test backend.Tests/backend.Tests.csproj
dotnet build backend/MangaNPK.csproj -c Release --no-restore
node --test backend.Tests/js/*.test.cjs
```

Expected: all tests pass, build has zero errors/warnings, and the browser smoke test confirms both User and Admin flows with a hard refresh.

- [ ] **Step 5: Commit**

```text
git add backend/Migrations backend/Data/MangaDbSeeder.cs backend.Tests/TitleWorkflowIntegrationTests.cs docs
git commit -m "test: verify title submission and contributor workflow"
```

## Self-review checklist

- Spec coverage: Tasks 1–2 cover the data model and shared author/metadata payload; Tasks 3–4 cover role and per-Manga authorization; Tasks 5–6 cover the shared interface and public visibility; Task 7 covers compatibility, backfill, and end-to-end verification.
- Placeholder scan: no unspecified implementation steps remain; migration filenames use the repository’s generated timestamp convention and are created by the commands listed in each task.
- Type consistency: `TitleSubmissionPayload`, `TitleAuthorInput`, `MangaContributorAuthorizationService.CanManageChapterAsync`, and `TitleSubmissionService.SubmitAsync/ApproveAsync` are the only cross-task interfaces and are named consistently.
- Scope: no translator role, transfer workflow, or unrelated admin refactor is included.
