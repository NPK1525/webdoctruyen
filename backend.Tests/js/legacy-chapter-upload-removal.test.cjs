const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const controller = fs.readFileSync(path.join(root, 'backend/Controllers/AdminViewController.cs'), 'utf8');
const filter = fs.readFileSync(path.join(root, 'backend/Filters/RequireAdminAttribute.cs'), 'utf8');
const mangaList = fs.readFileSync(path.join(root, 'backend/Views/AdminView/MangaList.cshtml'), 'utf8');

test('legacy chapter create GET redirects to the admin index', () => {
  assert.match(controller, /\[HttpGet\("chapter\/create\/\{mangaId:int\}"\)\][\s\S]*?IActionResult ChapterCreate\(int mangaId\)[\s\S]*?RedirectToAction\(nameof\(Index\)\)/);
  assert.doesNotMatch(controller, /\[HttpPost\("chapter\/create/);
});

test('legacy chapter upload view and assets are removed', () => {
  for (const file of [
    'backend/Views/AdminView/ChapterCreate.cshtml',
    'backend/wwwroot/css/chapter-upload.css',
    'backend/wwwroot/js/chapter-upload.js',
    'backend/wwwroot/js/chapter-file-order.js'
  ]) assert.equal(fs.existsSync(path.join(root, file)), false, file);
});

test('remaining admin UI and contributor filter do not reference ChapterCreate', () => {
  assert.doesNotMatch(mangaList, /ChapterCreate|chapter\/create/);
  assert.doesNotMatch(filter, /string\.Equals\(actionName, "ChapterCreate"/);
});
