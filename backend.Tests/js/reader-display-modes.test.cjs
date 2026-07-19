const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const reader = fs.readFileSync('backend/wwwroot/js/reader.js', 'utf8');
const settings = fs.readFileSync('backend/wwwroot/js/reader-settings.js', 'utf8');
const view = fs.readFileSync('backend/Views/ChapterView/Read.cshtml', 'utf8');

test('reader implements double page, wide strip and independent size limits', () => {
  assert.match(reader, /readerDisplayStyle === 'double'/);
  assert.match(reader, /reader-wide-strip/);
  assert.match(reader, /readerPageStep/);
  assert.match(settings, /limit-width/);
  assert.match(settings, /limit-height/);
  assert.doesNotMatch(view, /No comments yet/);
});
