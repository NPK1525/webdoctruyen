const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const view = fs.readFileSync(path.join(root, 'backend', 'Views', 'AdminView', 'Index.cshtml'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'backend', 'wwwroot', 'js', 'admin.js'), 'utf8');
const upload = fs.readFileSync(path.join(root, 'backend', 'wwwroot', 'js', 'admin-upload.js'), 'utf8');
const mangaDex = fs.readFileSync(path.join(root, 'backend', 'wwwroot', 'js', 'admin-mangadex.js'), 'utf8');

test('admin feature modules load before the coordinating script', () => {
  assert.ok(view.indexOf('/js/admin-mangadex.js') < view.indexOf('/js/admin.js'));
  assert.ok(view.indexOf('/js/admin-upload.js') < view.indexOf('/js/admin.js'));
});

test('admin module functions keep their existing global names', () => {
  for (const name of ['uploadFile', 'uploadMultipleFiles', 'initUploadHandlers', 'renderChapterPagesPreview'])
    assert.match(upload, new RegExp(`function ${name}\\(`));
  for (const name of ['initMangaDexImport', 'setMangaDexBusy', 'renderMangaDexPreview', 'escapeAdminHtml'])
    assert.match(mangaDex, new RegExp(`function ${name}\\(`));
  assert.match(admin, /initUploadHandlers\(\)/);
  assert.match(admin, /initMangaDexImport\(\)/);
});
