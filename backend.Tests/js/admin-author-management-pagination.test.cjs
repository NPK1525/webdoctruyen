const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const admin = fs.readFileSync(path.join(root, 'backend', 'wwwroot', 'js', 'admin.js'), 'utf8');

test('admin author management loads paged data from the server', () => {
  assert.match(admin, /admin-author-search/);
  assert.match(admin, /authorManagementPage/);
  assert.match(admin, /renderCatalogPagination\('admin-author-pagination'/);
  assert.match(admin, /\/author\/list\?/);
  assert.match(admin, /pageSize/);
});
