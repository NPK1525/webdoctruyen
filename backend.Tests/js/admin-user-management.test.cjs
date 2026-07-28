const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const view = fs.readFileSync(path.join(root, 'backend/Views/AdminView/Index.cshtml'), 'utf8');
const css = fs.readFileSync(path.join(root, 'backend/wwwroot/css/style.css'), 'utf8');
const js = fs.existsSync(path.join(root, 'backend/wwwroot/js/admin-users.js'))
  ? fs.readFileSync(path.join(root, 'backend/wwwroot/js/admin-users.js'), 'utf8') : '';
const detailViewPath = path.join(root, 'backend/Views/AdminView/UserDetail.cshtml');
const detailScriptPath = path.join(root, 'backend/wwwroot/js/admin-user-detail.js');
const detailView = fs.existsSync(detailViewPath) ? fs.readFileSync(detailViewPath, 'utf8') : '';
const detailScript = fs.existsSync(detailScriptPath) ? fs.readFileSync(detailScriptPath, 'utf8') : '';
const viewController = fs.readFileSync(path.join(root, 'backend/Controllers/AdminViewController.cs'), 'utf8');
const coordinator = fs.readFileSync(path.join(root, 'backend/wwwroot/js/admin.js'), 'utf8');

test('admin user management is an integrated themed tab', () => {
  assert.match(view, /data-tab="users"/);
  assert.match(view, /id="adm-content-users"/);
  for (const id of ['admin-user-search', 'admin-user-role', 'admin-user-status', 'admin-user-reset', 'admin-user-list', 'admin-user-summary', 'admin-user-pagination']) {
    assert.match(view, new RegExp(`id="${id}"`));
  }
  assert.match(css, /\.admin-user-toolbar/);
  assert.match(css, /var\(--bg-card\)|var\(--bg-secondary\)/);
  assert.match(css, /@media\s*\(max-width:\s*768px\)/);
});

test('admin user editor is an in-panel tab like manga editing', () => {
  for (const id of [
    'adm-content-user-edit', 'admin-user-editor-back',
    'admin-user-editor-form', 'admin-user-editor-username',
    'admin-user-editor-email', 'admin-user-editor-role',
    'admin-user-editor-avatar', 'admin-user-editor-badge',
    'admin-user-editor-bio', 'admin-user-editor-lock',
    'admin-user-editor-save', 'admin-user-editor-password-form',
    'admin-user-editor-new-password', 'admin-user-editor-confirm-password',
    'admin-user-editor-password-save'
  ]) {
    assert.match(view, new RegExp(`id="${id}"`), id);
  }
  assert.doesNotMatch(view, /admin-user-drawer-overlay/);
  assert.doesNotMatch(css, /\.admin-user-drawer/);
  assert.match(css, /\.admin-user-editor-sections/);
  assert.match(css, /\.admin-user-editor-sections\[hidden\]\s*\{[^}]*display:\s*none/);
  assert.match(css, /@media\s*\(max-width:\s*800px\)[\s\S]*?\.admin-user-editor-sections\s*\{[^}]*grid-template-columns:\s*1fr/);
});

test('admin user module loads before the coordinator', () => {
  assert.ok(view.indexOf('/js/admin-users.js') > -1);
  assert.ok(view.indexOf('/js/admin-users.js') < view.indexOf('/js/admin.js'));
});

test('admin users use server pagination and guarded lock endpoint', () => {
  assert.match(js, /pageSize:\s*['"]?20/);
  assert.match(js, /\/admin\/users\?/);
  assert.match(js, /\/lock/);
  assert.match(js, /setTimeout\([^,]+,\s*250\)/s);
  assert.match(js, /window\.AdminUsers\s*=\s*\{\s*init,\s*activate\s*\}/);
  assert.match(coordinator, /AdminUsers\?\.init\(\)/);
  assert.match(coordinator, /tabName\s*===\s*['"]users['"].*AdminUsers\?\.activate\(\)/s);
});

test('admin user list replaces the created date with detail and lock actions', () => {
  assert.doesNotMatch(view, /id="admin-user-editor"/);
  assert.doesNotMatch(js, /formatDate\(user\.createdAt\)/);
  assert.doesNotMatch(js, /href="\/admin\/users\/\$\{user\.id\}"/);
  assert.match(js, /data-user-edit="\$\{user\.id\}"/);
  assert.match(js, /data-user-toggle-lock/);
});

test('user editing switches between list and editor without navigation', () => {
  assert.match(js, /function openEditor\(userId\)/);
  assert.match(js, /switchTab\('user-edit'\)/);
  assert.match(js, /function closeEditor\(\)/);
  assert.match(js, /switchTab\('users'\)/);
  assert.match(js, /data-user-edit[\s\S]*?openEditor/);
  assert.doesNotMatch(js, /openDrawer|closeDrawer|drawerUser/);
  assert.doesNotMatch(js, /location\.(href|assign)/);
});

test('editor mutations use protected existing endpoints and preserve list state', () => {
  assert.match(js, /apiFetch\(`\$\{API_BASE\}\/admin\/users\/\$\{state\.editorUserId\}`/);
  assert.match(js, /apiFetch\(`\$\{API_BASE\}\/admin\/users\/\$\{state\.editorUserId\}\/lock`/);
  assert.match(js, /apiFetch\(`\$\{API_BASE\}\/admin\/users\/\$\{state\.editorUserId\}\/password`/);
  assert.match(js, /async function saveEditor[\s\S]*?await load\(\)/);
  const saveEditor = js.match(/async function saveEditor[\s\S]*?\n  \}/)?.[0] || '';
  assert.doesNotMatch(saveEditor, /state\.page\s*=\s*1/);
  const closeEditor = js.match(/function closeEditor[\s\S]*?\n  \}/)?.[0] || '';
  assert.match(closeEditor, /switchTab\('users'\)/);
  assert.doesNotMatch(closeEditor, /state\.page\s*=\s*1/);
});

test('editor validates the administrator password reset policy', () => {
  assert.match(js, /newPassword\.length < 8/);
  assert.match(js, /!\/\[A-Za-z\]\//);
  assert.match(js, /!\/\[0-9\]\//);
  assert.match(js, /admin-user-editor-password-form'\)\.reset\(\)/);
});

test('admin user detail route exposes profile editing and account locking', () => {
  assert.match(viewController, /\[HttpGet\("users\/\{id:int\}"\)\]/);
  assert.match(detailView, /id="admin-user-detail-form"/);
  assert.match(detailView, /id="admin-user-detail-role"/);
  assert.match(detailView, /id="admin-user-detail-lock"/);
  assert.match(detailScript, /\/admin\/users\/\$\{userId\}/);
  assert.match(detailScript, /method:\s*['"]PUT['"]/);
  assert.match(detailScript, /\/lock/);
  assert.match(coordinator, /URLSearchParams\(window\.location\.search\).*get\('tab'\)/s);
  assert.doesNotMatch(detailView + detailScript, /passwordHash|PasswordHash/);
});
