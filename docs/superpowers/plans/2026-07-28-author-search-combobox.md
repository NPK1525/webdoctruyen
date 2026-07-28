# Searchable Author Combobox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the author selects in title submission and manga detail editing with one accessible, searchable combobox implementation.

**Architecture:** Add a focused browser module that owns filtering, selection, keyboard navigation, reset, and refresh behavior. Admin page markup supplies two independent combobox roots; existing manga and title-draft modules consume the selected ID/name through instances initialized by `admin.js`.

**Tech Stack:** Razor, vanilla JavaScript, JSON i18n, Node test runner, existing Admin CSS variables.

## Global Constraints

- Apply the combobox to both title submission and manga create/edit.
- Preserve the title-submission field for proposing a new author.
- Preserve current role selectors, duplicate checks, and Add buttons.
- Do not change APIs, database schema, or author DTOs.
- Render at most 8 matching authors.
- Support click, ArrowUp, ArrowDown, Enter, Escape, outside-click, dark/light mode, mobile, Vietnamese, and English.
- Store the selected author ID separately from visible text and clear it when text changes.

---

### Task 1: Build the reusable author combobox module

**Files:**
- Create: `backend/wwwroot/js/admin-author-combobox.js`
- Create: `backend.Tests/js/admin-author-combobox.test.cjs`

**Interfaces:**
- Consumes: DOM IDs, `getItems(): Array<{id:number,name:string}>`, and `emptyText(): string`.
- Produces: `window.AdminAuthorCombobox.create(options)` returning `getSelectedId()`, `getSelectedName()`, `reset()`, and `refresh()`.

- [ ] **Step 1: Write the failing module-contract tests**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const script = fs.readFileSync(
  path.join(root, 'backend', 'wwwroot', 'js', 'admin-author-combobox.js'),
  'utf8'
);

test('author combobox exposes the shared factory and public methods', () => {
  assert.match(script, /window\.AdminAuthorCombobox\s*=/);
  assert.match(script, /function create\(options\)/);
  for (const method of ['getSelectedId', 'getSelectedName', 'reset', 'refresh']) {
    assert.match(script, new RegExp(`${method}`));
  }
});

test('author combobox filters case-insensitively and limits results', () => {
  assert.match(script, /toLocaleLowerCase\(\)/);
  assert.match(script, /\.slice\(0,\s*8\)/);
});

test('author combobox supports keyboard and outside-click behavior', () => {
  for (const key of ['ArrowDown', 'ArrowUp', 'Enter', 'Escape']) {
    assert.match(script, new RegExp(key));
  }
  assert.match(script, /document\.addEventListener\('click'/);
});

test('editing visible text clears the stored author id', () => {
  assert.match(script, /valueInput\.value\s*=\s*''/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test backend.Tests/js/admin-author-combobox.test.cjs
```

Expected: FAIL because `admin-author-combobox.js` does not exist.

- [ ] **Step 3: Implement the focused combobox module**

Create the module with this boundary:

```js
(() => {
  function create(options) {
    const input = document.getElementById(options.inputId);
    const valueInput = document.getElementById(options.valueId);
    const list = document.getElementById(options.listId);
    let matches = [];
    let activeIndex = -1;

    function getSelectedId() {
      const id = Number(valueInput?.value || 0);
      return id > 0 && options.getItems().some(item => Number(item.id) === id) ? id : null;
    }

    function getSelectedName() {
      const id = getSelectedId();
      return id ? options.getItems().find(item => Number(item.id) === id)?.name || '' : '';
    }

    function getMatches() {
      const query = input.value.trim().toLocaleLowerCase();
      return options.getItems()
        .filter(item => !query || item.name.toLocaleLowerCase().includes(query))
        .slice(0, 8);
    }
```

Implement `render()`, `open()`, `close()`, `select(index)`, `reset()`, and `refresh()`. Escape names before inserting them into result markup. On input:

```js
valueInput.value = '';
activeIndex = -1;
render();
```

Handle keyboard:

```js
input.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeIndex = Math.min(activeIndex + 1, matches.length - 1);
    render();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeIndex = Math.max(activeIndex - 1, 0);
    render();
  } else if (event.key === 'Enter' && activeIndex >= 0) {
    event.preventDefault();
    select(activeIndex);
  } else if (event.key === 'Escape') {
    close();
  }
});
```

Expose:

```js
window.AdminAuthorCombobox = { create };
```

- [ ] **Step 4: Run the test and verify GREEN**

Run:

```powershell
node --test backend.Tests/js/admin-author-combobox.test.cjs
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```powershell
git add backend/wwwroot/js/admin-author-combobox.js backend.Tests/js/admin-author-combobox.test.cjs
git commit -m "feat: add searchable author combobox"
```

---

### Task 2: Replace both author selects with accessible combobox markup

**Files:**
- Modify: `backend.Tests/js/admin-author-combobox.test.cjs`
- Modify: `backend/Views/AdminView/Index.cshtml`

**Interfaces:**
- Consumes: module option IDs.
- Produces: title IDs `draft-author-search`, `draft-author-id`, `draft-author-results`; manga IDs `manga-form-author-search`, `manga-form-author-id`, `manga-form-author-results`.

- [ ] **Step 1: Add failing markup tests**

Append:

```js
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
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test backend.Tests/js/admin-author-combobox.test.cjs
```

Expected: the markup test fails because both fields are still `<select>` elements.

- [ ] **Step 3: Replace the title-submission author select**

Use:

```html
<div class="admin-author-combobox">
  <input id="draft-author-search"
         class="form-control"
         type="text"
         role="combobox"
         aria-autocomplete="list"
         aria-expanded="false"
         aria-controls="draft-author-results"
         autocomplete="off"
         data-i18n="admin.searchAuthorPlaceholder"
         data-i18n-attr="placeholder" />
  <input id="draft-author-id" type="hidden" />
  <div id="draft-author-results"
       class="admin-author-combobox-results"
       role="listbox"
       hidden></div>
</div>
```

- [ ] **Step 4: Replace the manga create/edit author select**

Use the same structure with IDs:

```html
<div class="admin-author-combobox" style="flex:2;">
  <input id="manga-form-author-search"
         class="form-control"
         type="text"
         role="combobox"
         aria-autocomplete="list"
         aria-expanded="false"
         aria-controls="manga-form-author-results"
         autocomplete="off"
         data-i18n="admin.searchAuthorPlaceholder"
         data-i18n-attr="placeholder" />
  <input id="manga-form-author-id" type="hidden" />
  <div id="manga-form-author-results"
       class="admin-author-combobox-results"
       role="listbox"
       hidden></div>
</div>
```

- [ ] **Step 5: Add shared styles**

Add:

```css
.admin-author-combobox { position:relative; min-width:0; }
.admin-author-combobox-results {
  position:absolute; z-index:30; top:calc(100% + 6px); left:0; right:0;
  max-height:280px; overflow-y:auto; padding:6px;
  border:1px solid var(--border-subtle); border-radius:10px;
  background:var(--bg-card); box-shadow:0 14px 30px rgba(0,0,0,.28);
}
.admin-author-combobox-option {
  width:100%; border:0; border-radius:7px; padding:10px 12px;
  background:transparent; color:var(--text-main); text-align:left; cursor:pointer;
}
.admin-author-combobox-option:hover,
.admin-author-combobox-option.active {
  background:var(--accent-primary); color:#fff;
}
.admin-author-combobox-empty {
  padding:12px; color:var(--text-muted); text-align:center;
}
```

- [ ] **Step 6: Load the module before Admin scripts**

Add before `admin-title-drafts.js` and `admin.js`:

```html
<script src="/js/admin-author-combobox.js?v=1.0"></script>
```

- [ ] **Step 7: Run the test and verify GREEN**

Run:

```powershell
node --test backend.Tests/js/admin-author-combobox.test.cjs
```

Expected: all markup and module tests pass.

- [ ] **Step 8: Commit**

```powershell
git add backend.Tests/js/admin-author-combobox.test.cjs backend/Views/AdminView/Index.cshtml
git commit -m "feat: add author search fields to manga forms"
```

---

### Task 3: Integrate combobox state with both author-add flows

**Files:**
- Modify: `backend.Tests/js/admin-author-combobox.test.cjs`
- Modify: `backend/wwwroot/js/admin.js`
- Modify: `backend/wwwroot/js/admin-title-drafts.js`
- Modify: `backend/wwwroot/js/admin-manga.js`

**Interfaces:**
- Consumes: `window.AdminAuthorCombobox.create(options)`.
- Produces: globals `titleAuthorCombobox` and `mangaAuthorCombobox`; both Add flows use `getSelectedId()` and `getSelectedName()`.

- [ ] **Step 1: Add failing integration tests**

Append:

```js
const admin = fs.readFileSync(path.join(root, 'backend', 'wwwroot', 'js', 'admin.js'), 'utf8');
const drafts = fs.readFileSync(path.join(root, 'backend', 'wwwroot', 'js', 'admin-title-drafts.js'), 'utf8');
const manga = fs.readFileSync(path.join(root, 'backend', 'wwwroot', 'js', 'admin-manga.js'), 'utf8');

test('admin initializes and refreshes both author comboboxes', () => {
  assert.match(admin, /titleAuthorCombobox\s*=\s*window\.AdminAuthorCombobox\.create/);
  assert.match(admin, /mangaAuthorCombobox\s*=\s*window\.AdminAuthorCombobox\.create/);
  assert.match(admin, /titleAuthorCombobox\?\.refresh\(\)/);
  assert.match(admin, /mangaAuthorCombobox\?\.refresh\(\)/);
});

test('both add-author flows consume combobox id and name', () => {
  assert.match(drafts, /titleAuthorCombobox\?\.getSelectedId\(\)/);
  assert.match(drafts, /titleAuthorCombobox\?\.getSelectedName\(\)/);
  assert.match(admin, /mangaAuthorCombobox\?\.getSelectedId\(\)/);
  assert.match(admin, /mangaAuthorCombobox\?\.getSelectedName\(\)/);
  assert.doesNotMatch(drafts, /draft-author-select/);
  assert.doesNotMatch(admin, /manga-form-author-select/);
});

test('form resets clear their author comboboxes', () => {
  assert.match(drafts, /titleAuthorCombobox\?\.reset\(\)/);
  assert.match(manga, /mangaAuthorCombobox\?\.reset\(\)/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test backend.Tests/js/admin-author-combobox.test.cjs
```

Expected: integration tests fail because current flows read selected `<option>` elements.

- [ ] **Step 3: Initialize both comboboxes**

Add global state in `admin.js`:

```js
let titleAuthorCombobox = null;
let mangaAuthorCombobox = null;
```

Add:

```js
function initAuthorComboboxes() {
  titleAuthorCombobox = window.AdminAuthorCombobox.create({
    inputId: 'draft-author-search',
    valueId: 'draft-author-id',
    listId: 'draft-author-results',
    getItems: () => authorsList,
    emptyText: () => t('admin.noAuthorMatches', 'Không tìm thấy tác giả.')
  });
  mangaAuthorCombobox = window.AdminAuthorCombobox.create({
    inputId: 'manga-form-author-search',
    valueId: 'manga-form-author-id',
    listId: 'manga-form-author-results',
    getItems: () => authorsList,
    emptyText: () => t('admin.noAuthorMatches', 'Không tìm thấy tác giả.')
  });
}
```

Call `initAuthorComboboxes()` once after `initAdminTabs()`. Replace `populateAuthorsDropdowns()` with:

```js
function populateAuthorsDropdowns() {
  titleAuthorCombobox?.refresh();
  mangaAuthorCombobox?.refresh();
}
```

- [ ] **Step 4: Update title-submission selection**

In `addTitleAuthor()` use:

```js
const authorId = titleAuthorCombobox?.getSelectedId() || null;
const selectedName = titleAuthorCombobox?.getSelectedName() || '';
const newName = newNameInput?.value.trim() || '';
const name = authorId ? selectedName : newName;
```

After adding:

```js
titleAuthorCombobox?.reset();
```

Also call `titleAuthorCombobox?.reset()` in `resetTitleDraftForm()`. Remove `populateTitleAuthorDropdown()` and all references to `draft-author-select`.

- [ ] **Step 5: Update manga create/edit selection and reset**

In the `btn-add-form-author` handler:

```js
const authorId = mangaAuthorCombobox?.getSelectedId();
if (!authorId) {
  showToast(t('admin.pleaseSelectAuthor', 'Vui lòng chọn tác giả!'), 'warning');
  return;
}
const name = mangaAuthorCombobox.getSelectedName();
selectedAdminMangaAuthors.push({ authorId, role: roleSelect.value, name });
mangaAuthorCombobox.reset();
renderMangaFormAuthors();
```

In `resetMangaForm()` add:

```js
mangaAuthorCombobox?.reset();
```

- [ ] **Step 6: Run the test and verify GREEN**

Run:

```powershell
node --test backend.Tests/js/admin-author-combobox.test.cjs
```

Expected: all module, markup, integration, and reset tests pass.

- [ ] **Step 7: Commit**

```powershell
git add backend.Tests/js/admin-author-combobox.test.cjs backend/wwwroot/js/admin.js backend/wwwroot/js/admin-title-drafts.js backend/wwwroot/js/admin-manga.js
git commit -m "feat: connect author search to manga forms"
```

---

### Task 4: Localize and verify the author combobox

**Files:**
- Modify: `backend.Tests/js/admin-localization.test.cjs`
- Modify: `backend/wwwroot/locales/vi.json`
- Modify: `backend/wwwroot/locales/en.json`

**Interfaces:**
- Consumes: i18n function `t()` and `data-i18n` attribute processor.
- Produces: matching `admin.searchAuthorPlaceholder` and `admin.noAuthorMatches` entries.

- [ ] **Step 1: Add failing localization tests**

```js
test('author combobox copy exists in both admin locales', () => {
  for (const key of ['admin.searchAuthorPlaceholder', 'admin.noAuthorMatches']) {
    assert.equal(typeof vi[key], 'string', `missing Vietnamese ${key}`);
    assert.equal(typeof en[key], 'string', `missing English ${key}`);
  }
});
```

- [ ] **Step 2: Run the localization test and verify RED**

Run:

```powershell
node --test backend.Tests/js/admin-localization.test.cjs
```

Expected: FAIL because both new keys are missing.

- [ ] **Step 3: Add matching locale entries**

Vietnamese:

```json
"admin.searchAuthorPlaceholder": "Nhập tên để tìm tác giả...",
"admin.noAuthorMatches": "Không tìm thấy tác giả."
```

English:

```json
"admin.searchAuthorPlaceholder": "Type to search authors...",
"admin.noAuthorMatches": "No authors found."
```

- [ ] **Step 4: Run focused tests**

Run:

```powershell
node --test backend.Tests/js/admin-author-combobox.test.cjs backend.Tests/js/admin-localization.test.cjs
```

Expected: all tests pass.

- [ ] **Step 5: Run full regression verification**

Run:

```powershell
node --test --test-reporter=dot backend.Tests/js
dotnet test backend.Tests\MangaNPK.Tests.csproj --configuration Release --no-restore --verbosity quiet
dotnet build backend\MangaNPK.csproj --configuration Release --no-restore
git diff --check
```

Expected: JavaScript tests exit 0, all backend tests pass, Release build succeeds with 0 errors, and `git diff --check` has no output.

- [ ] **Step 6: Commit**

```powershell
git add backend.Tests/js/admin-localization.test.cjs backend/wwwroot/locales/vi.json backend/wwwroot/locales/en.json
git commit -m "feat: localize author search combobox"
```
