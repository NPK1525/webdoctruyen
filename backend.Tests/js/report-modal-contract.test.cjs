const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../backend');
const detailView = fs.readFileSync(path.join(root, 'Views/MangaView/Detail.cshtml'), 'utf8');
const readerView = fs.readFileSync(path.join(root, 'Views/ChapterView/Read.cshtml'), 'utf8');
const detailScript = fs.readFileSync(path.join(root, 'wwwroot/js/detail.js'), 'utf8');
const readerScript = fs.readFileSync(path.join(root, 'wwwroot/js/reader.js'), 'utf8');
const reportScriptPath = path.join(root, 'wwwroot/js/report-modal.js');

test('report modal is shared by manga detail and chapter reader', () => {
  assert.ok(fs.existsSync(reportScriptPath));
  assert.match(detailView, /report-modal\.js/);
  assert.match(readerView, /report-modal\.js/);
  assert.match(detailScript, /openReportModal\(/);
  assert.match(readerScript, /openReportModal\(/);
});

test('report modal exposes target-specific reasons and Other validation', () => {
  const source = fs.readFileSync(reportScriptPath, 'utf8');
  for (const reason of ['Duplicate entry', 'Missing cover art', 'Troll entry', 'Vandalism', 'Credit page in the middle of the chapter', 'Images not loading', 'Watermarked images']) {
    assert.match(source, new RegExp(reason.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')));
  }
  assert.match(source, /Other/);
  assert.match(source, /explanation.*required|Other.*explanation/i);
  assert.match(source, /apiFetch\(.*\/reports/);
});
