const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../backend');

test('MDList has an MVC view with the shared shell and no followed tab', () => {
  const view = fs.readFileSync(path.join(root, 'Views/MangaListsView/Index.cshtml'), 'utf8');
  assert.match(view, /Html\.PartialAsync\("_Header"\)/);
  assert.match(view, /Html\.PartialAsync\("_Sidebar"\)/);
  assert.match(view, /Html\.PartialAsync\("_AuthModal"\)/);
  assert.doesNotMatch(view, /Followed MDLists|followed-mdlists/i);
});

test('MDList editor exposes visibility, title search and all requested sort options', () => {
  const view = fs.readFileSync(path.join(root, 'Views/MangaListsView/Index.cshtml'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'wwwroot/js/mdlists.js'), 'utf8');
  for (const option of ['Public', 'Private', 'Best Match', 'Latest Upload', 'Oldest Upload', 'Title Ascending', 'Title Descending', 'Highest Rating', 'Lowest Rating', 'Most Follows', 'Fewest Follows', 'Recently Added', 'Oldest Added', 'Year Ascending', 'Year Descending']) {
    assert.match(`${view}\n${script}`, new RegExp(option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), option);
  }
  assert.match(view, /Search titles/i);
  assert.match(view, /Add some titles/i);
  assert.match(view, /mdlists-description/);
  assert.match(view, /mdlists-status/);
  assert.match(view, /mdlists-load-more/);
  assert.match(view, /MN Lists/i);
});

test('MN List dictionaries have matching complete English and Vietnamese keys', () => {
  const en = JSON.parse(fs.readFileSync(path.join(root, 'wwwroot/locales/en.json'), 'utf8'));
  const vi = JSON.parse(fs.readFileSync(path.join(root, 'wwwroot/locales/vi.json'), 'utf8'));
  const required = [
    'title', 'singular', 'new', 'create', 'edit', 'save', 'delete', 'cancel',
    'namePlaceholder', 'descriptionPlaceholder', 'visibility', 'public', 'private',
    'addTitles', 'searchTitle', 'searchPlaceholder', 'sortBy', 'loadMore',
    'emptyTitle', 'emptyBody', 'signedOutTitle', 'signedOutBody', 'signIn',
    'countOne', 'countMany', 'added', 'add', 'removeTitle', 'deleteConfirm',
    'loadingLists', 'deleting', 'opening', 'saving', 'creating', 'searching',
    'errorLoad', 'errorDelete', 'errorOpen', 'errorSave', 'errorSearch', 'nameRequired',
    'sort.best', 'sort.latest', 'sort.oldestUpload', 'sort.titleAsc', 'sort.titleDesc',
    'sort.ratingDesc', 'sort.ratingAsc', 'sort.followsDesc', 'sort.followsAsc',
    'sort.recent', 'sort.oldestAdded', 'sort.yearAsc', 'sort.yearDesc'
  ].map(key => `mdlists.${key}`);

  for (const key of required) {
    assert.equal(typeof en[key], 'string', `missing English ${key}`);
    assert.equal(typeof vi[key], 'string', `missing Vietnamese ${key}`);
  }
  assert.equal(en['mdlists.title'], 'MN Lists');
  assert.equal(vi['mdlists.title'], 'Danh sách MN');
  assert.equal(en['nav.mdlists'], 'MN Lists');
  assert.equal(vi['nav.mdlists'], 'Danh sách MN');
});

test('MN List view uses translation hooks and contains no legacy user-facing branding', () => {
  const view = fs.readFileSync(path.join(root, 'Views/MangaListsView/Index.cshtml'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'wwwroot/js/mdlists.js'), 'utf8');
  assert.match(view, /data-i18n="mdlists\.title"/);
  assert.match(view, /data-i18n-attr="placeholder"/);
  assert.match(script, /manganpk:localechanged/);
  assert.match(script, /mdText\(/);
  assert.doesNotMatch(`${view}\n${script}`, /My MDLists|New MDList|Create MDList|Edit MDList|MDList name|your MDLists|this MDList|No MDLists/i);
});

test('MN List CSS consumes shared theme variables instead of fixed dark surfaces', () => {
  const css = fs.readFileSync(path.join(root, 'wwwroot/css/mdlists.css'), 'utf8');
  for (const variable of ['--bg-main', '--bg-card', '--bg-card-hover', '--bg-input', '--text-main', '--text-muted', '--border-subtle']) {
    assert.match(css, new RegExp(`var\\(${variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`), variable);
  }
  assert.doesNotMatch(css, /\.mdlists-page\{[^}]*background:#17191d/);
  assert.doesNotMatch(css, /\.mdlists-card\{[^}]*background:#2c2c2d/);
  assert.doesNotMatch(css, /\.mdlists-title-panel\{[^}]*background:#191b1f/);
  assert.match(css, /body\.light-mode/);
});

test('legacy MDList URL redirects to the MVC route', () => {
  const source = fs.readFileSync(path.join(root, 'Services/LegacyRouteRedirect.cs'), 'utf8');
  const legacyPage = fs.readFileSync(path.join(root, 'wwwroot/lists.html'), 'utf8');
  assert.match(source, /lists\.html/);
  assert.match(source, /\/lists/);
  assert.match(legacyPage, /5274\/lists/);
  assert.doesNotMatch(legacyPage, /list-modal|btn-create-list|lists-grid/);
});

test('signed-out visitors still see the MangaDex-style MDList shell', () => {
  const script = fs.readFileSync(path.join(root, 'wwwroot/js/mdlists.js'), 'utf8');
  assert.match(script, /showMd\('mdlists-overview'\)/);
  assert.match(script, /openAuthModal\('login'\)/);
  assert.doesNotMatch(script, /if \(!currentUser\) \{ showMd\('mdlists-login'\); return; \}/);
});

test('MDList overview API supplies owner and cover previews for MangaDex-style cards', () => {
  const controller = fs.readFileSync(path.join(root, 'Controllers/MangaListController.cs'), 'utf8');
  assert.match(controller, /OwnerName\s*=\s*l\.User\.Username/);
  assert.match(controller, /PreviewItems\s*=\s*l\.Items/);
  assert.match(controller, /public string OwnerName/);
  assert.match(controller, /public List<ListItemDto> PreviewItems/);
});

test('development launch uses only Kestrel and never starts the legacy Node server', () => {
  const workspaceRoot = path.resolve(root, '..');
  const tasks = fs.readFileSync(path.join(workspaceRoot, '.vscode/tasks.json'), 'utf8');
  const launch = fs.readFileSync(path.join(workspaceRoot, '.vscode/launch.json'), 'utf8');
  assert.doesNotMatch(tasks, /http-server|start-frontend|start-all|prepare-all/);
  assert.match(launch, /"preLaunchTask"\s*:\s*"build-backend"/);
  assert.doesNotMatch(launch, /5000|index\.html/);
});
