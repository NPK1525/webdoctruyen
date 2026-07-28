# Integrated Admin Title Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove review controls from the manga creation form and add a localized, paginated title-review workflow inside Admin Control Panel.

**Architecture:** Keep title creation in `admin-title-drafts.js` and move all review behavior into the focused `admin-title-review.js` module. Reuse the existing title-draft APIs and render search, filtering, pagination, read-only detail, approve, and reject states client-side inside a new Admin tab; keep backend changes limited to rejection validation and redirecting the obsolete standalone route.

**Tech Stack:** ASP.NET Core MVC/API, Entity Framework Core 10, Razor, vanilla JavaScript, JSON i18n, Node test runner, xUnit.

## Global Constraints

- The creation/edit form contains content fields only and keeps `Hủy`, `Lưu nháp`, and `Đăng truyện` as applicable.
- `Đăng truyện` sends `submitForReview: true` and moves the draft to `Pending`.
- Review list and detail remain inside Admin Control Panel.
- Rejecting requires a non-empty reason.
- Existing database schema and approved-manga creation service remain unchanged.
- New UI copy must use the current Vietnamese/English i18n system.
- Existing light/dark mode and responsive Admin styles must remain functional.
- The obsolete `/admin/title-drafts` page redirects to `/admin?tab=title-review`.

---

### Task 1: Enforce non-empty rejection reasons

**Files:**
- Create: `backend.Tests/TitleDraftAdminServiceTests.cs`
- Modify: `backend/Services/TitleDraftAdminService.cs`

**Interfaces:**
- Consumes: `TitleDraftAdminService.RejectAsync(int id, string? reason, int reviewerId, CancellationToken cancellationToken = default)`.
- Produces: rejection with blank input returns `TitleDraftAdminStatus.BadRequest`; valid rejection behavior remains unchanged.

- [ ] **Step 1: Write the failing service tests**

```csharp
using MangaNPK.Data;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public class TitleDraftAdminServiceTests
{
    private static MangaDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new MangaDbContext(options);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task RejectAsync_RejectsBlankReason(string reason)
    {
        await using var context = CreateContext();
        context.TitleDrafts.Add(new TitleDraft
        {
            Id = 1,
            Title = "Pending title",
            Description = "Description",
            CreatedByUserId = 1,
            ReviewStatus = TitleDraftReviewStatus.Pending
        });
        await context.SaveChangesAsync();

        var result = await new TitleDraftAdminService(context).RejectAsync(1, reason, 2);

        Assert.Equal(TitleDraftAdminStatus.BadRequest, result.Status);
        Assert.Equal(TitleDraftReviewStatus.Pending, context.TitleDrafts.Single().ReviewStatus);
    }

    [Fact]
    public async Task RejectAsync_TrimsAndStoresReason()
    {
        await using var context = CreateContext();
        context.TitleDrafts.Add(new TitleDraft
        {
            Id = 1,
            Title = "Pending title",
            Description = "Description",
            CreatedByUserId = 1,
            ReviewStatus = TitleDraftReviewStatus.Pending
        });
        await context.SaveChangesAsync();

        var result = await new TitleDraftAdminService(context).RejectAsync(1, "  Missing cover  ", 2);

        Assert.Equal(TitleDraftAdminStatus.Success, result.Status);
        Assert.Equal("Missing cover", context.TitleDrafts.Single().RejectionReason);
    }
}
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```powershell
dotnet test backend.Tests\MangaNPK.Tests.csproj --configuration Release --no-restore --filter FullyQualifiedName~TitleDraftAdminServiceTests
```

Expected: `RejectAsync_RejectsBlankReason` fails because the service currently accepts an empty reason and changes the status to `Rejected`.

- [ ] **Step 3: Add minimal validation before mutating the draft**

Insert at the start of `RejectAsync`, after the not-found and approved checks:

```csharp
if (string.IsNullOrWhiteSpace(reason))
    return new(TitleDraftAdminStatus.BadRequest, "Ly do tu choi la bat buoc.");
```

Keep the existing trimmed assignment:

```csharp
draft.RejectionReason = reason.Trim();
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```powershell
dotnet test backend.Tests\MangaNPK.Tests.csproj --configuration Release --no-restore --filter FullyQualifiedName~TitleDraftAdminServiceTests
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```powershell
git add backend.Tests/TitleDraftAdminServiceTests.cs backend/Services/TitleDraftAdminService.cs
git commit -m "fix: require title rejection reason"
```

---

### Task 2: Remove review fields and actions from the creation form

**Files:**
- Modify: `backend.Tests/js/admin-title-draft-single-page.test.cjs`
- Modify: `backend.Tests/js/admin-title-draft-actions.test.cjs`
- Modify: `backend/Views/AdminView/Index.cshtml`
- Modify: `backend/wwwroot/js/admin-title-drafts.js`
- Modify: `backend/wwwroot/js/admin.js`

**Interfaces:**
- Consumes: title-draft form section navigation and `saveTitleDraft(bool submitForReview)`.
- Produces: exactly seven content sections; no review controls in the form; submission still calls `saveTitleDraft(true)`.

- [ ] **Step 1: Change structural tests to describe the separated form**

In `admin-title-draft-single-page.test.cjs`, replace the sections constant and add absence checks:

```js
const sections = ['basic', 'publish', 'authors', 'tags', 'images', 'links', 'translation'];

test('title draft form excludes administration controls', () => {
  assert.doesNotMatch(view, /data-section-panel="review"/);
  assert.doesNotMatch(view, /data-section="review"/);
  assert.doesNotMatch(view, /id="draft-review-status-label"/);
  assert.doesNotMatch(view, /id="draft-created-by-label"/);
  assert.doesNotMatch(view, /id="draft-created-at-label"/);
  assert.doesNotMatch(view, /id="draft-rejection-reason"/);
});
```

In `admin-title-draft-actions.test.cjs`, add:

```js
test('creation action bar does not expose review decisions', () => {
  assert.doesNotMatch(view, /id="btn-approve-title-draft"/);
  assert.doesNotMatch(view, /id="btn-reject-title-draft"/);
  assert.match(script, /saveTitleDraft\(true\)/);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
node --test backend.Tests/js/admin-title-draft-single-page.test.cjs backend.Tests/js/admin-title-draft-actions.test.cjs
```

Expected: tests fail because the `review` section, review fields, and decision buttons still exist.

- [ ] **Step 3: Remove the review markup and obsolete hidden CSS**

Delete from `Index.cshtml`:

```html
<button type="button" class="title-draft-section-btn" data-section="review"><i data-lucide="shield-check"></i><span data-i18n="admin.review">Quản trị</span></button>
<div class="title-draft-section" data-section-panel="review">
  <h4 data-i18n="admin.review">Quản trị</h4>
</div>
<button type="button" id="btn-reject-title-draft" class="btn btn-secondary"><span data-i18n="admin.reject">Từ chối</span></button>
<button type="button" id="btn-approve-title-draft" class="btn btn-secondary"><span data-i18n="admin.approve">Duyệt</span></button>
```

Remove this obsolete CSS selector:

```css
.title-draft-section-btn[data-section="review"],
.title-draft-section[data-section-panel="review"],
#btn-approve-title-draft,
#btn-reject-title-draft { display: none !important; }
```

- [ ] **Step 4: Remove form-side review state and handlers**

From `resetTitleDraftForm()` and `loadTitleDraftForEditing()`, remove all reads/writes of:

```js
draft-review-status-label
draft-created-by-label
draft-created-at-label
draft-rejection-reason
btn-approve-title-draft
btn-reject-title-draft
```

Delete `approveTitleDraft()` and `rejectTitleDraft()` from `admin-title-drafts.js`. Remove their two event bindings from `initAdminTabs()` in `admin.js`. Keep:

```js
document.getElementById('btn-submit-title-draft')
  ?.addEventListener('click', () => saveTitleDraft(true));
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
node --test backend.Tests/js/admin-title-draft-single-page.test.cjs backend.Tests/js/admin-title-draft-actions.test.cjs
```

Expected: all title-draft form tests pass.

- [ ] **Step 6: Commit**

```powershell
git add backend.Tests/js/admin-title-draft-single-page.test.cjs backend.Tests/js/admin-title-draft-actions.test.cjs backend/Views/AdminView/Index.cshtml backend/wwwroot/js/admin-title-drafts.js backend/wwwroot/js/admin.js
git commit -m "refactor: separate title creation from review"
```

---

### Task 3: Add the integrated review tab and retire the standalone page

**Files:**
- Create: `backend.Tests/js/admin-title-review.test.cjs`
- Create: `backend.Tests/AdminTitleReviewRouteTests.cs`
- Modify: `backend/Views/AdminView/Index.cshtml`
- Modify: `backend/Controllers/AdminViewController.cs`
- Delete: `backend/Views/AdminView/TitleDrafts.cshtml`

**Interfaces:**
- Consumes: Admin tab convention `.admin-tab-btn[data-tab]`, `.admin-tab-pane`, and `switchTab(tabName)`.
- Produces: tab name `title-review`, content IDs prefixed `title-review-`, and legacy redirect `/admin?tab=title-review`.

- [ ] **Step 1: Write failing UI structure tests**

Create `admin-title-review.test.cjs`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const view = fs.readFileSync(path.join(root, 'backend', 'Views', 'AdminView', 'Index.cshtml'), 'utf8');

test('admin contains an integrated title review tab', () => {
  assert.match(view, /class="admin-tab-btn" data-tab="title-review"/);
  assert.match(view, /id="title-review-pending-count"/);
  assert.match(view, /id="adm-content-title-review"/);
});

test('title review tab contains filters list detail and pagination', () => {
  for (const id of [
    'title-review-search',
    'title-review-status',
    'title-review-table-body',
    'title-review-pagination',
    'title-review-detail',
    'title-review-back',
    'title-review-reason',
    'title-review-reject',
    'title-review-approve'
  ]) assert.match(view, new RegExp(`id="${id}"`));
});
```

- [ ] **Step 2: Write the failing route test**

Create `AdminTitleReviewRouteTests.cs`:

```csharp
using MangaNPK.Controllers;
using MangaNPK.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public class AdminTitleReviewRouteTests
{
    [Fact]
    public void LegacyTitleDrafts_RedirectsToIntegratedReviewTab()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var context = new MangaDbContext(options);
        var result = new AdminViewController(context).TitleDrafts();

        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.Equal("/admin?tab=title-review", redirect.Url);
    }
}
```

- [ ] **Step 3: Run both tests and verify RED**

Run:

```powershell
node --test backend.Tests/js/admin-title-review.test.cjs
dotnet test backend.Tests\MangaNPK.Tests.csproj --configuration Release --no-restore --filter FullyQualifiedName~AdminTitleReviewRouteTests
```

Expected: the Node test cannot find the integrated tab, and the xUnit test receives the old `ViewResult`.

- [ ] **Step 4: Add the tab and review panes**

Add a sidebar button:

```html
<button class="admin-tab-btn" data-tab="title-review">
  <i data-lucide="shield-check"></i>
  <span data-i18n="admin.titleReview">Duyệt truyện</span>
  <span id="title-review-pending-count" class="admin-count-badge" hidden>0</span>
</button>
```

Add `#adm-content-title-review` containing:

```html
<section id="title-review-list">
  <div class="admin-manga-search-wrap">
    <i data-lucide="search"></i>
    <input id="title-review-search" class="form-control"
           data-i18n="admin.searchTitleReview" data-i18n-attr="placeholder" />
  </div>
  <select id="title-review-status" class="form-control">
    <option value="" data-i18n="admin.allReviewStatuses">Tất cả trạng thái</option>
    <option value="1" data-i18n="admin.pendingStatus">Chờ duyệt</option>
    <option value="2" data-i18n="admin.approvedStatus">Đã duyệt</option>
    <option value="3" data-i18n="admin.rejectedStatus">Từ chối</option>
  </select>
  <table><tbody id="title-review-table-body"></tbody></table>
  <div id="title-review-pagination" class="admin-manga-pagination"></div>
</section>
<section id="title-review-detail" hidden>
  <button id="title-review-back" type="button" class="btn btn-secondary"><span data-i18n="admin.backToReviewList">Quay lại danh sách</span></button>
  <div id="title-review-detail-content"></div>
  <textarea id="title-review-reason" class="form-control"></textarea>
  <button id="title-review-reject" type="button" class="btn btn-secondary"><span data-i18n="admin.reject">Từ chối</span></button>
  <button id="title-review-approve" type="button" class="btn btn-primary"><span data-i18n="admin.approve">Duyệt</span></button>
</section>
```

Use Admin variables for borders, backgrounds, text and accent colors. Add a one-column mobile layout at `max-width: 900px`.

- [ ] **Step 5: Replace the old page action with a redirect and delete its view**

Change:

```csharp
[HttpGet("title-drafts")]
public IActionResult TitleDrafts() => Redirect("/admin?tab=title-review");
```

Delete `backend/Views/AdminView/TitleDrafts.cshtml`.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```powershell
node --test backend.Tests/js/admin-title-review.test.cjs
dotnet test backend.Tests\MangaNPK.Tests.csproj --configuration Release --no-restore --filter FullyQualifiedName~AdminTitleReviewRouteTests
```

Expected: all new structure and redirect tests pass.

- [ ] **Step 7: Commit**

```powershell
git add backend.Tests/js/admin-title-review.test.cjs backend.Tests/AdminTitleReviewRouteTests.cs backend/Views/AdminView/Index.cshtml backend/Controllers/AdminViewController.cs backend/Views/AdminView/TitleDrafts.cshtml
git commit -m "feat: add integrated title review tab"
```

---

### Task 4: Implement search, status filtering, pagination and read-only detail

**Files:**
- Modify: `backend.Tests/js/admin-title-review.test.cjs`
- Modify: `backend/wwwroot/js/admin-title-review.js`
- Modify: `backend/wwwroot/js/admin.js`
- Modify: `backend/Views/AdminView/Index.cshtml`

**Interfaces:**
- Consumes: `GET /api/admin/title-drafts`, `GET /api/admin/title-drafts/{id}`, global `apiFetch`, `t`, `adminEscapeHtml`, `genresList`, and `themesList`.
- Produces: global `window.AdminTitleReview` with `init()`, `activate()`, and `refresh()`; client-side page size 20.

- [ ] **Step 1: Add failing behavior-contract tests**

Append to `admin-title-review.test.cjs`:

```js
const script = fs.readFileSync(path.join(root, 'backend', 'wwwroot', 'js', 'admin-title-review.js'), 'utf8');

test('title review module owns filtering pagination and detail rendering', () => {
  assert.match(script, /const PAGE_SIZE = 20/);
  assert.match(script, /function getFilteredDrafts\(\)/);
  assert.match(script, /function renderPagination\(\)/);
  assert.match(script, /async function openDetail\(id\)/);
  assert.match(script, /adminEscapeHtml/);
  assert.match(script, /window\.AdminTitleReview\s*=/);
});

test('admin activates title review through its dedicated module', () => {
  const admin = fs.readFileSync(path.join(root, 'backend', 'wwwroot', 'js', 'admin.js'), 'utf8');
  assert.match(admin, /window\.AdminTitleReview\?\.init\(\)/);
  assert.match(admin, /tabName === 'title-review'/);
  assert.match(admin, /window\.AdminTitleReview\?\.activate\(\)/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test backend.Tests/js/admin-title-review.test.cjs
```

Expected: fails because the existing standalone script has no module API, filters, pagination, or integrated activation.

- [ ] **Step 3: Rewrite the review script as a focused module**

Use this state boundary:

```js
(() => {
  const PAGE_SIZE = 20;
  let drafts = [];
  let page = 1;
  let selectedId = null;
  let initialized = false;
  let busy = false;

  function getFilteredDrafts() {
    const search = document.getElementById('title-review-search')?.value.trim().toLowerCase() || '';
    const status = document.getElementById('title-review-status')?.value || '';
    return drafts.filter(draft =>
      (!status || String(Number(draft.reviewStatus)) === status) &&
      (!search || `${draft.title} ${draft.createdBy}`.toLowerCase().includes(search))
    );
  }
```

Implement:

```js
async function loadDrafts()
function renderList()
function renderPagination()
async function openDetail(id)
function renderDetail(draft)
function closeDetail()
function updatePendingBadge()
function setBusy(value)
function showReviewMessage(key, fallback, success = false)
function init()
async function activate()
```

All interpolated draft strings must pass through `adminEscapeHtml`. Show review buttons only when `Number(draft.reviewStatus) === 1`. Resolve genre/theme names from `genreIds` and `themeIds`, falling back to `—`.

Expose:

```js
window.AdminTitleReview = {
  init,
  activate,
  refresh: loadDrafts
};
```

- [ ] **Step 4: Wire the module into Admin lifecycle**

In the DOM ready callback:

```js
window.AdminTitleReview?.init();
```

In `switchTab(tabName)`:

```js
if (tabName === 'title-review') window.AdminTitleReview?.activate();
```

Load `/js/admin-title-review.js?v=2.0` before `/js/admin.js`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
node --test backend.Tests/js/admin-title-review.test.cjs
```

Expected: all review structure and behavior-contract tests pass.

- [ ] **Step 6: Commit**

```powershell
git add backend.Tests/js/admin-title-review.test.cjs backend/wwwroot/js/admin-title-review.js backend/wwwroot/js/admin.js backend/Views/AdminView/Index.cshtml
git commit -m "feat: implement admin title review browser"
```

---

### Task 5: Implement safe approve/reject actions and refresh behavior

**Files:**
- Modify: `backend.Tests/js/admin-title-review.test.cjs`
- Modify: `backend/wwwroot/js/admin-title-review.js`

**Interfaces:**
- Consumes: `POST /api/admin/title-drafts/{id}/approve` and `POST /api/admin/title-drafts/{id}/reject` with `{ reason: string }`.
- Produces: blank rejection blocked client-side; duplicate submission prevented; successful action refreshes list and pending badge.

- [ ] **Step 1: Add failing action tests**

Append:

```js
test('title review validates rejection and prevents duplicate actions', () => {
  assert.match(script, /if \(!reason\)/);
  assert.match(script, /setBusy\(true\)/);
  assert.match(script, /if \(busy \|\| !selectedId\) return/);
  assert.match(script, /finally\s*\{\s*setBusy\(false\)/s);
});

test('successful review action refreshes list and returns to it', () => {
  assert.match(script, /await loadDrafts\(\)/);
  assert.match(script, /closeDetail\(\)/);
  assert.match(script, /updatePendingBadge\(\)/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test backend.Tests/js/admin-title-review.test.cjs
```

Expected: action tests fail because `approveSelected()` and `rejectSelected()` are not implemented.

- [ ] **Step 3: Add minimal guarded actions**

Implement:

```js
async function runAction(kind, body) {
  if (busy || !selectedId) return;
  setBusy(true);
  try {
    const response = await apiFetch(
      `${API_BASE}/admin/title-drafts/${selectedId}/${kind}`,
      { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showReviewMessage('', data.message || t('admin.reviewActionError', 'Thao tác thất bại.'));
      return;
    }
    closeDetail();
    await loadDrafts();
    showReviewMessage('', data.message || t('admin.reviewActionSuccess', 'Đã cập nhật.'), true);
  } finally {
    setBusy(false);
  }
}

async function rejectSelected() {
  const reason = document.getElementById('title-review-reason').value.trim();
  if (!reason) {
    showReviewMessage('admin.rejectionReasonRequired', 'Vui lòng nhập lý do từ chối.');
    return;
  }
  await runAction('reject', { reason });
}
```

Bind approve, reject, back, search, filter, and pagination controls once in `init()`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
node --test backend.Tests/js/admin-title-review.test.cjs
```

Expected: all review-module tests pass.

- [ ] **Step 5: Commit**

```powershell
git add backend.Tests/js/admin-title-review.test.cjs backend/wwwroot/js/admin-title-review.js
git commit -m "feat: add safe title review decisions"
```

---

### Task 6: Localize the integrated review workflow

**Files:**
- Modify: `backend.Tests/js/admin-localization.test.cjs`
- Modify: `backend/Views/AdminView/Index.cshtml`
- Modify: `backend/wwwroot/js/admin-title-review.js`
- Modify: `backend/wwwroot/locales/vi.json`
- Modify: `backend/wwwroot/locales/en.json`

**Interfaces:**
- Consumes: `t(key, fallback)` and `data-i18n`/`data-i18n-attr`.
- Produces: matching `admin.*` keys in both locale files; dynamic strings rerender when `languageChanged` fires.

- [ ] **Step 1: Add failing localization coverage**

Add to `admin-localization.test.cjs`:

```js
test('integrated title review copy exists in both locales', () => {
  for (const key of [
    'admin.titleReview',
    'admin.titleReviewDescription',
    'admin.searchTitleReview',
    'admin.allReviewStatuses',
    'admin.reviewingTitle',
    'admin.backToReviewList',
    'admin.rejectionReasonRequired',
    'admin.noTitlesForReview',
    'admin.reviewLoadError',
    'admin.reviewActionError'
  ]) {
    assert.equal(typeof en[key], 'string', `missing English key ${key}`);
    assert.equal(typeof vi[key], 'string', `missing Vietnamese key ${key}`);
  }
});

test('title review refreshes dynamic copy after language change', () => {
  const review = fs.readFileSync(path.join(root, 'backend', 'wwwroot', 'js', 'admin-title-review.js'), 'utf8');
  assert.match(review, /languageChanged/);
  assert.match(review, /renderList\(\)/);
  assert.match(review, /renderDetail/);
});
```

- [ ] **Step 2: Run localization tests and verify RED**

Run:

```powershell
node --test backend.Tests/js/admin-localization.test.cjs
```

Expected: missing review keys and missing language-change refresh fail.

- [ ] **Step 3: Add complete Vietnamese and English copy**

Add matching keys to both locale files, including:

```json
"admin.titleReview": "Duyệt truyện",
"admin.titleReviewDescription": "Kiểm tra các truyện đã gửi trước khi xuất bản.",
"admin.searchTitleReview": "Tìm theo tên truyện hoặc người tạo...",
"admin.allReviewStatuses": "Tất cả trạng thái",
"admin.reviewingTitle": "Chi tiết duyệt truyện",
"admin.backToReviewList": "Quay lại danh sách",
"admin.rejectionReasonRequired": "Vui lòng nhập lý do từ chối.",
"admin.noTitlesForReview": "Không có truyện phù hợp.",
"admin.reviewLoadError": "Không thể tải danh sách duyệt truyện.",
"admin.reviewActionError": "Không thể cập nhật trạng thái duyệt."
```

Use accurate English equivalents in `en.json`. Apply `data-i18n` to static Razor labels and `t()` to all generated table/detail/action messages.

- [ ] **Step 4: Refresh dynamic content on language changes**

Register:

```js
window.addEventListener('languageChanged', () => {
  if (!initialized) return;
  renderList();
  if (selectedId) {
    const selected = drafts.find(draft => Number(draft.id) === Number(selectedId));
    if (selected) renderDetail(selected);
  }
});
```

- [ ] **Step 5: Run localization and review tests**

Run:

```powershell
node --test backend.Tests/js/admin-localization.test.cjs backend.Tests/js/admin-title-review.test.cjs
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```powershell
git add backend.Tests/js/admin-localization.test.cjs backend/Views/AdminView/Index.cshtml backend/wwwroot/js/admin-title-review.js backend/wwwroot/locales/vi.json backend/wwwroot/locales/en.json
git commit -m "feat: localize title review workflow"
```

---

### Task 7: Final regression verification

**Files:**
- Verify only; modify files only if a failing test reveals a regression, using a new RED/GREEN cycle.

**Interfaces:**
- Consumes: all preceding tasks.
- Produces: a clean Release build and passing complete test suites.

- [ ] **Step 1: Run all JavaScript tests**

Run:

```powershell
node --test --test-reporter=dot backend.Tests/js
```

Expected: exit code 0 with no failed tests.

- [ ] **Step 2: Run all backend tests**

Run:

```powershell
dotnet test backend.Tests\MangaNPK.Tests.csproj --configuration Release --no-restore --verbosity quiet
```

Expected: exit code 0 with no failed tests.

- [ ] **Step 3: Build the application**

Run:

```powershell
dotnet build backend\MangaNPK.csproj --configuration Release --no-restore
```

Expected: `Build succeeded` with 0 errors.

- [ ] **Step 4: Check formatting and repository state**

Run:

```powershell
git diff --check
git status --short
```

Expected: `git diff --check` has no output; status contains only intentional implementation changes if the final verification itself required a fix.

- [ ] **Step 5: Commit any verification-only fix**

If Step 1–4 required a code correction, add its focused regression test first, then:

```powershell
git add backend.Tests/js/admin-title-review.test.cjs backend/wwwroot/js/admin-title-review.js backend/Views/AdminView/Index.cshtml backend/wwwroot/locales/vi.json backend/wwwroot/locales/en.json
git commit -m "fix: preserve integrated title review behavior"
```

If no correction was needed, do not create an empty commit.
