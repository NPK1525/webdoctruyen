const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');

test('reports API defines authenticated create and admin moderation endpoints', () => {
  const controllerPath = path.join(root, 'backend/Controllers/ReportsController.cs');
  const modelPath = path.join(root, 'backend/Models/Report.cs');
  const controller = fs.readFileSync(controllerPath, 'utf8');
  const model = fs.readFileSync(modelPath, 'utf8');

  assert.match(model, /class Report\b/);
  assert.match(model, /ReporterId/);
  assert.match(model, /TargetType/);
  assert.match(model, /Status/);
  assert.match(controller, /\[Route\("api\/\[controller\]"\)\]/);
  assert.match(controller, /\[HttpPost\]/);
  assert.match(controller, /\[RequireAuth\]/);
  assert.match(controller, /Pending/);
  assert.match(controller, /\[RequireAdmin\]/);
  assert.match(controller, /HttpPatch/);
  assert.match(controller, /Duplicate/);
});
