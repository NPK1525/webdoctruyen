const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../../backend');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const readerView = read('Views/ChapterView/Read.cshtml');
const detailView = read('Views/MangaView/Detail.cshtml');
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

test('every generated report reason key resolves in both locale dictionaries', () => {
  const reasonKeySource = report.match(/const reasonKey = (.+);/);
  assert.ok(reasonKeySource, 'reasonKey helper is missing');
  const reasonKey = vm.runInNewContext(`(${reasonKeySource[1]})`);
  const reasons = [
    'Duplicate entry', 'Incorrect or missing volume numbers', 'Information to correct',
    'Missing cover art', 'Other', 'Troll entry', 'Vandalism',
    'Credit page in the middle of the chapter', 'Duplicate upload from same user/group',
    'Extraneous political/race-baiting/offensive content', 'Fake/Spam chapter',
    'Group lock evasion', 'Images not loading', 'Incorrect chapter number',
    'Incorrect group', 'Incorrect or duplicate pages', 'Incorrect or missing chapter title',
    'Incorrect or missing volume number', 'Missing pages', 'Naming rules broken',
    'Official release/Raw', 'Pages out of order', 'Released before raws released',
    'Uploaded on wrong manga', 'Watermarked images'
  ];
  for (const reason of reasons) {
    const key = reasonKey(reason);
    assert.equal(typeof vi[key], 'string', `Missing Vietnamese translation for ${reason}: ${key}`);
    assert.equal(typeof en[key], 'string', `Missing English translation for ${reason}: ${key}`);
  }
});

test('reader waits for the locale dictionary before rendering dynamic labels', () => {
  assert.match(reader, /await I18N\.init\(\)/);
});

test('reader page requests fresh localized scripts', () => {
  assert.match(readerView, /report-modal\.js\?v=1\.1/);
  assert.match(readerView, /reader-settings\.js\?v=1\.2/);
  assert.match(readerView, /reader\.js\?v=5\.1/);
});

test('every shared report modal consumer requests the localized script version', () => {
  for (const view of [readerView, detailView]) {
    assert.match(view, /report-modal\.js\?v=1\.1/);
  }
});
