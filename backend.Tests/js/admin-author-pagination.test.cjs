const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const controller = fs.readFileSync(path.join(root, 'backend', 'Controllers', 'AuthorController.cs'), 'utf8');

test('author API exposes a paged admin listing endpoint', () => {
  assert.match(controller, /\[HttpGet\("list"\)\]/);
  assert.match(controller, /int page = 1/);
  assert.match(controller, /int pageSize = 20/);
  assert.match(controller, /search/);
  assert.match(controller, /totalPages/);
  assert.match(controller, /Skip\(/);
  assert.match(controller, /Take\(/);
});
