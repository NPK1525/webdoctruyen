const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const modulePath = path.join(root, 'backend', 'wwwroot', 'js', 'advanced-search-filters.js');

function loadUtils() {
  const source = fs.readFileSync(modulePath, 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: modulePath });
  return context.window.AdvancedSearchFilterUtils;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('cycles a tag neutral -> include -> exclude -> neutral', () => {
  const utils = loadUtils();
  assert.equal(utils.cycleTagState('neutral'), 'include');
  assert.equal(utils.cycleTagState('include'), 'exclude');
  assert.equal(utils.cycleTagState('exclude'), 'neutral');
});

test('serializes selected tag and author ids into query state', () => {
  const utils = loadUtils();
  const query = utils.serializeState({
    tags: {
      format: { include: ['1'], exclude: ['3'] },
      genre: { include: [2, 4], exclude: [8] },
      theme: { include: [], exclude: [] },
      content: { include: ['gore'], exclude: ['sexual-violence'] }
    },
    authors: [11, 12],
    artists: [12]
  });
  assert.deepEqual(plain(query), {
    includeFormats: '1',
    excludeFormats: '3',
    includeGenreIds: '2,4',
    excludeGenreIds: '8',
    includeContent: 'gore',
    excludeContent: 'sexual-violence',
    authorIds: '11,12',
    artistIds: '12'
  });
});

test('Story & Art person data is eligible for both author and artist lists', () => {
  const utils = loadUtils();
  const people = [
    { id: 1, name: 'Writer', roles: ['Story'] },
    { id: 2, name: 'Artist', roles: ['Art'] },
    { id: 3, name: 'Creator', roles: ['Story & Art'] }
  ];
  assert.deepEqual(utils.peopleForRole(people, 'author').map(person => person.id), [1, 3]);
  assert.deepEqual(utils.peopleForRole(people, 'artist').map(person => person.id), [2, 3]);
});

test('reset clears tags, authors, and artists', () => {
  const utils = loadUtils();
  const reset = utils.resetState({
    tags: {
      format: { include: ['1'], exclude: [] },
      genre: { include: [], exclude: ['4'] },
      theme: { include: [], exclude: [] },
      content: { include: ['gore'], exclude: [] }
    },
    authors: [1],
    artists: [2]
  });
  assert.deepEqual(plain(reset), {
    tags: {
      format: { include: [], exclude: [] },
      genre: { include: [], exclude: [] },
      theme: { include: [], exclude: [] },
      content: { include: [], exclude: [] }
    },
    authors: [],
    artists: []
  });
});

test('search text filters visible tag and person options case-insensitively', () => {
  const utils = loadUtils();
  assert.deepEqual(
    utils.filterOptions([{ id: 1, name: 'Action' }, { id: 2, name: 'Romance' }], 'ACT'),
    [{ id: 1, name: 'Action' }]
  );
  assert.deepEqual(
    utils.filterOptions([{ id: 1, name: 'Nguyen Khang' }, { id: 2, name: 'Aki' }], 'kHang'),
    [{ id: 1, name: 'Nguyen Khang' }]
  );
});

const mangaView = fs.readFileSync(
  path.join(root, 'backend', 'Views', 'MangaView', 'Index.cshtml'),
  'utf8'
);
const styleSheet = fs.readFileSync(
  path.join(root, 'backend', 'wwwroot', 'css', 'style.css'),
  'utf8'
);

test('advanced search exposes tag, author, and artist controls with ARIA markup', () => {
  for (const id of [
    'advanced-filter-tags-trigger',
    'advanced-filter-tags-panel',
    'advanced-filter-tags-search',
    'advanced-author-search',
    'advanced-artist-search'
  ]) {
    assert.match(mangaView, new RegExp(`id="${id}"`));
  }
  assert.match(mangaView, /aria-expanded="false"/);
  assert.match(mangaView, /role="listbox"/);
  assert.match(mangaView, /data-filter-group="format"/);
  assert.match(mangaView, /data-filter-group="genre"/);
  assert.match(mangaView, /data-filter-group="theme"/);
  assert.match(mangaView, /data-filter-group="content"/);
});

test('advanced search styles include responsive tag panel and selected states', () => {
  assert.match(styleSheet, /\.advanced-filter-tags-panel/);
  assert.match(styleSheet, /\.advanced-filter-tag\.include/);
  assert.match(styleSheet, /\.advanced-filter-tag\.exclude/);
  assert.match(styleSheet, /@media\s*\(max-width:\s*760px\)/);
});
