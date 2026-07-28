# Admin User Editing Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let administrators view, edit, lock, and reset a user's password in a right-side drawer without leaving `/admin?tab=users`.

**Architecture:** The existing admin index owns the drawer markup and `admin-users.js` owns its state and API calls. Existing admin-user endpoints and `apiFetch` remain unchanged; `/admin/users/{id}` stays available as a compatibility route.

**Tech Stack:** ASP.NET Core Razor, vanilla JavaScript, shared CSS theme variables, Node.js built-in test runner, xUnit.

## Global Constraints

- Do not change the user API contracts or database schema.
- Keep `/admin/users/{id}` and `UserDetail.cshtml` available.
- Preserve search, role/status filters, pagination, and scroll position when the drawer opens or updates.
- Use `apiFetch` for every unsafe request.
- The drawer must be keyboard accessible and full-width on small screens.
- Do not push to GitHub.

---

### Task 1: Add the Drawer Shell and Responsive Styling

**Files:**
- Modify: `backend.Tests/js/admin-users.test.cjs`
- Modify: `backend/Views/AdminView/Index.cshtml`
- Modify: `backend/wwwroot/css/style.css`

**Interfaces:**
- Consumes: Existing `#admin-user-list` and `.admin-user-detail-*` visual patterns.
- Produces: Drawer elements prefixed with `admin-user-drawer-` for Task 2.

- [ ] **Step 1: Write the failing drawer-shell test**

Add this test to `backend.Tests/js/admin-users.test.cjs`:

```js
test('admin user editor is an accessible responsive drawer inside the control panel', () => {
  for (const id of [
    'admin-user-drawer-overlay', 'admin-user-drawer', 'admin-user-drawer-close',
    'admin-user-drawer-form', 'admin-user-drawer-username',
    'admin-user-drawer-email', 'admin-user-drawer-role',
    'admin-user-drawer-avatar', 'admin-user-drawer-badge',
    'admin-user-drawer-bio', 'admin-user-drawer-lock',
    'admin-user-drawer-save', 'admin-user-drawer-password-form',
    'admin-user-drawer-new-password', 'admin-user-drawer-confirm-password',
    'admin-user-drawer-password-save'
  ]) {
    assert.match(view, new RegExp(`id="${id}"`), id);
  }
  assert.match(view, /role="dialog"/);
  assert.match(view, /aria-modal="true"/);
  assert.match(view, /aria-labelledby="admin-user-drawer-title"/);
  assert.match(css, /\.admin-user-drawer-overlay/);
  assert.match(css, /\.admin-user-drawer\s*\{/);
  assert.match(css, /@media\s*\(max-width:\s*700px\)[\s\S]*?\.admin-user-drawer\s*\{[^}]*width:\s*100%/);
});
```

At the top of the test file, expose:

```js
const view = fs.readFileSync(path.join(root, 'Views/AdminView/Index.cshtml'), 'utf8');
const css = fs.readFileSync(path.join(root, 'wwwroot/css/style.css'), 'utf8');
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```text
node --test backend.Tests/js/admin-users.test.cjs
```

Expected: FAIL because the drawer IDs and styles do not exist.

- [ ] **Step 3: Add the drawer markup**

Insert after the admin main content and before page scripts in `Index.cshtml`:

```html
<div id="admin-user-drawer-overlay" class="admin-user-drawer-overlay" hidden>
  <aside id="admin-user-drawer" class="admin-user-drawer" role="dialog"
         aria-modal="true" aria-labelledby="admin-user-drawer-title" tabindex="-1">
    <header class="admin-user-drawer-header">
      <div>
        <span class="admin-panel-label">USER MANAGEMENT</span>
        <h2 id="admin-user-drawer-title">Chi tiết người dùng</h2>
      </div>
      <button id="admin-user-drawer-close" type="button" class="admin-user-drawer-close"
              aria-label="Đóng"><i data-lucide="x"></i></button>
    </header>
    <div id="admin-user-drawer-message" class="admin-user-detail-message" hidden></div>
    <div id="admin-user-drawer-loading" class="management-empty">Đang tải người dùng...</div>
    <div id="admin-user-drawer-content" hidden>
      <div class="admin-user-detail-profile">
        <img id="admin-user-drawer-avatar-preview" src="/img/dragon_ball.png" alt="">
        <div><strong id="admin-user-drawer-name"></strong><span id="admin-user-drawer-email-preview"></span></div>
        <span id="admin-user-drawer-status" class="admin-user-badge"></span>
      </div>
      <form id="admin-user-drawer-form">
        <div class="admin-user-detail-grid">
          <label class="form-group"><span class="form-label">Tên đăng nhập</span><input id="admin-user-drawer-username" class="form-control" required minlength="3" maxlength="24"></label>
          <label class="form-group"><span class="form-label">Email</span><input id="admin-user-drawer-email" class="form-control" type="email" required maxlength="254"></label>
          <label class="form-group"><span class="form-label">Vai trò</span><select id="admin-user-drawer-role" class="form-control"><option value="User">User</option><option value="Admin">Admin</option></select></label>
          <label class="form-group"><span class="form-label">Huy hiệu</span><input id="admin-user-drawer-badge" class="form-control" maxlength="50"></label>
          <label class="form-group admin-user-detail-wide"><span class="form-label">Ảnh đại diện (URL)</span><input id="admin-user-drawer-avatar" class="form-control" type="url" maxlength="2048" pattern="https://.*"></label>
          <label class="form-group admin-user-detail-wide"><span class="form-label">Tiểu sử</span><textarea id="admin-user-drawer-bio" class="form-control" maxlength="500" rows="4"></textarea></label>
        </div>
        <div class="admin-user-detail-actions">
          <button id="admin-user-drawer-lock" type="button" class="btn btn-secondary"></button>
          <button id="admin-user-drawer-save" type="submit" class="btn btn-primary"><i data-lucide="save"></i> Lưu thông tin</button>
        </div>
      </form>
      <form id="admin-user-drawer-password-form" class="admin-user-drawer-password">
        <h3>Đặt lại mật khẩu</h3>
        <div class="admin-user-detail-grid">
          <label class="form-group"><span class="form-label">Mật khẩu mới</span><input id="admin-user-drawer-new-password" class="form-control" type="password" required minlength="8" maxlength="128" autocomplete="new-password"></label>
          <label class="form-group"><span class="form-label">Xác nhận mật khẩu</span><input id="admin-user-drawer-confirm-password" class="form-control" type="password" required minlength="8" maxlength="128" autocomplete="new-password"></label>
        </div>
        <div class="admin-user-detail-actions"><button id="admin-user-drawer-password-save" type="submit" class="btn btn-primary"><i data-lucide="key-round"></i> Đặt lại mật khẩu</button></div>
      </form>
    </div>
  </aside>
</div>
```

- [ ] **Step 4: Add themed drawer styles**

Append to `style.css`:

```css
.admin-user-drawer-overlay{position:fixed;inset:0;z-index:2100;display:flex;justify-content:flex-end;background:rgba(0,0,0,.62);backdrop-filter:blur(3px)}
.admin-user-drawer-overlay[hidden]{display:none}
.admin-user-drawer{width:min(620px,calc(100% - 32px));height:100%;overflow-y:auto;padding:24px;background:var(--bg-card);border-left:1px solid var(--border-subtle);box-shadow:-18px 0 50px rgba(0,0,0,.28)}
.admin-user-drawer-header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:20px}
.admin-user-drawer-header h2{margin:8px 0 0;color:var(--text-bright)}
.admin-user-drawer-close{display:grid;place-items:center;width:40px;height:40px;border:1px solid var(--border-subtle);border-radius:50%;background:var(--bg-secondary);color:var(--text-main);cursor:pointer}
.admin-user-drawer-close svg{width:20px;height:20px}
.admin-user-drawer-password{margin-top:28px;padding-top:24px;border-top:1px solid var(--border-subtle)}
.admin-user-drawer-password h3{margin:0 0 18px;color:var(--text-bright)}
body.admin-user-drawer-open{overflow:hidden}
@media (max-width:700px){.admin-user-drawer{width:100%;padding:18px;border-left:0}.admin-user-drawer .admin-user-detail-grid{grid-template-columns:1fr}.admin-user-drawer .admin-user-detail-wide{grid-column:auto}}
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```text
node --test backend.Tests/js/admin-users.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit the drawer shell**

```text
git add backend.Tests/js/admin-users.test.cjs backend/Views/AdminView/Index.cshtml backend/wwwroot/css/style.css
git commit -m "feat: add admin user editing drawer"
```

---

### Task 2: Wire the Drawer to Existing User APIs

**Files:**
- Modify: `backend.Tests/js/admin-users.test.cjs`
- Modify: `backend/wwwroot/js/admin-users.js`
- Modify: `backend/Views/AdminView/Index.cshtml`

**Interfaces:**
- Consumes: Drawer IDs from Task 1 and existing `apiFetch(url, options)`.
- Produces: `openDrawer(userId, trigger)`, `closeDrawer()`, `saveDrawer(event)`, `toggleDrawerLock()`, and `resetDrawerPassword(event)`.

- [ ] **Step 1: Write failing behavior tests**

Add:

```js
test('user list opens the inline drawer instead of navigating away', () => {
  assert.doesNotMatch(script, /href="\/admin\/users\/\$\{user\.id\}"/);
  assert.match(script, /data-user-edit="\$\{user\.id\}"/);
  assert.match(script, /function openDrawer\(userId,\s*trigger\)/);
  assert.match(script, /function closeDrawer\(\)/);
  assert.match(script, /addEventListener\('keydown'[\s\S]*?Escape/);
});

test('drawer mutations use protected existing endpoints and preserve list state', () => {
  assert.match(script, /apiFetch\(`\$\{API_BASE\}\/admin\/users\/\$\{state\.drawerUserId\}`/);
  assert.match(script, /apiFetch\(`\$\{API_BASE\}\/admin\/users\/\$\{state\.drawerUserId\}\/lock`/);
  assert.match(script, /apiFetch\(`\$\{API_BASE\}\/admin\/users\/\$\{state\.drawerUserId\}\/password`/);
  assert.match(script, /await load\(\)/);
  assert.doesNotMatch(script, /state\.page\s*=\s*1[\s\S]{0,100}saveDrawer/);
});

test('drawer validates the administrator password reset policy', () => {
  assert.match(script, /newPassword\.length < 8/);
  assert.match(script, /!\s*\/\[A-Za-z\]\//);
  assert.match(script, /!\s*\/\[0-9\]\//);
  assert.match(script, /admin-user-drawer-password-form'\)\.reset\(\)/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```text
node --test backend.Tests/js/admin-users.test.cjs
```

Expected: FAIL because the list still links to a separate page and no drawer behavior exists.

- [ ] **Step 3: Extend drawer state and row actions**

Extend the state object:

```js
drawerUserId: null,
drawerUser: null,
drawerTrigger: null
```

Replace the detail link with:

```html
<button type="button" class="btn btn-secondary" data-user-edit="${user.id}">Xem / Chỉnh sửa</button>
```

After rendering rows, bind:

```js
root.querySelectorAll('[data-user-edit]').forEach(button => {
  button.addEventListener('click', () => openDrawer(Number(button.dataset.userEdit), button));
});
```

- [ ] **Step 4: Implement drawer loading, rendering, closing, and messaging**

Add these functions inside the existing IIFE:

```js
const byId = id => document.getElementById(id);

function showDrawerMessage(message, success = false) {
  const element = byId('admin-user-drawer-message');
  element.textContent = message;
  element.classList.toggle('success', success);
  element.hidden = false;
}

function renderDrawer() {
  const user = state.drawerUser;
  if (!user) return;
  for (const [id, value] of Object.entries({
    'admin-user-drawer-username': user.username || '',
    'admin-user-drawer-email': user.email || '',
    'admin-user-drawer-role': user.role || 'User',
    'admin-user-drawer-avatar': user.avatarUrl || '',
    'admin-user-drawer-badge': user.badge || '',
    'admin-user-drawer-bio': user.bio || ''
  })) byId(id).value = value;
  byId('admin-user-drawer-name').textContent = user.username || '';
  byId('admin-user-drawer-email-preview').textContent = user.email || '';
  byId('admin-user-drawer-avatar-preview').src = safeImage(user.avatarUrl);
  const status = byId('admin-user-drawer-status');
  status.textContent = user.isLocked ? 'Đã khóa' : 'Hoạt động';
  status.classList.toggle('locked', Boolean(user.isLocked));
  const lock = byId('admin-user-drawer-lock');
  lock.textContent = user.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản';
  lock.disabled = Boolean(user.isCurrentUser);
}

async function openDrawer(userId, trigger) {
  state.drawerUserId = userId;
  state.drawerTrigger = trigger;
  state.drawerUser = null;
  byId('admin-user-drawer-overlay').hidden = false;
  byId('admin-user-drawer-loading').hidden = false;
  byId('admin-user-drawer-content').hidden = true;
  byId('admin-user-drawer-message').hidden = true;
  document.body.classList.add('admin-user-drawer-open');
  byId('admin-user-drawer').focus();
  try {
    const response = await apiFetch(`${API_BASE}/admin/users/${userId}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Không thể tải thông tin người dùng.');
    state.drawerUser = payload;
    renderDrawer();
    byId('admin-user-drawer-loading').hidden = true;
    byId('admin-user-drawer-content').hidden = false;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (error) {
    byId('admin-user-drawer-loading').hidden = true;
    showDrawerMessage(error.message);
  }
}

function closeDrawer() {
  byId('admin-user-drawer-overlay').hidden = true;
  document.body.classList.remove('admin-user-drawer-open');
  byId('admin-user-drawer-password-form').reset();
  state.drawerUserId = null;
  state.drawerUser = null;
  const trigger = state.drawerTrigger;
  state.drawerTrigger = null;
  trigger?.focus();
}
```

- [ ] **Step 5: Implement save, lock, and password-reset requests**

Implement all three handlers with the current drawer user ID:

```js
async function saveDrawer(event) {
  event.preventDefault();
  const button = byId('admin-user-drawer-save');
  button.disabled = true;
  try {
    const response = await apiFetch(`${API_BASE}/admin/users/${state.drawerUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: byId('admin-user-drawer-username').value.trim(),
        email: byId('admin-user-drawer-email').value.trim(),
        role: byId('admin-user-drawer-role').value,
        avatarUrl: byId('admin-user-drawer-avatar').value.trim(),
        badge: byId('admin-user-drawer-badge').value.trim(),
        bio: byId('admin-user-drawer-bio').value.trim()
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Không thể cập nhật người dùng.');
    state.drawerUser = payload;
    renderDrawer();
    await load();
    showDrawerMessage('Đã lưu thông tin người dùng.', true);
  } catch (error) {
    showDrawerMessage(error.message);
  } finally {
    button.disabled = false;
  }
}

async function toggleDrawerLock() {
  const user = state.drawerUser;
  if (!user || user.isCurrentUser) return;
  const nextLocked = !user.isLocked;
  if (!confirm(nextLocked ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?')) return;
  const button = byId('admin-user-drawer-lock');
  button.disabled = true;
  try {
    const response = await apiFetch(`${API_BASE}/admin/users/${state.drawerUserId}/lock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isLocked: nextLocked })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Không thể cập nhật trạng thái tài khoản.');
    state.drawerUser = payload;
    renderDrawer();
    await load();
    showDrawerMessage(nextLocked ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.', true);
  } catch (error) {
    showDrawerMessage(error.message);
    button.disabled = false;
  }
}

async function resetDrawerPassword(event) {
  event.preventDefault();
  const newPassword = byId('admin-user-drawer-new-password').value;
  const confirmPassword = byId('admin-user-drawer-confirm-password').value;
  if (newPassword !== confirmPassword) return showDrawerMessage('Mật khẩu xác nhận không khớp.');
  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return showDrawerMessage('Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ và số.');
  }
  const button = byId('admin-user-drawer-password-save');
  button.disabled = true;
  try {
    const response = await apiFetch(`${API_BASE}/admin/users/${state.drawerUserId}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword, confirmPassword })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Không thể đặt lại mật khẩu người dùng.');
    byId('admin-user-drawer-password-form').reset();
    showDrawerMessage(payload.message || 'Đã đặt lại mật khẩu người dùng.', true);
  } catch (error) {
    showDrawerMessage(error.message);
  } finally {
    button.disabled = false;
  }
}
```

- [ ] **Step 6: Bind accessibility and form events**

In `init()` add:

```js
byId('admin-user-drawer-close')?.addEventListener('click', closeDrawer);
byId('admin-user-drawer-overlay')?.addEventListener('click', event => {
  if (event.target === event.currentTarget) closeDrawer();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !byId('admin-user-drawer-overlay')?.hidden) closeDrawer();
});
byId('admin-user-drawer-form')?.addEventListener('submit', saveDrawer);
byId('admin-user-drawer-lock')?.addEventListener('click', toggleDrawerLock);
byId('admin-user-drawer-password-form')?.addEventListener('submit', resetDrawerPassword);
```

Bump the script reference in `Index.cshtml`:

```html
<script src="/js/admin-users.js?v=1.2"></script>
```

- [ ] **Step 7: Run the focused tests and verify GREEN**

Run:

```text
node --test backend.Tests/js/admin-users.test.cjs backend.Tests/js/admin-user-security.test.cjs backend.Tests/js/csrf-api-fetch.test.cjs
```

Expected: PASS.

- [ ] **Step 8: Commit drawer behavior**

```text
git add backend.Tests/js/admin-users.test.cjs backend/wwwroot/js/admin-users.js backend/Views/AdminView/Index.cshtml
git commit -m "feat: edit users inside admin control panel"
```

---

### Task 3: Full Regression Verification

**Files:**
- Verify all files modified in Tasks 1 and 2.

**Interfaces:**
- Consumes: Completed drawer shell and behavior.
- Produces: Verified feature ready to remain on the current branch.

- [ ] **Step 1: Run all frontend contract tests**

Run:

```text
node --test backend.Tests/js
```

Expected: all tests pass.

- [ ] **Step 2: Run all backend tests**

Run:

```text
dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore --verbosity quiet
```

Expected: all tests pass.

- [ ] **Step 3: Build Release**

Run:

```text
dotnet build backend/MangaNPK.csproj -c Release --no-restore --verbosity quiet
```

Expected: build succeeds with 0 warnings and 0 errors.

- [ ] **Step 4: Check the final diff and repository state**

Run:

```text
git diff --check
git status --short
```

Expected: no whitespace errors and no unrelated files. User-uploaded files remain ignored.

- [ ] **Step 5: Report without pushing**

Report focused/full test counts, build result, commits, and that the work remains on the current branch. Do not push.
