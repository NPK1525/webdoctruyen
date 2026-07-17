const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../backend');
const viewPaths = [
  'Views/AdminView/Index.cshtml',
  'Views/ChapterView/Read.cshtml',
  'Views/HistoryView/Index.cshtml',
  'Views/Home/Index.cshtml',
  'Views/LibraryView/Index.cshtml',
  'Views/MangaView/Detail.cshtml',
  'Views/MangaView/Index.cshtml',
  'Views/RecentlyAddedView/Index.cshtml',
  'Views/UpdatesView/Index.cshtml',
  'wwwroot/detail.html',
  'wwwroot/index.html',
  'wwwroot/profile.html',
  'wwwroot/reader.html'
];
const modulePath = path.join(root, 'wwwroot/js/common-library.js');
const coordinator = fs.readFileSync(path.join(root, 'wwwroot/js/common.js'), 'utf8');

test('every common consumer loads common-library first', () => {
  assert.ok(fs.existsSync(modulePath));
  for (const relativePath of viewPaths) {
    const view = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const moduleIndex = view.indexOf('js/common-library.js');
    const commonIndex = view.indexOf('js/common.js');
    assert.ok(moduleIndex >= 0, relativePath);
    assert.ok(commonIndex > moduleIndex, relativePath);
  }
});

test('library and history functions belong to common-library', () => {
  const moduleSource = fs.readFileSync(modulePath, 'utf8');
  for (const name of ['readLocalLibrary', 'saveLocalLibraryItem', 'readLocalReadingHistory', 'saveLocalReadingHistoryItem']) {
    assert.match(moduleSource, new RegExp(`function ${name}\\(`));
    assert.doesNotMatch(coordinator, new RegExp(`function ${name}\\(`));
  }
});
