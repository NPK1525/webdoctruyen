# Admin Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi đầy đủ toàn bộ khu vực quản trị giữa tiếng Việt và tiếng Anh, đồng thời đổi chữ Admin Control Panel sang màu cam của tab đang chọn.

**Architecture:** Mở rộng từ điển chung bằng nhóm khóa `admin.*`. Razor dùng `data-i18n`, các module JavaScript dùng `t(...)` và render lại state hiện có khi nhận sự kiện `manganpk:localechanged`; không tạo hệ thống dịch riêng và không thay đổi API.

**Tech Stack:** ASP.NET Core MVC/Razor, JavaScript thuần, JSON locale, Node.js test runner, xUnit/.NET 10.

## Global Constraints

- Hai tệp `vi.json` và `en.json` phải có cùng tập khóa `admin.*`.
- Không dịch dữ liệu do người dùng nhập hoặc dữ liệu nghiệp vụ trả về từ API.
- Đổi ngôn ngữ không làm mất tab, dữ liệu form, bộ lọc hoặc phân trang.
- Chữ Admin Control Panel dùng `var(--accent-primary)`.
- Không thay đổi backend API.
- Không push Git.

---

### Task 1: Tạo hợp đồng từ điển admin và màu header

**Files:**
- Create: `backend.Tests/js/admin-localization.test.cjs`
- Modify: `backend/wwwroot/locales/vi.json`
- Modify: `backend/wwwroot/locales/en.json`
- Modify: `backend/wwwroot/js/i18n.js`
- Modify: `backend/Views/AdminView/Index.cshtml`
- Modify: `backend/wwwroot/css/style.css`

**Interfaces:**
- Produces: các khóa `admin.*`, dùng qua `t(key, fallback)` và `data-i18n`.
- Produces: CSS `.admin-panel-label { color:var(--accent-primary) }`.

- [ ] **Step 1: Viết kiểm thử thất bại cho từ điển và màu**

```js
test('admin dictionaries stay complete in Vietnamese and English', () => {
  const viKeys = Object.keys(vi).filter(key => key.startsWith('admin.')).sort();
  const enKeys = Object.keys(en).filter(key => key.startsWith('admin.')).sort();
  assert.deepEqual(viKeys, enKeys);
  for (const key of [
    'admin.controlPanel', 'admin.management', 'admin.mangaList',
    'admin.postManga', 'admin.addChapter', 'admin.importMangaDex',
    'admin.authors', 'admin.genres', 'admin.reports', 'admin.users',
    'admin.save', 'admin.cancel', 'admin.delete', 'admin.edit',
    'admin.loading', 'admin.noResults', 'admin.connectionError'
  ]) {
    assert.ok(vi[key], key);
    assert.ok(en[key], key);
  }
});

test('admin control panel label uses the selected-tab accent', () => {
  assert.doesNotMatch(view, /Admin Control Panel[^<]*<\/span>/i);
  assert.match(view, /data-i18n="admin\.controlPanel"/);
  assert.match(css, /\.admin-panel-label[^}]*color:\s*var\(--accent-primary\)/s);
});
```

- [ ] **Step 2: Chạy kiểm thử và xác nhận RED**

Run:

```powershell
node --test backend.Tests/js/admin-localization.test.cjs
```

Expected: FAIL vì locale chưa có tập khóa admin hoàn chỉnh và header còn màu đỏ inline.

- [ ] **Step 3: Thêm nhóm khóa chung vào hai locale**

Thêm cùng các khóa sau vào cả hai JSON với bản dịch tương ứng:

```text
admin.controlPanel
admin.management
admin.accessDenied
admin.accessDeniedBody
admin.backHome
admin.mangaList
admin.postManga
admin.editManga
admin.addChapter
admin.importMangaDex
admin.authors
admin.genres
admin.reports
admin.users
admin.search
admin.reset
admin.all
admin.status
admin.type
admin.source
admin.actions
admin.active
admin.locked
admin.lock
admin.unlock
admin.viewEdit
admin.save
admin.cancel
admin.delete
admin.edit
admin.add
admin.backToList
admin.loading
admin.noResults
admin.connectionError
admin.loadError
admin.saveSuccess
admin.deleteSuccess
admin.confirmDelete
admin.confirmLock
admin.confirmUnlock
admin.username
admin.email
admin.role
admin.badge
admin.avatarUrl
admin.biography
admin.userInfo
admin.resetPassword
admin.newPassword
admin.confirmPassword
admin.passwordMismatch
admin.passwordPolicy
```

- [ ] **Step 4: Tăng cache locale**

Trong `i18n.js`:

```js
const res = await fetch(`/locales/${locale}.json?v=4.0`, { cache: 'no-store' });
```

- [ ] **Step 5: Đổi nhãn và màu header**

Trong `Index.cshtml`:

```html
<span class="admin-panel-label" data-i18n="admin.controlPanel">Admin Control Panel</span>
```

Trong `style.css`:

```css
.admin-panel-label { color:var(--accent-primary); }
```

Xóa `color:#FF4552` khỏi style inline của nhãn.

- [ ] **Step 6: Chạy kiểm thử và xác nhận GREEN**

Run:

```powershell
node --test backend.Tests/js/admin-localization.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add backend.Tests/js/admin-localization.test.cjs backend/wwwroot/locales/vi.json backend/wwwroot/locales/en.json backend/wwwroot/js/i18n.js backend/Views/AdminView/Index.cshtml backend/wwwroot/css/style.css
git commit -m "feat: add admin localization dictionary"
```

---

### Task 2: Dịch giao diện tĩnh của Admin Control Panel

**Files:**
- Modify: `backend.Tests/js/admin-localization.test.cjs`
- Modify: `backend/Views/AdminView/Index.cshtml`
- Modify: `backend/wwwroot/locales/vi.json`
- Modify: `backend/wwwroot/locales/en.json`

**Interfaces:**
- Consumes: `I18N.apply()` và nhóm khóa `admin.*`.
- Produces: translation hook cho toàn bộ nhãn tĩnh trong pane admin.

- [ ] **Step 1: Viết kiểm thử thất bại cho translation hook**

```js
test('admin control panel static controls expose translation hooks', () => {
  for (const key of [
    'admin.management', 'admin.mangaList', 'admin.postManga',
    'admin.addChapter', 'admin.importMangaDex', 'admin.authors',
    'admin.genres', 'admin.reports', 'admin.users',
    'admin.userInfo', 'admin.resetPassword', 'admin.backToList'
  ]) {
    assert.match(view, new RegExp(`data-i18n="${key.replace('.', '\\.')}"`), key);
  }
  assert.match(view, /data-i18n="admin\.searchUsers"[^>]*data-i18n-attr="placeholder"/);
});
```

- [ ] **Step 2: Chạy kiểm thử và xác nhận RED**

Run:

```powershell
node --test backend.Tests/js/admin-localization.test.cjs
```

Expected: FAIL ở các nhãn chưa có `data-i18n`.

- [ ] **Step 3: Gắn khóa dịch cho menu, heading, form và filter**

Áp dụng mẫu:

```html
<span data-i18n="admin.users">Quản lý người dùng</span>
<input data-i18n="admin.searchUsers" data-i18n-attr="placeholder"
       placeholder="Tìm theo tên đăng nhập hoặc email...">
<option data-i18n="admin.allRoles" value="">Tất cả vai trò</option>
<button data-i18n="admin.reset">Đặt lại</button>
```

Thực hiện cho tất cả nội dung tĩnh trong các pane `manga-list`, `title-draft`, `manga`, `chapter`, `mangadex`, `author`, `genre`, `reports`, `users` và `user-edit`.

- [ ] **Step 4: Bổ sung khóa tĩnh phát sinh vào hai locale**

Thêm cùng khóa cho tiêu đề cột, label form, option filter, placeholder và nút được gắn ở Step 3. Kiểm tra hai JSON bằng:

```powershell
node --test backend.Tests/js/admin-localization.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend.Tests/js/admin-localization.test.cjs backend/Views/AdminView/Index.cshtml backend/wwwroot/locales/vi.json backend/wwwroot/locales/en.json
git commit -m "feat: translate admin control panel"
```

---

### Task 3: Dịch nội dung động của các module admin

**Files:**
- Modify: `backend.Tests/js/admin-localization.test.cjs`
- Modify: `backend/wwwroot/js/admin.js`
- Modify: `backend/wwwroot/js/admin-manga.js`
- Modify: `backend/wwwroot/js/admin-mangadex.js`
- Modify: `backend/wwwroot/js/admin-reports.js`
- Modify: `backend/wwwroot/js/admin-title-drafts.js`
- Modify: `backend/wwwroot/js/admin-upload.js`
- Modify: `backend/wwwroot/js/admin-users.js`
- Modify: `backend/Views/AdminView/Index.cshtml`
- Modify: `backend/wwwroot/locales/vi.json`
- Modify: `backend/wwwroot/locales/en.json`

**Interfaces:**
- Consumes: `t(key, fallback)` và sự kiện `manganpk:localechanged`.
- Produces: `AdminUsers.refreshLocale()` cùng render lại state của các module hiện có.

- [ ] **Step 1: Viết kiểm thử thất bại cho chuỗi động và refresh**

```js
test('dynamic admin modules translate and refresh on locale changes', () => {
  for (const [name, source] of Object.entries(modules)) {
    assert.match(source, /\bt\(['"]admin\./, name);
  }
  assert.match(users, /function refreshLocale\(\)/);
  assert.match(users, /window\.AdminUsers\s*=\s*\{[^}]*refreshLocale/s);
  assert.match(coordinator, /manganpk:localechanged/);
  assert.match(coordinator, /AdminUsers\?\.refreshLocale\(\)/);
});
```

- [ ] **Step 2: Chạy kiểm thử và xác nhận RED**

Run:

```powershell
node --test backend.Tests/js/admin-localization.test.cjs
```

Expected: FAIL ở module người dùng, báo cáo và upload còn chuỗi viết cứng.

- [ ] **Step 3: Thay chuỗi động bằng `t(...)`**

Áp dụng cho:

```js
t('admin.loadingUsers', 'Đang tải người dùng...')
t('admin.noUsers', 'Không tìm thấy người dùng phù hợp.')
t('admin.active', 'Hoạt động')
t('admin.locked', 'Đã khóa')
t('admin.viewEdit', 'Xem / Chỉnh sửa')
t('admin.connectionError', 'Lỗi kết nối.')
```

Làm tương ứng cho loading, empty state, nút hành động, xác nhận, toast và lỗi fallback trong mọi module được liệt kê.

- [ ] **Step 4: Thêm refresh locale không gọi lại API**

Trong `admin-users.js`:

```js
function refreshLocale() {
  if (state.lastItems) {
    renderRows(state.lastItems);
    renderSummary(state.totalItems);
    renderPagination();
  }
  if (state.editorUser) renderEditor();
}

window.AdminUsers = { init, activate, refreshLocale };
```

Lưu `lastItems` và `totalItems` từ payload trong `load()`.

Trong `admin.js`:

```js
window.addEventListener('manganpk:localechanged', () => {
  window.AdminUsers?.refreshLocale();
  renderMangasTable();
  renderAuthorsManagementList();
  renderGenresManagementList();
  window.AdminReports?.refreshLocale?.();
  window.AdminTitleDrafts?.refreshLocale?.();
});
```

Các render function phải bảo vệ trường hợp state chưa tải.

- [ ] **Step 5: Tăng cache script admin**

Trong `Index.cshtml`, tăng phiên bản các script đã thay đổi thêm một minor version; ví dụ:

```html
<script src="/js/admin-users.js?v=1.4"></script>
<script src="/js/admin.js?v=4.0"></script>
```

- [ ] **Step 6: Chạy kiểm thử tập trung và xác nhận GREEN**

Run:

```powershell
node --test backend.Tests/js/admin-localization.test.cjs backend.Tests/js/admin-user-management.test.cjs backend.Tests/js/admin-module-order.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add backend.Tests/js/admin-localization.test.cjs backend/wwwroot/js/admin*.js backend/Views/AdminView/Index.cshtml backend/wwwroot/locales/vi.json backend/wwwroot/locales/en.json
git commit -m "feat: translate dynamic admin content"
```

---

### Task 4: Dịch các trang admin có route riêng

**Files:**
- Modify: `backend.Tests/js/admin-localization.test.cjs`
- Modify: `backend/Views/AdminView/Authors.cshtml`
- Modify: `backend/Views/AdminView/Genres.cshtml`
- Modify: `backend/Views/AdminView/Reports.cshtml`
- Modify: `backend/Views/AdminView/UserDetail.cshtml`
- Modify: `backend/wwwroot/js/admin-user-detail.js`
- Modify: `backend/wwwroot/locales/vi.json`
- Modify: `backend/wwwroot/locales/en.json`

**Interfaces:**
- Consumes: cùng `admin.*` dictionary và `I18N.apply()`.
- Produces: các trang admin riêng có cùng hành vi đổi Việt/Anh.

- [ ] **Step 1: Viết kiểm thử thất bại cho các view riêng**

```js
test('standalone admin pages use the shared locale system', () => {
  for (const [name, source] of Object.entries(adminViews)) {
    assert.match(source, /\/js\/i18n\.js/, name);
    assert.match(source, /data-i18n="admin\./, name);
    assert.match(source, /admin-panel-label/, name);
  }
  assert.match(userDetailScript, /\bt\(['"]admin\./);
});
```

- [ ] **Step 2: Chạy kiểm thử và xác nhận RED**

Run:

```powershell
node --test backend.Tests/js/admin-localization.test.cjs
```

Expected: FAIL vì các trang route riêng chưa tải `i18n.js` hoặc chưa có hook.

- [ ] **Step 3: Thêm i18n và hook vào từng view**

Đảm bảo thứ tự script:

```html
<script src="/js/i18n.js?v=4.0"></script>
<script src="/js/common-auth.js?v=1.0"></script>
<script src="/js/common.js?v=5.8"></script>
```

Gắn `data-i18n`/`data-i18n-attr` cho heading, mô tả, label, nút và placeholder. Đổi nhãn Admin Control Panel sang `data-i18n="admin.controlPanel"`.

- [ ] **Step 4: Dịch JavaScript chi tiết người dùng**

Đổi toast, confirm, loading và lỗi fallback trong `admin-user-detail.js` sang `t('admin.*', fallback)`, sau đó tăng cache script trong `UserDetail.cshtml`.

- [ ] **Step 5: Chạy kiểm thử và xác nhận GREEN**

Run:

```powershell
node --test backend.Tests/js/admin-localization.test.cjs backend.Tests/js/admin-user-security.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend.Tests/js/admin-localization.test.cjs backend/Views/AdminView backend/wwwroot/js/admin-user-detail.js backend/wwwroot/locales/vi.json backend/wwwroot/locales/en.json
git commit -m "feat: translate standalone admin pages"
```

---

### Task 5: Kiểm thử hồi quy

**Files:**
- Verify only.

**Interfaces:**
- Consumes: toàn bộ thay đổi Task 1–4.
- Produces: bằng chứng locale, JavaScript, backend và build đều sạch.

- [ ] **Step 1: Kiểm tra JSON và JavaScript**

Run:

```powershell
Get-Content -Raw backend/wwwroot/locales/vi.json | ConvertFrom-Json | Out-Null
Get-Content -Raw backend/wwwroot/locales/en.json | ConvertFrom-Json | Out-Null
Get-ChildItem backend/wwwroot/js -Filter 'admin*.js' | ForEach-Object { node --check $_.FullName }
```

Expected: exit code 0.

- [ ] **Step 2: Chạy toàn bộ kiểm thử JavaScript**

Run:

```powershell
node --test backend.Tests/js
```

Expected: 0 failed.

- [ ] **Step 3: Chạy backend và build**

Run:

```powershell
dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore --verbosity quiet
dotnet build backend/MangaNPK.csproj -c Release --no-restore --verbosity quiet
```

Expected: 0 failed, 0 errors, 0 warnings.

- [ ] **Step 4: Kiểm tra Git**

Run:

```powershell
git diff --check
git status --short
```

Expected: không có lỗi khoảng trắng và không có file ngoài phạm vi.
