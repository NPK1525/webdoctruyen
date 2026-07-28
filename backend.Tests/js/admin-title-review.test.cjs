const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const view = fs.readFileSync(path.join(root, 'backend', 'Views', 'AdminView', 'Index.cshtml'), 'utf8');
const script = fs.readFileSync(path.join(root, 'backend', 'wwwroot', 'js', 'admin-title-review.js'), 'utf8');

test('admin contains an integrated title review tab', () => {
  assert.match(view, /class="admin-tab-btn" data-tab="title-review"/);
  assert.match(view, /id="title-review-pending-count"/);
  assert.match(view, /id="adm-content-title-review"/);
});

test('title review tab contains filters list detail and pagination', () => {
  for (const id of [
    'title-review-search',
    'title-review-status',
    'title-review-table-body',
    'title-review-pagination',
    'title-review-detail',
    'title-review-back',
    'title-review-reason',
    'title-review-reject',
    'title-review-approve'
  ]) assert.match(view, new RegExp(`id="${id}"`));
});

test('title review module owns filtering pagination and detail rendering', () => {
  assert.match(script, /const PAGE_SIZE = 20/);
  assert.match(script, /function getFilteredDrafts\(\)/);
  assert.match(script, /function renderPagination\(/);
  assert.match(script, /async function openDetail\(id\)/);
  assert.match(script, /adminEscapeHtml/);
  assert.match(script, /window\.AdminTitleReview\s*=/);
});

test('admin activates title review through its dedicated module', () => {
  const admin = fs.readFileSync(path.join(root, 'backend', 'wwwroot', 'js', 'admin.js'), 'utf8');
  assert.match(admin, /window\.AdminTitleReview\?\.init\(\)/);
  assert.match(admin, /tabName === 'title-review'/);
  assert.match(admin, /window\.AdminTitleReview\?\.activate\(\)/);
});

test('title review validates rejection and prevents duplicate actions', () => {
  assert.match(script, /if \(!reason\)/);
  assert.match(script, /setBusy\(true\)/);
  assert.match(script, /if \(busy \|\| !selectedId\) return/);
  assert.match(script, /finally\s*\{\s*setBusy\(false\)/s);
});

test('successful review action refreshes list and returns to it', () => {
  assert.match(script, /await loadDrafts\(\)/);
  assert.match(script, /closeDetail\(\)/);
  assert.match(script, /updatePendingBadge\(\)/);
});
