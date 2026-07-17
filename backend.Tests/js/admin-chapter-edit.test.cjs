const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildChapterPayload } = require('../../backend/wwwroot/js/admin-chapter-edit.js');

const root = path.resolve(__dirname, '../../backend');
const chapterController = fs.readFileSync(path.join(root, 'Controllers/AdminChapterController.cs'), 'utf8');
const adminView = fs.readFileSync(path.join(root, 'Views/AdminView/Index.cshtml'), 'utf8');
const adminScript = fs.readFileSync(path.join(root, 'wwwroot/js/admin.js'), 'utf8');

test('local chapter payload contains ordered pages', () => {
  assert.deepEqual(buildChapterPayload('Local', 2, 'Title', ['/2.jpg', '/1.jpg']), {
    chapterNumber: 2, title: 'Title', pageUrls: ['/2.jpg', '/1.jpg']
  });
});

test('MangaDex payload omits pages', () => {
  assert.deepEqual(buildChapterPayload('MangaDex', 3, 'Title', ['/ignored.jpg']), {
    chapterNumber: 3, title: 'Title'
  });
});

test('admin chapter picker exposes server-side search and pagination', () => {
  assert.match(chapterController, /manga\/\{mangaId:int\}\/chapters/);
  assert.match(chapterController, /search/);
  assert.match(chapterController, /pageSize/);
  assert.match(adminView, /id="chapter-form-manga-search"/);
  assert.match(adminView, /id="chapter-form-chapter-search"/);
  assert.match(adminView, /id="chapter-list-pagination"/);
  assert.match(adminScript, /admin\/manga\/\$\{mangaId\}\/chapters/);
});
