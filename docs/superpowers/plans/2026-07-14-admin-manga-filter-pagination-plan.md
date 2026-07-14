# Admin Manga Filter Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Thêm bộ lọc và phân trang 20 truyện mặc định cho danh sách Manga trong Admin, dùng cùng trải nghiệm với Tìm kiếm nâng cao.

**Architecture:** Mở rộng API Admin Manga với query server-side và response phân trang. Frontend Admin giữ state bộ lọc giống `advanced-search.js`, gọi API khi đổi điều kiện, rồi render bảng và pagination trong cùng pane.

**Tech Stack:** ASP.NET Core MVC/API, EF Core, Razor, vanilla JavaScript, xUnit, Node.js.

## Global Constraints

- Mặc định `pageSize=20`; chỉ cho phép 20, 50 hoặc 100.
- Search theo Title, AlternativeTitle và Author.Name.
- Filter Type, Status, Source, chapterState; sort newest/oldest/title-asc/chapter-count.
- Đổi filter/search/sort/pageSize luôn quay về page 1.
- Không tải toàn bộ Manga về trình duyệt.
- Giữ layout và trạng thái loading/empty/error theo Tìm kiếm nâng cao.

---

### Task 1: Add server-side Admin manga query

**Files:**
- Modify: `backend/Controllers/AdminController.cs` or the existing Admin manga-list API action
- Test: `backend.Tests/AdminMangaQueryTests.cs`

**Interfaces:**
- `GET /api/admin/manga?page=1&pageSize=20&search=&type=&status=&source=&chapterState=&sort=` returns `items`, `page`, `pageSize`, `totalItems`, `totalPages`.

- [ ] **Step 1: Write failing tests** for default page size, invalid page size normalization, title/alternative/author search, source/chapter filters, and total page count.
- [ ] **Step 2: Run `dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --filter FullyQualifiedName~AdminMangaQueryTests --no-restore`** and confirm failure against the current API contract.
- [ ] **Step 3: Implement** query filters before count, stable sort before `Skip/Take`, and projection with chapter count/authors needed by the table. Normalize page to at least 1 and page size to 20/50/100.
- [ ] **Step 4: Run the filtered tests and the full backend test suite.** Expected: all pass.
- [ ] **Step 5: Commit** with `git add backend/Controllers/AdminController.cs backend.Tests/AdminMangaQueryTests.cs; git commit -m "feat: add admin manga filtering and pagination api"`.

### Task 2: Add Admin filter toolbar matching advanced search

**Files:**
- Modify: `backend/Views/AdminView/Index.cshtml`
- Modify: `backend/wwwroot/css/style.css`
- Test: `backend.Tests/js/admin-manga-filter.test.cjs`

**Interfaces:**
- Toolbar IDs: `admin-manga-search`, `admin-manga-type`, `admin-manga-status`, `admin-manga-source`, `admin-manga-chapter-state`, `admin-manga-sort`, `admin-manga-page-size`, `admin-manga-reset`.
- Pagination container ID: `admin-manga-pagination`; result label ID: `admin-manga-count-label`.

- [ ] **Step 1: Write failing Node tests** for query serialization, reset state, and page-size options.
- [ ] **Step 2: Run `node --test backend.Tests/js/admin-manga-filter.test.cjs`** and confirm the helper is missing.
- [ ] **Step 3: Add** the compact search input, collapsible/select filters, reset action, count label, loading row, empty row, and pagination container. Reuse advanced-search class naming/colors and responsive layout.
- [ ] **Step 4: Run the Node test and verify the Razor view contains all required IDs.**
- [ ] **Step 5: Commit** with `git add backend/Views/AdminView/Index.cshtml backend/wwwroot/css/style.css backend.Tests/js/admin-manga-filter.test.cjs; git commit -m "feat: add admin manga filter toolbar"`.

### Task 3: Connect Admin JavaScript state and table pagination

**Files:**
- Modify: `backend/wwwroot/js/admin.js`
- Test: `backend.Tests/js/admin-manga-filter.test.cjs`

**Interfaces:**
- `buildAdminMangaQuery(state)` serializes the toolbar state.
- `loadMangas()` requests one server page and preserves current filters after edit/delete.
- `renderAdminMangaPagination(meta)` renders previous/next and compact page numbers.

- [ ] **Step 1: Extend the failing Node tests** for page reset on filter change, disabled previous/next buttons, and empty/error rendering.
- [ ] **Step 2: Run the Node test and confirm failure.**
- [ ] **Step 3: Implement** debounced search, immediate select changes, loading state, server query, total count display, compact pagination, reset action, and page correction when deletion empties the current page. Keep chapter dropdown data loading separate from the paged table query.
- [ ] **Step 4: Run all Node tests and `node --check backend/wwwroot/js/admin.js`.**
- [ ] **Step 5: Commit** with `git add backend/wwwroot/js/admin.js backend.Tests/js/admin-manga-filter.test.cjs; git commit -m "feat: connect admin manga filtering and pagination"`.

### Task 4: Verify integration and encoding

**Files:**
- Test: `backend.Tests/AdminMangaFilterIntegrationTests.cs`
- Modify: `backend/wwwroot/js/admin.js` only if verification exposes a regression

- [ ] **Step 1: Add integration coverage** for combined search + type/status/source/chapter filters, stable sorting and a page beyond page 1.
- [ ] **Step 2: Run verification:**

```text
dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore
dotnet build backend/MangaNPK.csproj -c Release --no-restore
node --check backend/wwwroot/js/admin.js
Get-ChildItem backend.Tests/js -Filter '*.test.cjs' | ForEach-Object { node --test $_.FullName }
```

- [ ] **Step 3: Confirm** no new build warnings, no mojibake in new text, and the Admin table keeps filters after edit/delete.
- [ ] **Step 4: Commit** with `git add backend.Tests/AdminMangaFilterIntegrationTests.cs; git commit -m "test: verify admin manga filters and pagination"`.

## Self-review

- Every requirement in the approved design is covered by Tasks 1–4.
- No placeholder implementation steps or unspecified filter values remain.
- API names and DOM IDs are consistent across tasks.

