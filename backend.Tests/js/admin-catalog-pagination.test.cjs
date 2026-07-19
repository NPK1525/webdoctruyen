const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const admin = fs.readFileSync('backend/wwwroot/js/admin.js', 'utf8');
const view = fs.readFileSync('backend/Views/AdminView/Index.cshtml', 'utf8');

test('author and genre management lists paginate at twenty items per page', () => {
  assert.match(admin, /adminCatalogPageSize\s*=\s*20/);
  assert.match(admin, /authorManagementPage/);
  assert.match(admin, /genreManagementPage/);
  assert.match(admin, /renderCatalogPagination/);
  assert.match(view, /admin-author-pagination/);
  assert.match(view, /admin-genre-pagination/);
});
