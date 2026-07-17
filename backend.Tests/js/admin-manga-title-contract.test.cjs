const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const view = fs.readFileSync(path.join(root, 'backend', 'Views', 'AdminView', 'Index.cshtml'), 'utf8');
const manga = fs.readFileSync(path.join(root, 'backend', 'wwwroot', 'js', 'admin-manga.js'), 'utf8');
const drafts = fs.readFileSync(path.join(root, 'backend', 'wwwroot', 'js', 'admin-title-drafts.js'), 'utf8');

test('admin manga and title-draft modules load before coordinator', () => {
  assert.ok(view.indexOf('/js/admin-manga.js') < view.indexOf('/js/admin.js'));
  assert.ok(view.indexOf('/js/admin-title-drafts.js') < view.indexOf('/js/admin.js'));
});

test('manga and title-draft globals stay available by name', () => {
  for (const name of ['renderMangasTable', 'loadMangaForEditing', 'resetMangaForm', 'deleteManga'])
    assert.match(manga, new RegExp(`function ${name}\\(`));
  for (const name of ['loadTitleDraftForEditing', 'saveTitleDraft', 'approveTitleDraft', 'rejectTitleDraft'])
    assert.match(drafts, new RegExp(`function ${name}\\(`));
});
