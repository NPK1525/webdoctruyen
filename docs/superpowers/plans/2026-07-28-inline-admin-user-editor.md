# Inline Admin User Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay drawer chỉnh sửa người dùng bằng một màn chỉnh sửa toàn chiều rộng nằm trong Admin Control Panel, hoạt động giống luồng chỉnh sửa truyện.

**Architecture:** Tái sử dụng cơ chế `switchTab(...)` hiện có của trang quản trị. `admin-users.js` tiếp tục sở hữu trạng thái danh sách và các lệnh gọi API, nhưng chuyển phần hiển thị chi tiết từ overlay sang pane `adm-content-user-edit`; backend và endpoint không thay đổi.

**Tech Stack:** ASP.NET Core MVC/Razor, JavaScript thuần, CSS dùng biến giao diện chung, Node.js test runner, xUnit/.NET 10.

## Global Constraints

- Không mở route hoặc trang MVC riêng khi chỉnh sửa người dùng.
- Không giữ lại overlay, drawer hoặc trạng thái khóa cuộn.
- Giữ nguyên tìm kiếm, bộ lọc và phân trang khi quay lại danh sách.
- Giữ nguyên các endpoint quản trị người dùng hiện tại.
- Không push Git trong quá trình triển khai.

---

### Task 1: Chuyển giao diện drawer thành pane chỉnh sửa trong Admin Control Panel

**Files:**
- Modify: `backend.Tests/js/admin-user-management.test.cjs`
- Modify: `backend/Views/AdminView/Index.cshtml`
- Modify: `backend/wwwroot/css/style.css`

**Interfaces:**
- Consumes: `switchTab(tabName: string)` và quy ước pane `id="adm-content-{tabName}"`.
- Produces: pane `adm-content-user-edit`, nút `admin-user-editor-back`, các form/input mang ID `admin-user-editor-*`.

- [ ] **Step 1: Viết kiểm thử thất bại cho pane chỉnh sửa**

Thay kiểm thử drawer hiện tại bằng các khẳng định:

```js
test('admin user editor is an in-panel tab like manga editing', () => {
  assert.match(view, /id="adm-content-user-edit"/);
  assert.match(view, /id="admin-user-editor-back"/);
  assert.match(view, /id="admin-user-editor-form"/);
  assert.doesNotMatch(view, /admin-user-drawer-overlay/);
  assert.doesNotMatch(css, /\.admin-user-drawer/);
});
```

- [ ] **Step 2: Chạy kiểm thử để xác nhận RED**

Run:

```powershell
node --test backend.Tests/js/admin-user-management.test.cjs
```

Expected: FAIL vì view vẫn chứa `admin-user-drawer-overlay` và chưa có `adm-content-user-edit`.

- [ ] **Step 3: Thay markup drawer bằng pane quản trị**

Trong `Index.cshtml`, đặt pane mới cạnh `adm-content-users`:

```html
<div id="adm-content-user-edit" class="admin-tab-pane" style="display:none;">
  <button type="button" id="admin-user-editor-back" class="admin-back-button">
    <i data-lucide="arrow-left"></i>
    Quay lại danh sách người dùng
  </button>
  <div class="admin-user-editor-header">
    <img id="admin-user-editor-avatar-preview" class="admin-user-editor-avatar" alt="">
    <div>
      <h3 id="admin-user-editor-name">Chỉnh sửa người dùng</h3>
      <p id="admin-user-editor-email-preview"></p>
      <span id="admin-user-editor-status" class="admin-user-badge"></span>
    </div>
  </div>
  <div id="admin-user-editor-message" class="admin-user-editor-message" hidden></div>
  <div id="admin-user-editor-loading" class="management-empty" hidden>Đang tải người dùng...</div>
  <div id="admin-user-editor-content" hidden>
    <div class="admin-user-detail-profile">
      <img id="admin-user-editor-avatar-preview" src="/img/dragon_ball.png" alt="">
      <div>
        <strong id="admin-user-editor-name"></strong>
        <span id="admin-user-editor-email-preview"></span>
      </div>
      <span id="admin-user-editor-status" class="admin-user-badge"></span>
    </div>
    <div class="admin-user-editor-sections">
      <form id="admin-user-editor-form">
        <div class="admin-user-detail-grid">
          <label class="form-group"><span class="form-label">Tên đăng nhập</span><input id="admin-user-editor-username" class="form-control" required minlength="3" maxlength="24"></label>
          <label class="form-group"><span class="form-label">Email</span><input id="admin-user-editor-email" class="form-control" type="email" required maxlength="254"></label>
          <label class="form-group"><span class="form-label">Vai trò</span><select id="admin-user-editor-role" class="form-control"><option value="User">User</option><option value="Admin">Admin</option></select></label>
          <label class="form-group"><span class="form-label">Huy hiệu</span><input id="admin-user-editor-badge" class="form-control" maxlength="50"></label>
          <label class="form-group admin-user-detail-wide"><span class="form-label">Ảnh đại diện (URL)</span><input id="admin-user-editor-avatar" class="form-control" type="url" maxlength="2048" pattern="https://.*"></label>
          <label class="form-group admin-user-detail-wide"><span class="form-label">Tiểu sử</span><textarea id="admin-user-editor-bio" class="form-control" maxlength="500" rows="4"></textarea></label>
        </div>
        <div class="admin-user-detail-actions">
          <button id="admin-user-editor-lock" type="button" class="btn btn-secondary"></button>
          <button id="admin-user-editor-save" type="submit" class="btn btn-primary"><i data-lucide="save"></i> Lưu thông tin</button>
        </div>
      </form>
      <form id="admin-user-editor-password-form" class="admin-user-editor-password">
        <h3>Đặt lại mật khẩu</h3>
        <label class="form-group"><span class="form-label">Mật khẩu mới</span><input id="admin-user-editor-new-password" class="form-control" type="password" required minlength="8" maxlength="128" autocomplete="new-password"></label>
        <label class="form-group"><span class="form-label">Xác nhận mật khẩu</span><input id="admin-user-editor-confirm-password" class="form-control" type="password" required minlength="8" maxlength="128" autocomplete="new-password"></label>
        <div class="admin-user-detail-actions">
          <button id="admin-user-editor-password-save" type="submit" class="btn btn-primary"><i data-lucide="key-round"></i> Đặt lại mật khẩu</button>
        </div>
      </form>
    </div>
  </div>
</div>
```

Xóa toàn bộ `admin-user-drawer-overlay` và markup drawer cũ.

- [ ] **Step 4: Thay CSS drawer bằng CSS pane**

Xóa các selector `.admin-user-drawer-*`, `.admin-user-drawer-open` và thêm:

```css
.admin-user-editor-shell {
  display: grid;
  gap: 24px;
}

.admin-user-editor-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--surface-raised);
}

.admin-user-editor-sections {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, .7fr);
  gap: 20px;
}

@media (max-width: 800px) {
  .admin-user-editor-sections {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Chạy kiểm thử để xác nhận GREEN**

Run:

```powershell
node --test backend.Tests/js/admin-user-management.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend.Tests/js/admin-user-management.test.cjs backend/Views/AdminView/Index.cshtml backend/wwwroot/css/style.css
git commit -m "refactor: move user editor into admin panel"
```

---

### Task 2: Chuyển hành vi chỉnh sửa sang cơ chế switchTab

**Files:**
- Modify: `backend.Tests/js/admin-user-management.test.cjs`
- Modify: `backend/wwwroot/js/admin-users.js`
- Modify: `backend/Views/AdminView/Index.cshtml`

**Interfaces:**
- Consumes: pane và control `admin-user-editor-*` từ Task 1; `switchTab('user-edit')`; `switchTab('users')`.
- Produces: `openEditor(userId)`, `closeEditor()`, `renderEditor()`, `saveEditor(event)`, `toggleEditorLock()`, `resetEditorPassword(event)`.

- [ ] **Step 1: Viết kiểm thử thất bại cho điều hướng nội bộ**

Thêm các khẳng định:

```js
test('user editing switches between list and editor without navigation', () => {
  assert.match(js, /function openEditor\(userId\)/);
  assert.match(js, /switchTab\('user-edit'\)/);
  assert.match(js, /function closeEditor\(\)/);
  assert.match(js, /switchTab\('users'\)/);
  assert.doesNotMatch(js, /openDrawer|closeDrawer|drawerUser/);
  assert.doesNotMatch(js, /location\.(href|assign)/);
});

test('returning from user editor preserves list state', () => {
  assert.match(js, /function closeEditor\(\)[\s\S]*?switchTab\('users'\)/);
  assert.doesNotMatch(js, /function closeEditor\(\)[\s\S]*?state\.page\s*=\s*1/);
});
```

- [ ] **Step 2: Chạy kiểm thử để xác nhận RED**

Run:

```powershell
node --test backend.Tests/js/admin-user-management.test.cjs
```

Expected: FAIL vì JavaScript hiện dùng `openDrawer`, `closeDrawer` và trạng thái `drawerUser`.

- [ ] **Step 3: Đổi trạng thái và hàm drawer thành editor**

Trong `admin-users.js`:

```js
const state = {
  initialized: false,
  loaded: false,
  loading: false,
  page: 1,
  pageSize: 20,
  totalPages: 1,
  timer: null,
  editorUserId: null,
  editorUser: null
};

async function openEditor(userId) {
  state.editorUserId = userId;
  state.editorUser = null;
  byId('admin-user-editor-loading').hidden = false;
  byId('admin-user-editor-content').hidden = true;
  byId('admin-user-editor-message').hidden = true;

  try {
    const response = await apiFetch(`${API_BASE}/admin/users/${userId}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || 'Không thể tải thông tin người dùng.');
    }
    state.editorUser = payload;
    renderEditor();
    byId('admin-user-editor-loading').hidden = true;
    byId('admin-user-editor-content').hidden = false;
    switchTab('user-edit');
  } catch (error) {
    showToast(error.message, false);
  }
}

function closeEditor() {
  state.editorUserId = null;
  state.editorUser = null;
  byId('admin-user-editor-password-form').reset();
  byId('admin-user-editor-message').hidden = true;
  switchTab('users');
}
```

Đổi các hàm save/lock/password và ID DOM từ `drawer` sang `editor`. Không thay đổi URL endpoint hay payload.

- [ ] **Step 4: Kết nối nút và form**

Trong `init()`:

```js
byId('admin-user-editor-back')?.addEventListener('click', closeEditor);
byId('admin-user-editor-form')?.addEventListener('submit', saveEditor);
byId('admin-user-editor-lock')?.addEventListener('click', toggleEditorLock);
byId('admin-user-editor-password-form')?.addEventListener('submit', resetEditorPassword);
```

Trong danh sách:

```js
root.querySelectorAll('[data-user-edit]').forEach(button => {
  button.addEventListener('click', () => openEditor(Number(button.dataset.userEdit)));
});
```

- [ ] **Step 5: Tăng phiên bản cache của script**

Trong `Index.cshtml`:

```html
<script src="/js/admin-users.js?v=1.3"></script>
```

- [ ] **Step 6: Chạy kiểm thử tập trung để xác nhận GREEN**

Run:

```powershell
node --test backend.Tests/js/admin-user-management.test.cjs backend.Tests/js/admin-user-security.test.cjs backend.Tests/js/csrf-api-fetch.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add backend.Tests/js/admin-user-management.test.cjs backend/wwwroot/js/admin-users.js backend/Views/AdminView/Index.cshtml
git commit -m "feat: edit users in admin content pane"
```

---

### Task 3: Kiểm thử hồi quy và hoàn tất

**Files:**
- Verify only.

**Interfaces:**
- Consumes: toàn bộ thay đổi từ Task 1 và Task 2.
- Produces: bằng chứng kiểm thử và build sạch.

- [ ] **Step 1: Kiểm tra cú pháp JavaScript**

Run:

```powershell
node --check backend/wwwroot/js/admin-users.js
```

Expected: exit code 0.

- [ ] **Step 2: Chạy toàn bộ kiểm thử JavaScript**

Run:

```powershell
node --test backend.Tests/js
```

Expected: 0 failed.

- [ ] **Step 3: Chạy toàn bộ kiểm thử backend**

Run:

```powershell
dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore --verbosity quiet
```

Expected: 0 failed.

- [ ] **Step 4: Build Release**

Run:

```powershell
dotnet build backend/MangaNPK.csproj -c Release --no-restore --verbosity quiet
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Kiểm tra Git**

Run:

```powershell
git diff --check
git status --short
```

Expected: không có lỗi khoảng trắng; chỉ có thay đổi thuộc tính năng này nếu chưa commit.
