const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../backend');
const detailView = fs.readFileSync(path.join(root, 'Views/MangaView/Detail.cshtml'), 'utf8');
const detailModule = fs.readFileSync(path.join(root, 'wwwroot/js/detail-lists.js'), 'utf8');
const detailCoordinator = fs.readFileSync(path.join(root, 'wwwroot/js/detail.js'), 'utf8');

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
