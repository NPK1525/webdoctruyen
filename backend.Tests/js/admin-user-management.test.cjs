const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const view = fs.readFileSync(path.join(root, 'backend/Views/AdminView/Index.cshtml'), 'utf8');
const css = fs.readFileSync(path.join(root, 'backend/wwwroot/css/style.css'), 'utf8');
const js = fs.existsSync(path.join(root, 'backend/wwwroot/js/admin-users.js'))
  ? fs.readFileSync(path.join(root, 'backend/wwwroot/js/admin-users.js'), 'utf8') : '';
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

test('admin users use server pagination and guarded role/lock endpoints', () => {
  assert.match(js, /pageSize:\s*['"]?20/);
  assert.match(js, /\/admin\/users\?/);
  assert.match(js, /\/role/);
  assert.match(js, /\/lock/);
  assert.match(js, /setTimeout\([^,]+,\s*250\)/s);
  assert.match(js, /window\.AdminUsers\s*=\s*\{\s*init,\s*activate\s*\}/);
  assert.match(coordinator, /AdminUsers\?\.init\(\)/);
  assert.match(coordinator, /tabName\s*===\s*['"]users['"].*AdminUsers\?\.activate\(\)/s);
});
