const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../backend');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const view = read('Views/FollowedUpdatesView/Index.cshtml');
const script = read('wwwroot/js/updates.js');
const en = JSON.parse(read('wwwroot/locales/en.json'));
const vi = JSON.parse(read('wwwroot/locales/vi.json'));

test('followed updates page exposes translation hooks instead of hard-coded mixed-language copy', () => {
  for (const key of [
    'updates.followedTitle',
    'updates.followedEmpty',
    'updates.loginTitle',
    'updates.loginDescription',
    'auth.login'
  ]) {
    assert.match(view, new RegExp(`data-i18n="${key.replace('.', '\\.')}"`));
  }
  assert.doesNotMatch(view, />0 Titles</);
  assert.doesNotMatch(view, /__UPDATES_EMPTY_MESSAGE__/);
});

test('updates count and expandable actions rerender in the selected locale', () => {
  assert.match(script, /t\('updates\.titleCount'/);
  assert.match(script, /t\('updates\.showAll'/);
  assert.match(script, /t\('updates\.showLess'/);
  assert.match(script, /manganpk:localechanged/);
});

test('followed updates translations exist in both locales', () => {
  for (const locale of [en, vi]) {
    for (const key of [
      'updates.followedTitle',
      'updates.followedEmpty',
      'updates.loginTitle',
      'updates.loginDescription',
      'updates.titleCount',
      'updates.showAll',
      'updates.showLess'
    ]) {
      assert.equal(typeof locale[key], 'string', `${key} must exist in every locale`);
    }
  }
  assert.equal(en['updates.followedTitle'], 'Updates');
  assert.equal(vi['updates.followedTitle'], 'C\u1eadp nh\u1eadt');
});
