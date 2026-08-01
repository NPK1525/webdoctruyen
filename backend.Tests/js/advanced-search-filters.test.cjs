const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const modulePath = path.join(root, 'backend', 'wwwroot', 'js', 'advanced-search-filters.js');
const filterModule = fs.readFileSync(modulePath, 'utf8');

function loadUtils() {
  const context = { window: {} };
  vm.runInNewContext(filterModule, context, { filename: modulePath });
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
    { id: 3, name: 'Creator', roles: ['Story & Art'] },
    { id: 4, name: 'Legacy Writer', roles: ['Story (Nguyên tác)'] },
    { id: 5, name: 'Legacy Artist', roles: ['Art (Họa sĩ vẽ)'] }
  ];
  assert.deepEqual(utils.peopleForRole(people, 'author').map(person => person.id), [1, 3, 4]);
  assert.deepEqual(utils.peopleForRole(people, 'artist').map(person => person.id), [2, 3, 5]);
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

test('tag filtering returns the complete catalog while people suggestions can be limited', () => {
  const utils = loadUtils();
  const options = Array.from({ length: 12 }, (_, index) => ({
    id: index + 1,
    name: `Tag ${index + 1}`
  }));

  assert.equal(utils.filterOptions(options, '').length, 12);
  assert.equal(utils.filterOptions(options, '', option => option.name, 8).length, 8);
});

const mangaView = fs.readFileSync(
  path.join(root, 'backend', 'Views', 'MangaView', 'Index.cshtml'),
  'utf8'
);
const styleSheet = fs.readFileSync(
  path.join(root, 'backend', 'wwwroot', 'css', 'style.css'),
  'utf8'
);
const advancedSearchScript = fs.readFileSync(
  path.join(root, 'backend', 'wwwroot', 'js', 'advanced-search.js'),
  'utf8'
);
const enLocale = JSON.parse(fs.readFileSync(
  path.join(root, 'backend', 'wwwroot', 'locales', 'en.json'),
  'utf8'
));
const viLocale = JSON.parse(fs.readFileSync(
  path.join(root, 'backend', 'wwwroot', 'locales', 'vi.json'),
  'utf8'
));

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

test('advanced search new filters are wired for localization', () => {
  for (const key of [
    'search.filterTags',
    'search.includeAny',
    'search.searchTags',
    'search.tagHint',
    'search.dismiss',
    'search.authors',
    'search.artists',
    'search.any',
    'filter.format',
    'filter.genre',
    'filter.theme',
    'filter.content'
  ]) {
    assert.match(mangaView, new RegExp(`data-i18n="${key.replace('.', '\\.')}"`));
  }
  assert.match(filterModule, /search\.noMatches/);
  assert.match(filterModule, /search\.noTagMatches/);
  assert.match(filterModule, /search\.include/);
  assert.match(filterModule, /search\.exclude/);

  for (const locale of [enLocale, viLocale]) {
    assert.equal(typeof locale['search.filterTags'], 'string');
    assert.equal(typeof locale['search.any'], 'string');
    assert.equal(typeof locale['search.noTagMatches'], 'string');
    assert.equal(typeof locale['filter.content'], 'string');
  }
});

test('advanced search page and dynamic labels are fully localized', () => {
  for (const key of [
    'nav.advancedSearch',
    'search.placeholder',
    'search.showFilters',
    'search.sortBy',
    'search.sortNone',
    'search.sortLatest',
    'search.sortTitle',
    'search.sortYear',
    'search.sortViews',
    'filter.type',
    'filter.demographic',
    'search.publicationStatus',
    'filter.releaseYear',
    'search.contentRating',
    'search.safe',
    'search.suggestive',
    'search.resetFilters',
    'search.feelingLucky',
    'filter.search',
    'search.listView',
    'search.compactView',
    'search.gridView',
    'common.loading'
  ]) {
    assert.match(mangaView, new RegExp(`data-i18n="${key.replace('.', '\\.')}"`));
  }

  for (const key of [
    'search.hideFilters',
    'search.titleSingular',
    'search.titlePlural',
    'search.removeSelected'
  ]) {
    assert.match(`${advancedSearchScript}\n${filterModule}`, new RegExp(key.replace('.', '\\.')));
  }

  for (const locale of [enLocale, viLocale]) {
    for (const key of [
      'search.showFilters',
      'search.hideFilters',
      'search.sortBy',
      'search.publicationStatus',
      'search.contentRating',
      'search.resetFilters',
      'search.feelingLucky',
      'search.titleSingular',
      'search.titlePlural',
      'search.removeSelected'
    ]) {
      assert.equal(typeof locale[key], 'string', `${key} must exist in every locale`);
    }
  }

  assert.doesNotMatch(advancedSearchScript, /label\.textContent\s*=\s*advancedFiltersOpen\s*\?/);
  assert.doesNotMatch(advancedSearchScript, /countLabel\.textContent\s*=\s*`\$\{advancedTotalCount\} \$\{advancedTotalCount === 1/);
});

test('advanced taxonomy keeps canonical English tag labels', () => {
  assert.match(advancedSearchScript, /name: 'Adaptation'/);
  assert.match(advancedSearchScript, /name: 'Gore'/);
  assert.doesNotMatch(advancedSearchScript, /name: 'Adaptation', i18n:/);
  assert.doesNotMatch(advancedSearchScript, /name: 'Gore', i18n:/);
});

test('advanced search styles include responsive tag panel and selected states', () => {
  assert.match(styleSheet, /\.advanced-filter-tags-panel/);
  assert.match(styleSheet, /\.advanced-filter-tag\.include/);
  assert.match(styleSheet, /\.advanced-filter-tag\.exclude/);
  assert.match(styleSheet, /@media\s*\(max-width:\s*760px\)/);
});

test('advanced search serializes all new filter parameters', () => {
  assert.match(advancedSearchScript, /advancedFiltersState\?\.getQueryState/);
  assert.match(advancedSearchScript, /URLSearchParams/);
  assert.match(advancedSearchScript, /AdvancedSearchFilters\??\.\s*create/);
});

test('advanced search restores URL state and resets the new filters', () => {
  assert.match(advancedSearchScript, /setState\(/);
  assert.match(advancedSearchScript, /advancedFiltersState\.reset\(\)/);
  assert.match(advancedSearchScript, /advanced-filter-tags-dismiss/);
  assert.match(advancedSearchScript, /advanced-filter-tags-reset/);
});
