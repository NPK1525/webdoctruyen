const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const vi = JSON.parse(read('backend/wwwroot/locales/vi.json'));
const en = JSON.parse(read('backend/wwwroot/locales/en.json'));
const indexView = read('backend/Views/AdminView/Index.cshtml');
const css = read('backend/wwwroot/css/style.css');
const adminCoordinator = read('backend/wwwroot/js/admin.js');
const adminUsers = read('backend/wwwroot/js/admin-users.js');
const dynamicModules = [
  'backend/wwwroot/js/admin-manga.js',
  'backend/wwwroot/js/admin-mangadex.js',
  'backend/wwwroot/js/admin-reports.js',
  'backend/wwwroot/js/admin-title-drafts.js',
  'backend/wwwroot/js/admin-upload.js',
  'backend/wwwroot/js/admin-users.js'
].map(read);

test('admin dictionaries stay complete in Vietnamese and English', () => {
  const viKeys = Object.keys(vi).filter(key => key.startsWith('admin.')).sort();
  const enKeys = Object.keys(en).filter(key => key.startsWith('admin.')).sort();
  assert.deepEqual(viKeys, enKeys);

  for (const key of [
    'admin.controlPanel',
    'admin.management',
    'admin.mangaList',
    'admin.postManga',
    'admin.addChapter',
    'admin.importMangaDex',
    'admin.authors',
    'admin.genres',
    'admin.reports',
    'admin.users',
    'admin.save',
    'admin.cancel',
    'admin.delete',
    'admin.edit',
    'admin.loading',
    'admin.noResults',
    'admin.connectionError'
  ]) {
    assert.ok(vi[key], `Missing Vietnamese key ${key}`);
    assert.ok(en[key], `Missing English key ${key}`);
  }
});

test('admin control panel label uses the selected-tab accent', () => {
  assert.match(indexView, /class="admin-panel-label"[^>]*data-i18n="admin\.controlPanel"/);
  assert.match(css, /\.admin-panel-label\s*\{[^}]*color:\s*var\(--accent-primary\)/s);
});

test('admin control panel static controls expose translation hooks', () => {
  for (const key of [
    'admin.management',
    'admin.mangaList',
    'admin.postManga',
    'admin.addChapter',
    'admin.importMangaDex',
    'admin.authors',
    'admin.genres',
    'admin.reports',
    'admin.users',
    'admin.userInfo',
    'admin.resetPassword',
    'admin.backToUsers'
  ]) {
    assert.match(indexView, new RegExp(`data-i18n="${key.replace('.', '\\.')}"`), key);
  }
  assert.match(
    indexView,
    /id="admin-user-search"[^>]*data-i18n="admin\.searchUsers"[^>]*data-i18n-attr="placeholder"/
  );
});

test('dynamic admin modules use the shared dictionary and refresh on locale changes', () => {
  for (const source of dynamicModules) {
    assert.match(source, /\bt\(['"]admin\./);
  }
  assert.match(adminUsers, /function refreshLocale\(\)/);
  assert.match(adminUsers, /AdminUsers\.refreshLocale\s*=\s*refreshLocale/);
  assert.match(adminCoordinator, /manganpk:localechanged/);
  assert.match(adminCoordinator, /AdminUsers\?\.refreshLocale\(\)/);
});
