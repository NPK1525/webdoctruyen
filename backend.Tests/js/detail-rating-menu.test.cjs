const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../backend');
const css = fs.readFileSync(path.join(root, 'wwwroot/css/style.css'), 'utf8');
const ratingScript = fs.readFileSync(path.join(root, 'wwwroot/js/detail-rating.js'), 'utf8');
const detailView = fs.readFileSync(path.join(root, 'Views/MangaView/Detail.cshtml'), 'utf8');

test('detail rating dropdown is scrollable and positioned inside the viewport', () => {
  const menuRule = css.match(/\.detail-rating-menu\s*\{([\s\S]*?)\}/)?.[1] || '';
  assert.match(menuRule, /max-height\s*:/);
  assert.match(menuRule, /overflow-y\s*:\s*auto/);
  assert.match(ratingScript, /function positionRatingMenu\(/);
  assert.match(ratingScript, /position\s*=\s*'fixed'/);
});

test('rating dropdown stays below the fixed header so score 10 remains clickable', () => {
  assert.match(ratingScript, /getElementById\('global-header'\)/);
  assert.match(ratingScript, /const viewportTop = Math\.max\(viewportPadding, headerBottom \+ gap\)/);
  assert.match(ratingScript, /availableAbove = rect\.top - gap - viewportTop/);
  assert.match(ratingScript, /Math\.max\(viewportTop, rect\.top - gap/);
  assert.match(detailView, /\/js\/detail-rating\.js\?v=3\.6/);
});

test('rating button fills its star after the user has rated', () => {
  assert.match(ratingScript, /classList\.toggle\(['"]rated['"],\s*userRating\s*>\s*0\)/);
  assert.match(css, /#rating-menu-btn\.rated\s+svg[\s\S]*?fill\s*:\s*currentColor/);
});

test('detail comment statistic uses the manga comment count, not rating count', () => {
  assert.match(ratingScript, /const detailCommentCount = mangaDetail\?\.commentCount \?\? 0;/);
  assert.match(ratingScript, /if \(detailCount\) detailCount\.textContent = detailCommentCount;/);
});
