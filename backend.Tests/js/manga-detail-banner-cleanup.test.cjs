const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const view = fs.readFileSync(path.join(root, 'backend/Views/MangaView/Detail.cshtml'), 'utf8');
const script = fs.readFileSync(path.join(root, 'backend/wwwroot/js/detail.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'backend/wwwroot/css/style.css'), 'utf8');

test('manga detail no longer exposes the legacy chapter upload entry', () => {
  assert.doesNotMatch(view, /btn-upload-chapter|\/admin\/chapter\/create/);
});

test('chapter list heading never includes the total count', () => {
  assert.match(view, /id="chapters-count-label"[^>]*>Danh [Ss]ách [Cc]hương<\/h3>/);
  assert.doesNotMatch(view, /Danh [Ss]ách [Cc]hương\s*\(0\)/);
  assert.doesNotMatch(script, /chapterList[^\n]*mangaDetail\.chapters\.length/);
});

test('detail banner uses cover art in a fixed desktop frame', () => {
  assert.match(script, /src="\$\{mangaDetail\.coverUrl\}" class="banner-bg-img"/);
  assert.match(css, /\.detail-page \.detail-banner\s*\{[^}]*height:\s*430px/s);
  assert.match(css, /\.detail-page \.detail-banner\s*\{[^}]*min-height:\s*430px/s);
  assert.match(css, /\.detail-page \.detail-cover\s*\{[^}]*height:\s*356px[^}]*width:\s*250px/s);
  assert.match(css, /\.detail-banner \.banner-bg-img\s*\{[^}]*object-fit:\s*cover[^}]*object-position:\s*center/s);
});

test('detail banner returns to automatic height on mobile', () => {
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.detail-page \.detail-banner\s*\{[^}]*height:\s*auto[^}]*min-height:\s*0/s);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.detail-cover\s*\{[^}]*width:\s*145px[^}]*height:\s*210px/s);
});
