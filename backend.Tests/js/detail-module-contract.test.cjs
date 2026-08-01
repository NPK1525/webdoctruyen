const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../backend');
const detailView = fs.readFileSync(path.join(root, 'Views/MangaView/Detail.cshtml'), 'utf8');
const detailModule = fs.readFileSync(path.join(root, 'wwwroot/js/detail-lists.js'), 'utf8');
const detailCoordinator = fs.readFileSync(path.join(root, 'wwwroot/js/detail.js'), 'utf8');
const enLocale = JSON.parse(fs.readFileSync(path.join(root, 'wwwroot/locales/en.json'), 'utf8'));
const viLocale = JSON.parse(fs.readFileSync(path.join(root, 'wwwroot/locales/vi.json'), 'utf8'));

test('detail list module loads before the detail coordinator', () => {
  const listsIndex = detailView.indexOf('/js/detail-lists.js');
  const coordinatorIndex = detailView.indexOf('/js/detail.js');

  assert.ok(listsIndex >= 0);
  assert.ok(coordinatorIndex > listsIndex);
});

test('detail list responsibilities stay in the extracted module', () => {
  assert.match(detailModule, /function initAddToListButton\(\)/);
  assert.match(detailModule, /function renderAddToListOptions\(\)/);
  assert.doesNotMatch(detailCoordinator, /function initAddToListButton\(\)/);
  assert.doesNotMatch(detailCoordinator, /function renderAddToListOptions\(\)/);
});

test('detail list rendering owns its HTML escaping dependency', () => {
  assert.match(detailModule, /function escapeDetailListHtml\(value\)/);
  assert.match(detailModule, /escapeDetailListHtml\(list\.name\)/);
  assert.doesNotMatch(detailModule, /\bescHtml\(/);
});

test('detail library modal static copy is wired to locale keys', () => {
  for (const key of [
    'library.addToLibrary',
    'library.readingStatus',
    'library.status.reading',
    'common.cancel',
    'common.add'
  ]) {
    assert.match(detailView, new RegExp(`data-i18n="${key.replace('.', '\\.')}"`));
  }
  assert.match(detailView, /data-i18n-attr="title"[^>]*data-i18n="common\.close"/);
});

test('detail dynamic library controls refresh when locale changes', () => {
  assert.match(detailCoordinator, /function refreshDetailLocalizedControls\(\)/);
  for (const refresh of [
    'updateLibraryStatusButton',
    'renderAddLibraryStatusMenu',
    'updateAddLibrarySelectedStatus',
    'updateAddLibrarySubmitLabel'
  ]) {
    assert.match(
      detailCoordinator,
      new RegExp(`function refreshDetailLocalizedControls\\(\\)[\\s\\S]*?${refresh}\\(\\);`)
    );
  }
  assert.match(
    detailCoordinator,
    /window\.addEventListener\('manganpk:localechanged',\s*refreshDetailLocalizedControls\)/
  );
});

test('detail library copy exists in every locale', () => {
  for (const locale of [enLocale, viLocale]) {
    for (const key of [
      'library.addToLibrary',
      'library.readingStatus',
      'library.status.none',
      'library.status.reading',
      'library.status.plan',
      'library.status.completed',
      'library.status.onHold',
      'library.status.rereading',
      'library.status.dropped'
    ]) {
      assert.equal(typeof locale[key], 'string', `${key} must exist in every locale`);
    }
  }
});

test('detail back-home action and chapter rows follow the selected locale', () => {
  assert.match(detailView, /data-i18n="detail\.backHome"/);
  assert.match(
    detailCoordinator,
    /function refreshDetailLocalizedControls\(\)[\s\S]*?renderChaptersList\(\);/
  );
  for (const locale of [enLocale, viLocale]) {
    assert.equal(typeof locale['detail.backHome'], 'string');
    assert.equal(typeof locale['detail.chapter'], 'string');
    assert.equal(typeof locale['detail.noChapterTitle'], 'string');
  }
});

test('signed-out detail actions keep the same labels and layout as signed-in actions', () => {
  assert.doesNotMatch(detailView, /id="btn-add-to-list"[^>]*display:\s*none/);
  assert.doesNotMatch(detailModule, /btn\.style\.display\s*=\s*'none'/);
  assert.match(detailModule, /btn\.style\.display\s*=\s*'inline-flex'/);
  assert.match(
    detailModule,
    /btn\.onclick\s*=\s*\(\)\s*=>\s*\{[\s\S]*?if\s*\(!currentUser\)[\s\S]*?openAuthModal\('login'\)/
  );
});

test('detail uses Library as the single follow source and persists it to the server', () => {
  assert.doesNotMatch(detailView, /id="btn-bookmark-manga"/);
  assert.doesNotMatch(detailCoordinator, /function updateBookmarkButton\(\)/);
  assert.doesNotMatch(detailCoordinator, /function toggleFollow\(\)/);
  assert.match(detailCoordinator, /apiFetch\(`\/api\/library\/\$\{activeMangaId\}`\)/);
  assert.match(detailCoordinator, /apiFetch\('\/api\/library\/follow'/);
  assert.match(detailCoordinator, /method:\s*'DELETE'/);
  assert.match(detailCoordinator, /method:\s*'PUT'/);
});

test('detail chapter rows render each chapters own view count', () => {
  assert.match(detailView, /viewCount\s*=\s*c\.ViewCount/);
  assert.match(detailCoordinator, /data-lucide="eye"/);
  assert.match(detailCoordinator, /formatCompactNumber\(c\.viewCount\s*\|\|\s*0\)/);
});
