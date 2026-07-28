const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../backend/wwwroot/js');
const common = fs.readFileSync(path.join(root, 'common.js'), 'utf8');
const upload = fs.readFileSync(path.join(root, 'admin-upload.js'), 'utf8');
const reports = fs.readFileSync(path.join(root, 'admin-reports.js'), 'utf8');

test('apiFetch obtains and sends an antiforgery token for unsafe methods', () => {
  assert.match(common, /\/api\/security\/csrf/);
  assert.match(common, /X-CSRF-TOKEN/);
  assert.match(common, /UNSAFE_HTTP_METHODS/);
  assert.match(common, /credentials:\s*['"]same-origin['"]/);
});

test('apiFetch preserves browser multipart boundaries for FormData', () => {
  assert.match(common, /body\s+instanceof\s+FormData/);
  assert.doesNotMatch(common, /if\s*\(options\.body\s*&&\s*!headers\[['"]Content-Type['"]\]\)/);
});

test('unsafe upload and report actions use the protected request helper', () => {
  assert.doesNotMatch(upload, /\bfetch\(/);
  assert.match(upload, /apiFetch\(/);

  const patchAction = reports.match(/data-report-action[\s\S]*$/)?.[0] || '';
  assert.doesNotMatch(patchAction, /\bfetch\(/);
  assert.match(patchAction, /apiFetch\(/);
});
