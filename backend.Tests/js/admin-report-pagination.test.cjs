const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const api = fs.readFileSync('backend/Controllers/ReportsController.cs', 'utf8');
const ui = fs.readFileSync('backend/wwwroot/js/admin-reports.js', 'utf8');
test('admin reports use server-side pagination', () => {
  assert.match(api, /int page = 1/);
  assert.match(api, /int pageSize = 20/);
  assert.match(api, /Skip\(/);
  assert.match(api, /totalItems/);
  assert.match(ui, /adminReportPage/);
  assert.match(ui, /totalPages/);
});
