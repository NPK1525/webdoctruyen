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
