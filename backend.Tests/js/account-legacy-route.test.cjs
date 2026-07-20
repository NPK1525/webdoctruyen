const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const controller = fs.readFileSync(path.join(root, 'backend/Controllers/AccountController.cs'), 'utf8');
const common = fs.readFileSync(path.join(root, 'backend/wwwroot/js/common.js'), 'utf8');

test('legacy account pages redirect to the shared modal', () => {
  assert.match(controller, /Redirect\("\/?\?auth=login"\)/);
  assert.match(controller, /Redirect\("\/?\?auth=register"\)/);
  assert.match(common, /URLSearchParams/);
  assert.match(common, /openAuthModal\(authView\)/);
});

test('legacy account view files are removed', () => {
  assert.equal(fs.existsSync(path.join(root, 'backend/Views/Account/Login.cshtml')), false);
  assert.equal(fs.existsSync(path.join(root, 'backend/Views/Account/Register.cshtml')), false);
});
