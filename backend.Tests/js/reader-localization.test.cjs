const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../backend');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const readerView = read('Views/ChapterView/Read.cshtml');
const reportView = read('Views/Shared/_ReportModal.cshtml');
const reader = read('wwwroot/js/reader.js');
const settings = read('wwwroot/js/reader-settings.js');
const report = read('wwwroot/js/report-modal.js');
const vi = JSON.parse(read('wwwroot/locales/vi.json'));
const en = JSON.parse(read('wwwroot/locales/en.json'));

const requiredKeys = [
  'reader.page', 'reader.chapter', 'reader.reportChapter', 'reader.longStrip',
  'reader.fitBoth', 'reader.leftToRight', 'reader.rightToLeft',
  'reader.headerHidden', 'reader.headerShown', 'reader.progressNormal',
  'reader.progressLightbar', 'reader.progressHidden', 'reader.settings',
  'reader.settings.pageLayout', 'reader.settings.imageFit',
  'reader.settings.keybinds', 'reader.settings.behaviors', 'report.title',
  'report.reportingChapter', 'report.reportingTitle', 'report.reason',
  'report.chooseReason', 'report.explanation', 'report.cancel', 'report.submit',
  'report.reasonRequired', 'report.otherExplanationRequired',
  'report.sendError', 'report.sent'
];

test('reader and report dictionaries have matching required keys', () => {
  for (const key of requiredKeys) {
    assert.equal(typeof vi[key], 'string', `Missing Vietnamese ${key}`);
    assert.equal(typeof en[key], 'string', `Missing English ${key}`);
  }
});

test('reader drawer and report modal expose translation hooks', () => {
  for (const key of ['reader.page', 'reader.chapter', 'reader.reportChapter', 'reader.settings']) {
    assert.match(readerView, new RegExp(`data-i18n="${key.replace('.', '\\.')}`));
  }
  for (const key of ['report.title', 'report.reason', 'report.chooseReason', 'report.explanation', 'report.cancel', 'report.submit']) {
    assert.match(reportView, new RegExp(`data-i18n="${key.replace('.', '\\.')}`));
  }
});

test('reader and report modules refresh on locale change', () => {
  assert.match(reader, /manganpk:localechanged/);
  assert.match(settings, /manganpk:localechanged/);
  assert.match(report, /manganpk:localechanged/);
});

test('report reasons preserve canonical values while translating labels', () => {
  assert.match(report, /reason\.key/);
  assert.match(report, /value=\"\$\{escapeHtml\(reason\.value\)\}/);
  assert.match(report, /const reason = document\.getElementById\('report-reason'\)\.value/);
});
