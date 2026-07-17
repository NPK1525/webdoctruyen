const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../../backend');
const viewPaths = [
  'Views/AdminView/Index.cshtml', 'Views/ChapterView/Read.cshtml',
  'Views/FollowedUpdatesView/Index.cshtml',
  'Views/HistoryView/Index.cshtml', 'Views/Home/Index.cshtml',
  'Views/LibraryView/Index.cshtml', 'Views/MangaView/Detail.cshtml',
  'Views/MangaView/Index.cshtml', 'Views/RecentlyAddedView/Index.cshtml',
  'Views/UpdatesView/Index.cshtml',
  'wwwroot/detail.html', 'wwwroot/index.html',
  'wwwroot/profile.html', 'wwwroot/reader.html'
];
const modulePath = path.join(root, 'wwwroot/js/common-auth.js');
const coordinator = fs.readFileSync(path.join(root, 'wwwroot/js/common.js'), 'utf8');

function getSidebarRendererSource() {
  const match = coordinator.match(
    /function renderUnifiedSidebarDrawer\(\) \{[\s\S]*?\r?\n\}\r?\n\r?\n\/\/ Parse user session/
  );
  assert.ok(match, 'renderUnifiedSidebarDrawer source');
  return match[0].replace(/\r?\n\r?\n\/\/ Parse user session$/, '');
}

test('every common consumer loads common-auth before common.js', () => {
  assert.ok(fs.existsSync(modulePath));
  for (const relativePath of viewPaths) {
    const view = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const moduleIndex = view.indexOf('js/common-auth.js');
    const commonIndex = view.indexOf('js/common.js');
    assert.ok(moduleIndex >= 0, relativePath);
    assert.ok(commonIndex > moduleIndex, relativePath);
  }
});

test('auth functions belong to common-auth', () => {
  const source = fs.readFileSync(modulePath, 'utf8');
  for (const name of ['initAuthModals', 'openAuthModal', 'switchAuthView', 'normalizeAuthModalText']) {
    assert.match(source, new RegExp(`function ${name}\\(`));
    assert.doesNotMatch(coordinator, new RegExp(`function ${name}\\(`));
  }
});

test('auth modal closes only when the backdrop is clicked', () => {
  const source = fs.readFileSync(modulePath, 'utf8');
  assert.match(source, /modal\.addEventListener\('click', \(event\) => \{\s*if \(event\.target === event\.currentTarget\)/s);
});

test('local storage writes are guarded against storage failures', () => {
  const source = fs.readFileSync(path.join(root, 'wwwroot/js/common-library.js'), 'utf8');
  assert.match(source, /function writeLocalLibrary\(items\) \{\s*try \{/s);
  assert.match(source, /function writeLocalReadingHistory\(items\) \{\s*try \{/s);
});

test('shared navigation keeps account actions and excludes contribution route', () => {
  assert.match(coordinator, /id="header-login-btn"/);
  assert.match(coordinator, /id="header-register-btn"/);
  assert.doesNotMatch(coordinator, /nav-contribute-btn|\/contribution\/title\/create/);
});

test('my profile menu opens the profile page instead of the library', () => {
  const profileLink = coordinator.match(
    /<a href="([^"]+)"[^>]*>[\s\S]*?<span>\$\{t\('user\.profile'/
  );
  assert.ok(profileLink, 'my profile link');
  assert.equal(profileLink[1], '/profile.html');
});

test('my lists menu opens the MDList page', () => {
  const listsLink = coordinator.match(
    /<a href="([^"]+)"[^>]*>(?:(?!<\/a>)[\s\S])*?<span>\$\{t\('lists\.title'/
  );
  assert.ok(listsLink, 'my lists link');
  assert.equal(listsLink[1], '/lists');
});

test('account menu excludes unavailable notification and account actions', () => {
  assert.doesNotMatch(coordinator, /notification-bell|notification-dropdown/);
  assert.doesNotMatch(coordinator, /user\.reports|user\.subscription/);
});

test('pages do not load the removed notification feature', () => {
  for (const relativePath of viewPaths) {
    const view = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(view, /notification\.js/);
  }
});

test('settings opens profile and sidebar MDLists opens the lists page', () => {
  const settingsLink = coordinator.match(
    /<a href="([^"]+)"[^>]*>(?:(?!<\/a>)[\s\S])*?<span>\$\{t\('user\.settings'/
  );
  assert.ok(settingsLink, 'settings link');
  assert.equal(settingsLink[1], '/profile.html');
  assert.match(coordinator, /nav-lists-btn[\s\S]*?window\.location\.href = '\/lists'/);
});

test('followed updates and latest updates use distinct MVC routes', () => {
  assert.match(coordinator, /nav-updates-btn[\s\S]*?window\.location\.href = '\/follow-updates'/);
  assert.match(coordinator, /nav-latest-updates-btn[\s\S]*?window\.location\.href = '\/updates'/);
  assert.match(coordinator, /path\.startsWith\('\/follow-updates'\)\) activeId = 'nav-updates-btn'/);
});

test('all static pages opt into the MVC sidebar renderer', () => {
  for (const relativePath of ['wwwroot/index.html', 'wwwroot/detail.html', 'wwwroot/profile.html', 'wwwroot/reader.html']) {
    const page = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.match(page, /id="sidebar-drawer"[^>]*data-use-unified-sidebar="true"/, relativePath);
  }
  assert.match(coordinator, /drawer\.children\.length > 0 && !useUnifiedSidebar/);
});

test('home recommendations and profile back link use live routes', () => {
  const home = fs.readFileSync(path.join(root, 'Views/Home/Index.cshtml'), 'utf8');
  const profile = fs.readFileSync(path.join(root, 'wwwroot/profile.html'), 'utf8');

  assert.doesNotMatch(home, /\/titles\/recommended/);
  assert.match(home, /href="\/manga"[^>]*data-i18n="section\.recommended"/);
  assert.doesNotMatch(profile, /href="index\.html"/);
  assert.match(profile, /href="\/"[^>]*>[\s\S]*?Quay l[aạ]i trang ch[uủ]/);
});

test('all shared navigation consumers use the same common.js cache version', () => {
  for (const relativePath of viewPaths) {
    const view = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.match(view, /(?:\/|\b)js\/common\.js\?v=5\.5/, relativePath);
  }
});

test('locale changes refresh dynamic shared navigation labels', () => {
  const listenerBody = coordinator.match(
    /window\.addEventListener\('manganpk:localechanged', \(\) => \{([\s\S]*?)\n  \}\);/
  )?.[1] ?? '';

  assert.match(listenerBody, /renderHeaderUserArea\(\)/);
  assert.match(listenerBody, /renderSidebarFooterArea\(\)/);
  assert.match(listenerBody, /I18N\.apply\(\)/);
});

test('sidebar renderer preserves markup already owned by the page', () => {
  const drawer = { children: [{}], innerHTML: '<button id="original-menu">Original</button>' };
  const context = {
    document: { getElementById: id => id === 'sidebar-drawer' ? drawer : null },
    t: (_key, fallback) => fallback
  };

  vm.runInNewContext(`${getSidebarRendererSource()}\nrenderUnifiedSidebarDrawer();`, context);

  assert.equal(drawer.innerHTML, '<button id="original-menu">Original</button>');
});

test('shared sidebar excludes the advertising navigation item', () => {
  const sidebar = fs.readFileSync(path.join(root, 'Views/Shared/_Sidebar.cshtml'), 'utf8');
  assert.doesNotMatch(coordinator, /nav\.advertise|sidebar-sub-item-cta|>Advertise</);
  assert.doesNotMatch(sidebar, /nav\.advertise|sidebar-sub-item-cta|>Quảng cáo</);
});

test('shared sidebar excludes the notification navigation item', () => {
  const sidebar = fs.readFileSync(path.join(root, 'Views/Shared/_Sidebar.cshtml'), 'utf8');
  assert.doesNotMatch(coordinator, /nav\.notice|sidebar-sub-item-split|>Notice</);
  assert.doesNotMatch(sidebar, /nav\.notice|sidebar-sub-item-split|>Thông báo</);
});
