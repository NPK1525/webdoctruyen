# Manga Detail Cleanup and Consistent Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bỏ giao diện upload chapter tĩnh, bỏ số lượng khỏi tiêu đề danh sách chương và chuẩn hóa hero/banner chi tiết bằng ảnh bìa.

**Architecture:** Contract tests đọc Razor/CSS/JavaScript/controller để khóa hành vi trước khi sửa. Trang chi tiết tiếp tục dùng `CoverUrl`; CSS cố định hero desktop và cho mobile tự co. Route GET cũ chỉ redirect về Admin, còn POST/view/assets cũ được xóa trong khi API chapter hiện tại giữ nguyên.

**Tech Stack:** ASP.NET Core MVC Razor, CSS, JavaScript thuần, Node.js `node:test`, xUnit/.NET 10.

## Global Constraints

- Không thay đổi model Manga, database hoặc migration.
- Không thay đổi API chapter và mục **Thêm chương mới** trong trang Admin.
- Desktop hero cố định `430px`, ảnh bìa `250px × 356px`; mobile tối đa `768px` dùng hero tự động và ảnh bìa `145px × 210px`.
- Ảnh nền hero dùng `CoverUrl`, `object-fit: cover`, căn giữa và có blur/overlay.
- URL GET cũ `/admin/chapter/create/{mangaId}` redirect về Admin; POST cũ không còn tồn tại.

---

### Task 1: Khóa và triển khai giao diện chi tiết truyện

**Files:**
- Create: `backend.Tests/js/manga-detail-banner-cleanup.test.cjs`
- Modify: `backend/Views/MangaView/Detail.cshtml:42-124`
- Modify: `backend/wwwroot/js/detail.js:140-155,255-264`
- Modify: `backend/wwwroot/css/style.css:470-535,855-880,1255-1275`

**Interfaces:**
- Consumes: `mangaDetail.coverUrl`, `#banner-bg-container`, `.detail-banner`, `.detail-cover`, `#chapters-count-label`.
- Produces: hero desktop cố định, mobile tự co, tiêu đề `Danh sách chương` không có số và không còn `#btn-upload-chapter`.

- [ ] **Step 1: Viết test thất bại**

Tạo `backend.Tests/js/manga-detail-banner-cleanup.test.cjs`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const view = fs.readFileSync(path.join(root, 'backend/Views/MangaView/Detail.cshtml'), 'utf8');
const script = fs.readFileSync(path.join(root, 'backend/wwwroot/js/detail.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'backend/wwwroot/css/style.css'), 'utf8');

test('manga detail no longer exposes the legacy chapter upload entry', () => {
  assert.doesNotMatch(view, /btn-upload-chapter|\/admin\/chapter\/create/);
});

test('chapter list heading never includes the total count', () => {
  assert.match(view, /id="chapters-count-label"[^>]*>Danh [Ss]ách [Cc]hương<\/h3>/);
  assert.doesNotMatch(view, /Danh [Ss]ách [Cc]hương\s*\(0\)/);
  assert.doesNotMatch(script, /chapterList[^\n]*mangaDetail\.chapters\.length/);
});

test('detail banner uses cover art in a fixed desktop frame', () => {
  assert.match(script, /src="\$\{mangaDetail\.coverUrl\}" class="banner-bg-img"/);
  assert.match(css, /\.detail-page \.detail-banner\s*\{[^}]*height:\s*430px/s);
  assert.match(css, /\.detail-page \.detail-banner\s*\{[^}]*min-height:\s*430px/s);
  assert.match(css, /\.detail-page \.detail-cover\s*\{[^}]*height:\s*356px[^}]*width:\s*250px/s);
  assert.match(css, /\.detail-banner \.banner-bg-img\s*\{[^}]*object-fit:\s*cover[^}]*object-position:\s*center/s);
});

test('detail banner returns to automatic height on mobile', () => {
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.detail-page \.detail-banner\s*\{[^}]*height:\s*auto[^}]*min-height:\s*0/s);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.detail-cover\s*\{[^}]*width:\s*145px[^}]*height:\s*210px/s);
});
```

- [ ] **Step 2: Chạy test và xác nhận FAIL đúng lý do**

```powershell
node --test backend.Tests/js/manga-detail-banner-cleanup.test.cjs
```

Expected: FAIL vì nút upload, số lượng chương và CSS hero tự giãn vẫn còn.

- [ ] **Step 3: Sửa Razor và JavaScript tối thiểu**

- Xóa khối `@if (ViewBag.CanManageChapters == true)` chứa `btn-upload-chapter`.
- Đổi nội dung `#chapters-count-label` thành `Danh sách chương`.
- Trong `renderChaptersList()`, gán `countLabel.textContent = t('detail.chapterList', 'Danh sách chương')` mà không nối `.length`.
- Giữ nguyên đoạn render nền từ `mangaDetail.coverUrl`.

- [ ] **Step 4: Chuẩn hóa CSS hero**

Thêm/điều chỉnh:

```css
.detail-banner .banner-bg-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
.detail-page .detail-banner {
  height: 430px;
  min-height: 430px;
}
.detail-page .detail-banner-content {
  height: 360px;
  min-height: 0;
  overflow: hidden;
}
.detail-page .detail-info {
  max-height: 356px;
  overflow: hidden;
}
@media (max-width: 768px) {
  .detail-page .detail-banner { height: auto; min-height: 0; }
  .detail-page .detail-banner-content { height: auto; overflow: visible; }
  .detail-page .detail-info { max-height: none; overflow: visible; }
}
```

Giữ kích thước cover desktop/mobile hiện có và bảo đảm selector thỏa contract test.

- [ ] **Step 5: Chạy test Task 1**

```powershell
node --test backend.Tests/js/manga-detail-banner-cleanup.test.cjs
```

Expected: 4 tests PASS.

- [ ] **Step 6: Commit Task 1**

```powershell
git add backend.Tests/js/manga-detail-banner-cleanup.test.cjs backend/Views/MangaView/Detail.cshtml backend/wwwroot/js/detail.js backend/wwwroot/css/style.css
git commit -m "style: standardize manga detail banner"
```

---

### Task 2: Xóa giao diện upload chapter tĩnh và giữ redirect an toàn

**Files:**
- Create: `backend.Tests/js/legacy-chapter-upload-removal.test.cjs`
- Modify: `backend/Controllers/AdminViewController.cs:9-20,174-308`
- Modify: `backend/Filters/RequireAdminAttribute.cs:55-64`
- Modify: `backend/Views/AdminView/MangaList.cshtml:43-50`
- Delete: `backend/Views/AdminView/ChapterCreate.cshtml`
- Delete: `backend/wwwroot/css/chapter-upload.css`
- Delete: `backend/wwwroot/js/chapter-upload.js`
- Delete: `backend/wwwroot/js/chapter-file-order.js`
- Delete: `backend.Tests/js/chapter-file-order.test.cjs`

**Interfaces:**
- Consumes: `AdminViewController.Index()` và route GET `chapter/create/{mangaId:int}`.
- Produces: GET `ChapterCreate(int mangaId)` redirect về `Index`; không còn POST overload, view hoặc asset upload tĩnh.

- [ ] **Step 1: Viết contract test thất bại**

Tạo `backend.Tests/js/legacy-chapter-upload-removal.test.cjs`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const controller = fs.readFileSync(path.join(root, 'backend/Controllers/AdminViewController.cs'), 'utf8');
const filter = fs.readFileSync(path.join(root, 'backend/Filters/RequireAdminAttribute.cs'), 'utf8');
const mangaList = fs.readFileSync(path.join(root, 'backend/Views/AdminView/MangaList.cshtml'), 'utf8');

test('legacy chapter create GET redirects to the admin index', () => {
  assert.match(controller, /\[HttpGet\("chapter\/create\/\{mangaId:int\}"\)\][\s\S]*?IActionResult ChapterCreate\(int mangaId\)[\s\S]*?RedirectToAction\(nameof\(Index\)\)/);
  assert.doesNotMatch(controller, /\[HttpPost\("chapter\/create/);
});

test('legacy chapter upload view and assets are removed', () => {
  for (const file of [
    'backend/Views/AdminView/ChapterCreate.cshtml',
    'backend/wwwroot/css/chapter-upload.css',
    'backend/wwwroot/js/chapter-upload.js',
    'backend/wwwroot/js/chapter-file-order.js'
  ]) assert.equal(fs.existsSync(path.join(root, file)), false, file);
});

test('remaining admin UI and contributor filter do not reference ChapterCreate', () => {
  assert.doesNotMatch(mangaList, /ChapterCreate|chapter\/create/);
  assert.doesNotMatch(filter, /string\.Equals\(actionName, "ChapterCreate"/);
});
```

- [ ] **Step 2: Chạy test và xác nhận FAIL đúng lý do**

```powershell
node --test backend.Tests/js/legacy-chapter-upload-removal.test.cjs
```

Expected: FAIL vì POST action, view/assets và liên kết cũ vẫn tồn tại.

- [ ] **Step 3: Thay route GET cũ bằng redirect và xóa POST cũ**

Trong `AdminViewController.cs`, giữ:

```csharp
[HttpGet("chapter/create/{mangaId:int}")]
public IActionResult ChapterCreate(int mangaId) => RedirectToAction(nameof(Index));
```

Xóa toàn bộ POST overload `ChapterCreate`, local helper `ChapterCreateError`, dependency `IWebHostEnvironment`, `ILogger<AdminViewController>` và các field tương ứng. Constructor còn:

```csharp
public class AdminViewController(MangaDbContext context) : Controller
```

- [ ] **Step 4: Xóa entry point, view và asset không còn dùng**

- Xóa liên kết `asp-action="ChapterCreate"` trong `MangaList.cshtml`.
- Bỏ `ChapterCreate` khỏi điều kiện `isChapterAction` trong `RequireAdminAttribute.cs`, giữ `GetChapterForEditing` và `UpdateChapter`.
- Xóa bốn file view/CSS/JavaScript trong danh sách Files và xóa test `chapter-file-order.test.cjs` vốn chỉ kiểm tra asset đã bỏ.

- [ ] **Step 5: Chạy test Task 2**

```powershell
node --test backend.Tests/js/legacy-chapter-upload-removal.test.cjs
```

Expected: 3 tests PASS.

- [ ] **Step 6: Chạy toàn bộ kiểm thử**

```powershell
$tests = Get-ChildItem backend.Tests\js\*.test.cjs | ForEach-Object { $_.FullName }
node --test $tests
dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore
dotnet build backend/MangaNPK.csproj --no-restore
```

Expected: tất cả JavaScript/.NET tests PASS; build có 0 error.

- [ ] **Step 7: Commit Task 2**

```powershell
git add -A backend/Controllers/AdminViewController.cs backend/Filters/RequireAdminAttribute.cs backend/Views/AdminView backend/wwwroot/css backend/wwwroot/js backend.Tests/js
git commit -m "refactor: remove legacy chapter upload page"
```
