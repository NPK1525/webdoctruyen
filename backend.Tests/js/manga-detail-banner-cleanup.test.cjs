const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const view = fs.readFileSync(path.join(root, 'backend/Views/MangaView/Detail.cshtml'), 'utf8');
const script = fs.readFileSync(path.join(root, 'backend/wwwroot/js/detail.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'backend/wwwroot/css/style.css'), 'utf8');
const en = JSON.parse(fs.readFileSync(path.join(root, 'backend/wwwroot/locales/en.json'), 'utf8'));
const vi = JSON.parse(fs.readFileSync(path.join(root, 'backend/wwwroot/locales/vi.json'), 'utf8'));

test('manga detail no longer exposes the legacy chapter upload entry', () => {
  assert.doesNotMatch(view, /btn-upload-chapter|\/admin\/chapter\/create/);
});

test('chapter list heading never includes the total count', () => {
  assert.match(view, /id="chapters-count-label"[^>]*>Danh [Ss]ách [Cc]hương<\/h3>/);
  assert.doesNotMatch(view, /Danh [Ss]ách [Cc]hương\s*\(0\)/);
  assert.doesNotMatch(script, /chapterList[^\n]*mangaDetail\.chapters\.length/);
});

test('detail banner uses cover art in a compact desktop frame', () => {
  assert.match(script, /src="\$\{mangaDetail\.coverUrl\}" class="banner-bg-img"/);
  assert.match(css, /\.detail-page \.detail-banner\s*\{[^}]*height:\s*360px/s);
  assert.match(css, /\.detail-page \.detail-banner\s*\{[^}]*min-height:\s*360px/s);
  assert.match(css, /\.detail-page \.detail-cover\s*\{[^}]*height:\s*356px[^}]*width:\s*250px/s);
  assert.match(css, /\.detail-banner \.banner-bg-img\s*\{[^}]*object-fit:\s*cover[^}]*object-position:\s*center/s);
});

test('detail banner returns to automatic height on mobile', () => {
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.detail-page \.detail-banner\s*\{[^}]*height:\s*auto[^}]*min-height:\s*0/s);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.detail-cover\s*\{[^}]*width:\s*145px[^}]*height:\s*210px/s);
});

test('detail actions and rating statistics sit outside the banner', () => {
  const banner = view.match(/<div id="detail-banner-area"[\s\S]*?<\/div>\s*<div class="detail-actions-shell">/)?.[0] ?? '';
  const shellRule = css.match(/\.detail-actions-shell\s*\{([^}]*)\}/s)?.[1] ?? '';
  assert.match(view, /<div class="detail-actions-shell">/);
  assert.doesNotMatch(banner, /class="detail-actions"/);
  assert.doesNotMatch(banner, /class="detail-stats-row"/);
  assert.match(shellRule, /margin-top:\s*0/);
});

test('detail banner keeps library actions visible', () => {
  const contentRule = css.match(/\.detail-page \.detail-banner-content\s*\{([^}]*)\}/s)?.[1] ?? '';
  const titleRule = css.match(/\.detail-page \.detail-title\s*\{([^}]*)\}/s)?.[1] ?? '';
  const authorRule = css.match(/\.detail-page \.detail-author\s*\{([^}]*)\}/s)?.[1] ?? '';

  assert.doesNotMatch(contentRule, /overflow:\s*hidden/);
  assert.match(titleRule, /-webkit-line-clamp:\s*2/);
  assert.doesNotMatch(authorRule, /margin:\s*42px/);
});

test('detail action labels use shared English and Vietnamese translations', () => {
  for (const key of ['detail.addToList', 'detail.continueReading', 'detail.report']) {
    assert.ok(en[key], `missing English translation: ${key}`);
    assert.ok(vi[key], `missing Vietnamese translation: ${key}`);
  }
  assert.match(view, /data-i18n="detail\.addToList"/);
  assert.match(view, /data-i18n="detail\.report"/);
  assert.match(script, /detail\.continueReading/);
  assert.doesNotMatch(view, />\s*Add to list\s*<\/button>/);
  assert.doesNotMatch(view, />\s*Continue Reading\s*<\/button>/);
  assert.doesNotMatch(view, />\s*Report\s*<\/button>/);
});

test('continue-reading action distinguishes first read from saved reading history', () => {
  assert.ok(en['detail.startReading']);
  assert.ok(vi['detail.startReading']);
  assert.match(view, /data-i18n="detail\.startReading"/);
  assert.match(script, /readLocalReadingHistory\(\)/);
  assert.match(script, /function updateContinueReadingButton\(\)/);
  assert.match(script, /lastChapterId/);
  assert.match(view, /\/js\/detail\.js\?v=4\.8/);
});
