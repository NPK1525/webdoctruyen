const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../backend');
const view = fs.readFileSync(path.join(root, 'Views/FollowedUpdatesView/Index.cshtml'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'wwwroot/js/updates.js'), 'utf8');

test('followed updates stays on the MVC shared shell', () => {
  assert.match(view, /Html\.PartialAsync\("_Header"\)/);
  assert.match(view, /Html\.PartialAsync\("_Sidebar"\)/);
  assert.match(view, /Html\.PartialAsync\("_AuthModal"\)/);
});

test('followed updates supplies its own localized empty-state key', () => {
  assert.match(view, /window\.__UPDATES_EMPTY_KEY__/);
  assert.match(renderer, /window\.__UPDATES_EMPTY_KEY__/);
});

test('followed updates migrates legacy local library entries before rendering server updates', () => {
  assert.match(view, /window\.__SYNC_LIBRARY_FOR_UPDATES__\s*=\s*true/);
  assert.match(renderer, /syncLocalLibraryToServer\(\)/);
  assert.match(renderer, /window\.location\.reload\(\)/);
});

test('update cards link both cover and title to manga detail', () => {
  assert.match(renderer, /class="history-cover-link"[^>]*href="\/manga\/\$\{group\.mangaId\}"/);
  assert.match(renderer, /class="history-group-title"[^>]*href="\/manga\/\$\{group\.mangaId\}"/);
});
