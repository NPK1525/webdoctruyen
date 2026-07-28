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
  assert.match(js, /href="\/admin\/users\/\$\{user\.id\}"/);
  assert.match(js, /data-user-toggle-lock/);
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
