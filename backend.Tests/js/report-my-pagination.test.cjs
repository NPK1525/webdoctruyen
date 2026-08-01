const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('backend/wwwroot/js/my-reports.js', 'utf8');

test('my reports UI requests pages from the API', () => {
  assert.match(source, /URLSearchParams/);
  assert.match(source, /pageSize/);
  assert.ok(source.includes("fetch(`/api/reports/my?${buildQuery(page)}`"));
});
