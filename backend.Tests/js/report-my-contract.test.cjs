const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');

test('my reports API paginates on the server', () => {
  const controllerPath = path.join(root, 'backend/Controllers/ReportsController.cs');
  const controller = fs.readFileSync(controllerPath, 'utf8');

  assert.match(controller, /MyReports\([\s\S]*?\[FromQuery\] int page = 1[\s\S]*?\[FromQuery\] int pageSize = 20/);
  assert.match(controller, /MyReports\([\s\S]*?Skip\(/);
  assert.match(controller, /MyReports\([\s\S]*?Take\(/);
  assert.match(controller, /MyReports\([\s\S]*?totalPages/);
});
