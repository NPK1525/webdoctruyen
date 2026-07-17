const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../backend');
const css = fs.readFileSync(path.join(root, 'wwwroot/css/style.css'), 'utf8');
const ratingScript = fs.readFileSync(path.join(root, 'wwwroot/js/detail-rating.js'), 'utf8');

test('detail rating dropdown is scrollable and positioned inside the viewport', () => {
  const menuRule = css.match(/\.detail-rating-menu\s*\{([\s\S]*?)\}/)?.[1] || '';
  assert.match(menuRule, /max-height\s*:/);
  assert.match(menuRule, /overflow-y\s*:\s*auto/);
  assert.match(ratingScript, /function positionRatingMenu\(/);
  assert.match(ratingScript, /position\s*=\s*'fixed'/);
});

test('rating button fills its star after the user has rated', () => {
  assert.match(ratingScript, /classList\.toggle\(['"]rated['"],\s*userRating\s*>\s*0\)/);
  assert.match(css, /#rating-menu-btn\.rated\s+svg[\s\S]*?fill\s*:\s*currentColor/);
});
