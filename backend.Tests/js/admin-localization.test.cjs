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
const adminManga = read('backend/wwwroot/js/admin-manga.js');
const adminTitleDrafts = read('backend/wwwroot/js/admin-title-drafts.js');
const adminTitleReview = read('backend/wwwroot/js/admin-title-review.js');
const adminUsers = read('backend/wwwroot/js/admin-users.js');
const dynamicModules = [
  'backend/wwwroot/js/admin-manga.js',
  'backend/wwwroot/js/admin-mangadex.js',
  'backend/wwwroot/js/admin-reports.js',
  'backend/wwwroot/js/admin-title-drafts.js',
  'backend/wwwroot/js/admin-title-review.js',
  'backend/wwwroot/js/admin-upload.js',
  'backend/wwwroot/js/admin-users.js'
].map(read);
const standaloneViews = [
  'backend/Views/AdminView/Authors.cshtml',
  'backend/Views/AdminView/Genres.cshtml',
  'backend/Views/AdminView/Reports.cshtml',
  'backend/Views/AdminView/UserDetail.cshtml'
].map(read);
const adminUserDetail = read('backend/wwwroot/js/admin-user-detail.js');

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

test('integrated title review copy exists in both locales', () => {
  for (const key of [
    'admin.titleReview',
    'admin.titleReviewDescription',
    'admin.searchTitleReview',
    'admin.allReviewStatuses',
    'admin.reviewingTitle',
    'admin.backToReviewList',
    'admin.rejectionReasonRequired',
    'admin.noTitlesForReview',
    'admin.reviewLoadError',
    'admin.reviewActionError'
  ]) {
    assert.equal(typeof en[key], 'string', `missing English key ${key}`);
    assert.equal(typeof vi[key], 'string', `missing Vietnamese key ${key}`);
  }
});

test('title review refreshes dynamic copy after language change', () => {
  assert.match(adminTitleReview, /manganpk:localechanged/);
  assert.match(adminTitleReview, /renderList\(\)/);
  assert.match(adminTitleReview, /renderDetail/);
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

test('standalone admin pages use the shared locale system', () => {
  for (const source of standaloneViews) {
    assert.match(source, /\/js\/i18n\.js\?v=4\.0/);
    assert.match(source, /data-i18n="admin\./);
    assert.match(source, /class="admin-panel-label"/);
  }
  assert.match(adminUserDetail, /\bt\(['"]admin\./);
});

test('manga, draft, and chapter admin forms expose their main translation hooks', () => {
  for (const key of [
    'admin.newManga',
    'admin.basicInfo',
    'admin.publishingInfo',
    'admin.classification',
    'admin.images',
    'admin.links',
    'admin.translation',
    'admin.description',
    'admin.releaseYear',
    'admin.publisher',
    'admin.demographic',
    'admin.ageRating',
    'admin.format',
    'admin.chapterNumber',
    'admin.chapterTitle',
    'admin.pageUrls',
    'admin.preview',
    'admin.synchronize'
  ]) {
    assert.match(indexView, new RegExp(`data-i18n="${key.replace('.', '\\.')}"`), key);
  }
});

test('manga filters and create-edit forms expose complete translation controls', () => {
  for (const key of [
    'admin.allTypes',
    'admin.allStatuses',
    'admin.allSources',
    'admin.allChapterStates',
    'admin.sortNewest',
    'admin.itemsPerPage20',
    'admin.originalTitle',
    'admin.englishTitle',
    'admin.alternativeTitles',
    'admin.originalLanguage',
    'admin.mangaType',
    'admin.mangaStatus',
    'admin.availableAuthor',
    'admin.authorRole',
    'admin.newAuthor',
    'admin.coverUrl',
    'admin.bannerUrl',
    'admin.officialWebsite',
    'admin.referenceUrl',
    'admin.trackingUrl',
    'admin.scanlationGroup',
    'admin.notes',
    'admin.reviewStatus',
    'admin.createdBy',
    'admin.rejectionReason',
    'admin.saveDraft',
    'admin.authorAndRole',
    'admin.selectManga',
    'admin.uploadMoreImages',
    'admin.cancelEditing',
    'admin.publishChapter'
  ]) {
    assert.match(indexView, new RegExp(`data-i18n="${key.replace('.', '\\.')}"`), key);
  }
});

test('active manga and chapter edit forms refresh their dynamic labels after a locale change', () => {
  assert.match(adminManga, /function refreshMangaFormLocale\(/);
  assert.match(adminManga, /t\('admin\.editing'/);
  assert.match(adminCoordinator, /function refreshChapterFormLocale\(/);
  assert.match(adminCoordinator, /t\('admin\.saveChapter'/);
  assert.match(adminCoordinator, /refreshMangaFormLocale\(\)/);
  assert.match(adminCoordinator, /refreshChapterFormLocale\(\)/);
});

test('title draft list and review state stay in the selected locale', () => {
  for (const key of ['admin.cover', 'admin.mangaTitle', 'admin.reviewStatus', 'admin.updatedAt', 'admin.actions']) {
    assert.match(indexView, new RegExp(`<th[^>]*data-i18n="${key.replace('.', '\\.')}"`), key);
  }
  for (const key of ['admin.draftStatus', 'admin.pendingStatus', 'admin.approvedStatus', 'admin.rejectedStatus']) {
    assert.match(adminCoordinator, new RegExp(`t\\('${key.replace('.', '\\.')}'`), key);
  }
  assert.match(adminTitleDrafts, /function refreshTitleDraftFormLocale\(/);
  assert.match(adminCoordinator, /refreshTitleDraftFormLocale\(\)/);
});

test('author and genre submit buttons preserve icons while translating their labels', () => {
  assert.match(indexView, /<i[^>]*data-lucide="plus"[^>]*><\/i>\s*<span data-i18n="admin\.addAuthor">/);
  assert.match(indexView, /<i[^>]*data-lucide="plus"[^>]*><\/i>\s*<span data-i18n="admin\.addGenre">/);
});

test('author search combobox copy exists in both locales', () => {
  for (const key of ['admin.searchAuthorPlaceholder', 'admin.noAuthorMatches']) {
    assert.equal(typeof en[key], 'string', `missing English key ${key}`);
    assert.equal(typeof vi[key], 'string', `missing Vietnamese key ${key}`);
    assert.ok(en[key].trim(), `empty English key ${key}`);
    assert.ok(vi[key].trim(), `empty Vietnamese key ${key}`);
  }
});
