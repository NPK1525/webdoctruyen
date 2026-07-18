const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const view = fs.readFileSync(path.join(root, 'backend', 'Views', 'AdminView', 'Index.cshtml'), 'utf8');

test('title draft actions use Vietnamese copy and shared rounded button treatment', () => {
  const cancelAction = view.match(/<button type="button" id="btn-cancel-title-draft"[\s\S]*?<\/button>/)?.[0] ?? '';
  assert.match(cancelAction, /Hủy/);
  assert.doesNotMatch(cancelAction, /Cancel/);
  assert.match(view, /\.title-draft-actions \.btn\s*\{[^}]*border-radius:\s*20px/s);
  assert.match(view, /\.title-draft-actions \.btn\s*\{[^}]*padding:\s*10px\s+24px/s);
});

test('title draft primary action includes an upload icon', () => {
  const action = view.match(/<button type="button" id="btn-submit-title-draft"[\s\S]*?<\/button>/)?.[0] ?? '';
  assert.match(action, /data-lucide="upload"/);
  assert.match(action, /Đăng truyện/);
});

test('title draft actions wrap consistently on small screens', () => {
  assert.match(view, /\.title-draft-actions\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(view, /\.title-draft-actions \.btn\s*\{[^}]*min-width:\s*130px/s);
});
