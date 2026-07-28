const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const modulePath = path.join(root, 'backend', 'wwwroot', 'js', 'admin-author-combobox.js');

test('author combobox exposes the shared factory and public methods', () => {
  assert.equal(fs.existsSync(modulePath), true, 'combobox module must exist');
  const script = fs.readFileSync(modulePath, 'utf8');
  assert.match(script, /window\.AdminAuthorCombobox\s*=/);
  assert.match(script, /function create\(options\)/);
  for (const method of ['getSelectedId', 'getSelectedName', 'reset', 'refresh']) {
    assert.match(script, new RegExp(method));
  }
});

test('author combobox filters case-insensitively and limits results', () => {
  assert.equal(fs.existsSync(modulePath), true, 'combobox module must exist');
  const script = fs.readFileSync(modulePath, 'utf8');
  assert.match(script, /toLocaleLowerCase\(\)/);
  assert.match(script, /\.slice\(0,\s*8\)/);
});

test('author combobox supports keyboard and outside-click behavior', () => {
  assert.equal(fs.existsSync(modulePath), true, 'combobox module must exist');
  const script = fs.readFileSync(modulePath, 'utf8');
  for (const key of ['ArrowDown', 'ArrowUp', 'Enter', 'Escape']) {
    assert.match(script, new RegExp(key));
  }
  assert.match(script, /document\.addEventListener\('click'/);
});

test('editing visible text clears the stored author id', () => {
  assert.equal(fs.existsSync(modulePath), true, 'combobox module must exist');
  const script = fs.readFileSync(modulePath, 'utf8');
  assert.match(script, /valueInput\.value\s*=\s*''/);
});

const view = fs.readFileSync(
  path.join(root, 'backend', 'Views', 'AdminView', 'Index.cshtml'),
  'utf8'
);

test('both admin author fields use accessible combobox markup', () => {
  for (const prefix of ['draft-author', 'manga-form-author']) {
    assert.match(view, new RegExp(`id="${prefix}-search"`));
    assert.match(view, new RegExp(`id="${prefix}-id"`));
    assert.match(view, new RegExp(`id="${prefix}-results"`));
  }
  assert.doesNotMatch(view, /<select id="draft-author-select"/);
  assert.doesNotMatch(view, /<select id="manga-form-author-select"/);
  assert.match(view, /role="combobox"/);
  assert.match(view, /aria-autocomplete="list"/);
  assert.match(view, /role="listbox"/);
});

const adminScript = fs.readFileSync(
  path.join(root, 'backend', 'wwwroot', 'js', 'admin.js'),
  'utf8'
);
const draftScript = fs.readFileSync(
  path.join(root, 'backend', 'wwwroot', 'js', 'admin-title-drafts.js'),
  'utf8'
);
const mangaScript = fs.readFileSync(
  path.join(root, 'backend', 'wwwroot', 'js', 'admin-manga.js'),
  'utf8'
);

test('admin initializes one shared author combobox for each author flow', () => {
  assert.match(adminScript, /AdminAuthorCombobox\.create\(\{[\s\S]*inputId:\s*'draft-author-search'/);
  assert.match(adminScript, /AdminAuthorCombobox\.create\(\{[\s\S]*inputId:\s*'manga-form-author-search'/);
  assert.match(adminScript, /getItems:\s*\(\)\s*=>\s*authorsList/);
});

test('both add-author handlers read the selected combobox value and reset it', () => {
  assert.match(draftScript, /titleAuthorCombobox\?\.getSelectedId\(\)/);
  assert.match(draftScript, /titleAuthorCombobox\?\.getSelectedName\(\)/);
  assert.match(draftScript, /titleAuthorCombobox\?\.reset\(\)/);
  assert.match(adminScript, /mangaAuthorCombobox\?\.getSelectedId\(\)/);
  assert.match(adminScript, /mangaAuthorCombobox\?\.getSelectedName\(\)/);
  assert.match(adminScript, /mangaAuthorCombobox\?\.reset\(\)/);
});

test('form resets also clear combobox selection state', () => {
  assert.match(draftScript, /function resetTitleDraftForm\(\)[\s\S]*titleAuthorCombobox\?\.reset\(\)/);
  assert.match(mangaScript, /function resetMangaForm\(\)[\s\S]*mangaAuthorCombobox\?\.reset\(\)/);
});

test('legacy author select access is removed from admin flows', () => {
  const combined = `${adminScript}\n${draftScript}`;
  assert.doesNotMatch(combined, /draft-author-select/);
  assert.doesNotMatch(combined, /manga-form-author-select/);
  assert.doesNotMatch(combined, /populateTitleAuthorDropdown/);
});
