const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('backend/Controllers/ReportsController.cs', 'utf8');
test('reports API exposes authenticated current-user reports', () => {
  assert.match(source, /HttpGet\("my"\)/);
  assert.match(source, /ReporterId == userId/);
});
