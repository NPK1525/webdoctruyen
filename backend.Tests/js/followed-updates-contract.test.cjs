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

test('followed updates supplies its own empty-state copy', () => {
  assert.match(view, /window\.__UPDATES_EMPTY_MESSAGE__/);
  assert.match(renderer, /window\.__UPDATES_EMPTY_MESSAGE__/);
});
