const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../backend');
const view = fs.readFileSync(path.join(root, 'Views/ChapterView/Read.cshtml'), 'utf8');
const coordinator = fs.readFileSync(path.join(root, 'wwwroot/js/reader.js'), 'utf8');
const modulePath = path.join(root, 'wwwroot/js/reader-settings.js');

test('reader settings module loads before the reader coordinator', () => {
  assert.ok(fs.existsSync(modulePath));
  assert.ok(view.indexOf('/js/reader-settings.js') < view.indexOf('/js/reader.js'));
});

test('settings and input functions belong to the extracted module', () => {
  const moduleSource = fs.readFileSync(modulePath, 'utf8');
  for (const name of ['initReaderSettingsModal', 'renderReaderKeybinds', 'handleReaderKeydown', 'handleReaderWheel']) {
    assert.match(moduleSource, new RegExp(`function ${name}\\(`));
    assert.doesNotMatch(coordinator, new RegExp(`function ${name}\\(`));
  }
});

test('reader auto-advances by default while preserving an explicit disabled choice', () => {
  assert.match(coordinator, /const savedAutoAdvanceLastPage = localStorage\.getItem\('reader_auto_advance'\);/);
  assert.match(coordinator, /let autoAdvanceLastPage = savedAutoAdvanceLastPage === null \? true : savedAutoAdvanceLastPage === 'true';/);
});

test('forward paging uses chapter navigation at the end in every reading mode', () => {
  assert.match(coordinator, /if \(delta > 0 && autoAdvanceLastPage\) goToNextChapter\(\);/);
  assert.match(coordinator, /else \{ goToRelativePageOrChapter\(1\); \}/);
});

test('drawer selectors provide local page and chapter option panels', () => {
  const view = fs.readFileSync(path.join(root, 'Views/ChapterView/Read.cshtml'), 'utf8');
  assert.match(view, /id="reader-drawer-page-options"/);
  assert.match(view, /id="reader-drawer-chapter-options"/);
  assert.match(coordinator, /function toggleReaderDrawerSelect\(type(?:, forceOpen = null)?\)/);
  assert.match(coordinator, /reader-drawer-chapter-options/);
  assert.match(coordinator, /toggleReaderDrawerSelect\('page'\)/);
  assert.match(coordinator, /toggleReaderDrawerSelect\('chapter'\)/);
  assert.match(view, /id="chapter-select-trigger"/);
  assert.match(view, /id="page-select-trigger"/);
  assert.doesNotMatch(view, /id="chapter-select-options"/);
  assert.doesNotMatch(view, /id="page-select-options"/);
  const headerControls = view.match(/<div class="reader-control-grid">[\s\S]*?<\/div>\s*<\/div>/)?.[0] || '';
  assert.doesNotMatch(headerControls, /data-lucide="chevron-left"/);
  assert.match(coordinator, /button\?\.classList\.toggle\('open', open\)/);
  assert.match(coordinator, /otherButton\?\.classList\.remove\('open'\)/);
  assert.ok(coordinator.indexOf('renderReaderDrawerChapterOptions(sorted)') < coordinator.indexOf('if (!container) return;'));
});
