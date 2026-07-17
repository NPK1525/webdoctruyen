const assert = require('node:assert/strict');
const test = require('node:test');

const core = require('../../backend/wwwroot/js/mdlists-core.js');

test('buildSavePayload includes description and final ordered manga ids', () => {
  const payload = core.buildSavePayload({
    name: ' Favorites ', description: ' Good series ', isPublic: false,
    selected: [{ mangaId: 8 }, { id: 3 }]
  });

  assert.deepEqual(payload, {
    name: 'Favorites', description: 'Good series', isPublic: false, mangaIds: [8, 3]
  });
});

test('every picker sort maps to a server sort', () => {
  for (const key of core.SORT_KEYS) {
    const url = core.buildSearchUrl({ query: 'naroto', sort: key, page: 2, pageSize: 20 });
    assert.match(url, /fuzzy=true/);
    assert.match(url, /page=2/);
    assert.match(url, new RegExp(`sort=${encodeURIComponent(key)}`));
  }
});

test('search sequence rejects stale responses', () => {
  const sequence = core.createSearchSequence();
  const first = sequence.next();
  const second = sequence.next();

  assert.equal(sequence.isCurrent(first), false);
  assert.equal(sequence.isCurrent(second), true);
});

test('safeImageUrl rejects executable schemes', () => {
  assert.equal(core.safeImageUrl('javascript:alert(1)'), '');
  assert.equal(core.safeImageUrl('https://cdn.test/cover.jpg'), 'https://cdn.test/cover.jpg');
  assert.equal(core.safeImageUrl('/uploads/cover.jpg'), '/uploads/cover.jpg');
});

test('page coordinator exposes delete menu, visible failures and load-more behavior', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.resolve(__dirname, '../../backend/wwwroot/js/mdlists.js'), 'utf8');

  assert.match(source, /createCardActions/);
  assert.match(source, /deleteMdList/);
  assert.match(source, /setStatus\('mdlists-status'/);
  assert.match(source, /mdlists-load-more/);
  assert.match(source, /button\.disabled = true/);
});

test('page coordinator translates dynamic copy and rerenders after locale changes', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.resolve(__dirname, '../../backend/wwwroot/js/mdlists.js'), 'utf8');

  assert.match(source, /function mdText\(/);
  assert.match(source, /manganpk:localechanged/);
  assert.match(source, /mdlists\.sort\./);
  assert.match(source, /mdlists\.deleteConfirm/);
  assert.match(source, /mdlists\.count/);
  assert.match(source, /rerenderMnListLocale[\s\S]*if \(!currentUser\)[\s\S]*renderSignedOutEmpty/);
});
