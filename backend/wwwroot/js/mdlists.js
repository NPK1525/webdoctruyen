const MDLIST_SORTS = [
  ['best', 'mdlists.sort.best', 'Best Match'], ['latest', 'mdlists.sort.latest', 'Latest Upload'],
  ['oldest-upload', 'mdlists.sort.oldestUpload', 'Oldest Upload'], ['title-asc', 'mdlists.sort.titleAsc', 'Title Ascending'],
  ['title-desc', 'mdlists.sort.titleDesc', 'Title Descending'], ['rating-desc', 'mdlists.sort.ratingDesc', 'Highest Rating'],
  ['rating-asc', 'mdlists.sort.ratingAsc', 'Lowest Rating'], ['follows-desc', 'mdlists.sort.followsDesc', 'Most Follows'],
  ['follows-asc', 'mdlists.sort.followsAsc', 'Fewest Follows'], ['recent', 'mdlists.sort.recent', 'Recently Added'],
  ['oldest-added', 'mdlists.sort.oldestAdded', 'Oldest Added'], ['year-asc', 'mdlists.sort.yearAsc', 'Year Ascending'],
  ['year-desc', 'mdlists.sort.yearDesc', 'Year Descending']
];

let mdLists = [];
let mdEditor = null;
let mdSearchTimer = null;
let mdPickerView = 'list';
let mdSort = 'best';
let mdSearchPage = 1;
let mdSearchHasMore = false;
let mdSearchItems = [];
const mdSearchSequence = MDListsCore.createSearchSequence();

function mdText(key, fallback, params = {}) {
  const translated = typeof t === 'function' ? t(key, fallback) : fallback;
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    translated
  );
}

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSession();
  bindMdListShell();
  showMd('mdlists-overview');
  if (!currentUser) {
    renderSignedOutEmpty();
    return;
  }
  await loadMdLists();
});

function showMd(id) {
  ['mdlists-login', 'mdlists-overview', 'mdlists-editor'].forEach(name => {
    const element = document.getElementById(name);
    if (element) element.style.display = name === id ? 'block' : 'none';
  });
}

function bindMdListShell() {
  document.getElementById('mdlists-login-btn')?.addEventListener('click', () => openAuthModal('login'));
  document.getElementById('mdlists-create-btn')?.addEventListener('click', () => currentUser ? openMdEditor() : openAuthModal('login'));
  document.getElementById('mdlists-editor-back')?.addEventListener('click', returnToOverview);
  document.getElementById('mdlists-cancel')?.addEventListener('click', returnToOverview);
  document.getElementById('mdlists-save')?.addEventListener('click', saveMdList);
  document.getElementById('mdlists-add-titles')?.addEventListener('click', openTitlePicker);
  document.getElementById('mdlists-title-close')?.addEventListener('click', closeTitlePicker);
  document.getElementById('mdlists-load-more')?.addEventListener('click', () => searchTitles(false));
  document.getElementById('mdlists-title-search')?.addEventListener('input', () => {
    clearTimeout(mdSearchTimer);
    mdSearchTimer = setTimeout(() => searchTitles(true), 250);
  });
  document.getElementById('mdlists-visibility-button')?.addEventListener('click', () => toggleDropdown('mdlists-visibility-menu'));
  document.querySelectorAll('#mdlists-visibility-menu [data-visibility]').forEach(button => button.addEventListener('click', () => {
    mdEditor.isPublic = button.dataset.visibility === 'true';
    document.getElementById('mdlists-visibility-value').textContent = mdEditor.isPublic
      ? mdText('mdlists.public', 'Public')
      : mdText('mdlists.private', 'Private');
    closeDropdown('mdlists-visibility-menu');
  }));
  document.getElementById('mdlists-sort-button')?.addEventListener('click', () => toggleDropdown('mdlists-sort-menu'));
  document.querySelectorAll('[data-picker-view]').forEach(button => button.addEventListener('click', () => {
    mdPickerView = button.dataset.pickerView;
    document.querySelectorAll('[data-picker-view]').forEach(item => item.classList.toggle('active', item === button));
    renderTitleResults();
  }));
  document.addEventListener('click', event => {
    if (!event.target.closest('.mdlists-visibility,.mdlists-sort')) {
      closeDropdown('mdlists-visibility-menu');
      closeDropdown('mdlists-sort-menu');
    }
    if (!event.target.closest('.mdlists-card-actions')) closeAllCardMenus();
  });
  renderSortMenu();
  window.addEventListener('manganpk:localechanged', rerenderMnListLocale);
  refreshIcons();
}

function rerenderMnListLocale() {
  if (typeof I18N !== 'undefined') I18N.apply();
  renderSortMenu();
  if (!currentUser) renderSignedOutEmpty();
  if (mdEditor) updateEditorLabels();
  if (mdLists.length || document.getElementById('mdlists-grid')?.children.length) renderMdLists();
  if (mdEditor) renderSelected();
  if (!document.getElementById('mdlists-title-modal')?.hidden) renderTitleResults();
  document.querySelectorAll('.mdlists-status[data-i18n-status]').forEach(element => {
    element.textContent = mdText(element.dataset.i18nStatus, element.dataset.i18nFallback || '');
  });
  refreshIcons();
}

function renderSignedOutEmpty() {
  const empty = document.getElementById('mdlists-empty');
  empty.querySelector('strong').textContent = mdText('mdlists.signedOutTitle', 'Sign in to manage MN Lists');
  empty.querySelector('span').textContent = mdText('mdlists.signedOutBody', 'Create, edit, and organize your manga collections after signing in.');
  empty.style.display = 'flex';
}

async function returnToOverview() {
  showMd('mdlists-overview');
  if (currentUser) await loadMdLists();
}

async function loadMdLists() {
  setTranslatedStatus('mdlists-overview-status', 'mdlists.loadingLists', 'Loading your MN Lists…', 'info');
  try {
    const response = await apiFetch('/api/mangalist');
    if (!response.ok) throw new Error(await apiMessage(response, mdText('mdlists.errorLoad', 'Could not load your MN Lists.')));
    mdLists = await response.json();
    clearStatus('mdlists-overview-status');
    renderMdLists();
  } catch (error) {
    setStatus('mdlists-overview-status', error.message, 'error');
  }
}

function renderMdLists() {
  const grid = document.getElementById('mdlists-grid');
  const empty = document.getElementById('mdlists-empty');
  grid.replaceChildren();
  empty.style.display = mdLists.length ? 'none' : 'flex';
  mdLists.forEach(list => grid.appendChild(createListCard(list)));
  refreshIcons();
}

function createListCard(list) {
  const card = document.createElement('article');
  card.className = 'mdlists-card';
  card.tabIndex = 0;
  card.addEventListener('click', event => {
    if (!event.target.closest('.mdlists-card-actions')) openMdEditor(list.id);
  });
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter') openMdEditor(list.id);
  });

  const header = document.createElement('div');
  header.className = 'mdlists-card-head';
  const title = document.createElement('h3');
  title.textContent = list.name;
  header.append(title, createCardActions(list));

  const owner = document.createElement('div');
  owner.className = 'mdlists-owner';
  owner.innerHTML = '<i data-lucide="user-round"></i>';
  const ownerName = document.createElement('span');
  ownerName.textContent = list.ownerName || currentUser?.userName || currentUser?.email || mdText('mdlists.you', 'You');
  owner.appendChild(ownerName);

  const badge = document.createElement('span');
  badge.className = `mdlists-badge ${list.isPublic ? 'public' : 'private'}`;
  badge.textContent = list.isPublic ? mdText('mdlists.public', 'Public') : mdText('mdlists.private', 'Private');

  const covers = document.createElement('div');
  covers.className = 'mdlists-covers';
  (list.previewItems || []).forEach(item => {
    const image = document.createElement('img');
    image.src = MDListsCore.safeImageUrl(item.coverUrl) || '/img/dragon_ball.png';
    image.alt = item.title || '';
    image.loading = 'lazy';
    covers.appendChild(image);
  });

  const count = document.createElement('small');
  count.textContent = list.itemCount === 1
    ? mdText('mdlists.countOne', '1 title')
    : mdText('mdlists.countMany', '{count} titles', { count: list.itemCount || 0 });
  card.append(header, owner, badge, covers, count);
  return card;
}

function createCardActions(list) {
  const wrapper = document.createElement('div');
  wrapper.className = 'mdlists-card-actions';
  const toggle = document.createElement('button');
  toggle.className = 'mdlists-card-menu';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', mdText('mdlists.listActions', 'List actions'));
  toggle.innerHTML = '<i data-lucide="more-vertical"></i>';
  const menu = document.createElement('div');
  menu.className = 'mdlists-card-dropdown';
  menu.hidden = true;
  const edit = document.createElement('button');
  edit.type = 'button'; edit.textContent = mdText('common.edit', 'Edit');
  edit.addEventListener('click', event => { event.stopPropagation(); openMdEditor(list.id); });
  const remove = document.createElement('button');
  remove.type = 'button'; remove.className = 'danger'; remove.textContent = mdText('mdlists.delete', 'Delete');
  remove.addEventListener('click', event => { event.stopPropagation(); deleteMdList(list); });
  toggle.addEventListener('click', event => {
    event.stopPropagation();
    const willOpen = menu.hidden;
    closeAllCardMenus();
    menu.hidden = !willOpen;
  });
  menu.append(edit, remove);
  wrapper.append(toggle, menu);
  return wrapper;
}

function closeAllCardMenus() {
  document.querySelectorAll('.mdlists-card-dropdown').forEach(menu => { menu.hidden = true; });
}

async function deleteMdList(list) {
  if (!window.confirm(mdText('mdlists.deleteConfirm', 'Delete “{name}”? This cannot be undone.', { name: list.name }))) return;
  setTranslatedStatus('mdlists-overview-status', 'mdlists.deleting', 'Deleting MN List…', 'info');
  try {
    const response = await apiFetch(`/api/mangalist/${list.id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(await apiMessage(response, mdText('mdlists.errorDelete', 'Could not delete this MN List.')));
    await loadMdLists();
  } catch (error) {
    setStatus('mdlists-overview-status', error.message, 'error');
  }
}

async function openMdEditor(id = null) {
  clearStatus('mdlists-status');
  if (id) {
    setTranslatedStatus('mdlists-overview-status', 'mdlists.opening', 'Opening MN List…', 'info');
    try {
      const response = await apiFetch(`/api/mangalist/${id}`);
      if (!response.ok) throw new Error(await apiMessage(response, mdText('mdlists.errorOpen', 'Could not open this MN List.')));
      const list = await response.json();
      mdEditor = { ...list, selected: list.items || [] };
    } catch (error) {
      setStatus('mdlists-overview-status', error.message, 'error');
      return;
    }
  } else {
    mdEditor = { id: null, name: '', description: '', isPublic: false, selected: [] };
  }
  updateEditorLabels();
  document.getElementById('mdlists-name').value = mdEditor.name || '';
  document.getElementById('mdlists-description').value = mdEditor.description || '';
  renderSelected();
  showMd('mdlists-editor');
  refreshIcons();
}

function updateEditorLabels() {
  if (!mdEditor) return;
  document.getElementById('mdlists-editor-heading').textContent = mdEditor.id
    ? mdText('mdlists.edit', 'Edit MN List')
    : mdText('mdlists.new', 'New MN List');
  document.getElementById('mdlists-save').textContent = mdEditor.id
    ? mdText('mdlists.save', 'Save')
    : mdText('mdlists.create', 'Create');
  document.getElementById('mdlists-visibility-value').textContent = mdEditor.isPublic
    ? mdText('mdlists.public', 'Public')
    : mdText('mdlists.private', 'Private');
}

async function saveMdList() {
  mdEditor.name = document.getElementById('mdlists-name').value;
  mdEditor.description = document.getElementById('mdlists-description').value;
  const payload = MDListsCore.buildSavePayload(mdEditor);
  if (!payload.name) {
    setTranslatedStatus('mdlists-status', 'mdlists.nameRequired', 'Enter a name for your MN List.', 'error');
    document.getElementById('mdlists-name').focus();
    return;
  }
  const button = document.getElementById('mdlists-save');
  button.disabled = true;
  if (mdEditor.id) setTranslatedStatus('mdlists-status', 'mdlists.saving', 'Saving changes…', 'info');
  else setTranslatedStatus('mdlists-status', 'mdlists.creating', 'Creating MN List…', 'info');
  try {
    const response = await apiFetch(mdEditor.id ? `/api/mangalist/${mdEditor.id}` : '/api/mangalist', {
      method: mdEditor.id ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await apiMessage(response, mdText('mdlists.errorSave', 'Could not save this MN List.')));
    showMd('mdlists-overview');
    await loadMdLists();
  } catch (error) {
    setStatus('mdlists-status', error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

function renderSelected() {
  const container = document.getElementById('mdlists-selected');
  container.replaceChildren();
  (mdEditor.selected || []).forEach(item => {
    const row = document.createElement('div');
    row.className = 'mdlists-selected-item';
    const image = document.createElement('img');
    image.src = MDListsCore.safeImageUrl(item.coverUrl) || '/img/dragon_ball.png';
    image.alt = '';
    const title = document.createElement('span');
    title.textContent = item.title || '';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.setAttribute('aria-label', mdText('mdlists.removeTitle', 'Remove {title}', { title: item.title || '' }));
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      const id = String(item.mangaId || item.id);
      mdEditor.selected = mdEditor.selected.filter(selected => String(selected.mangaId || selected.id) !== id);
      renderSelected();
      renderTitleResults();
    });
    row.append(image, title, remove);
    container.appendChild(row);
  });
}

function openTitlePicker() {
  document.getElementById('mdlists-title-modal').hidden = false;
  searchTitles(true);
}

function closeTitlePicker() {
  document.getElementById('mdlists-title-modal').hidden = true;
}

async function searchTitles(reset = true) {
  if (reset) {
    mdSearchPage = 1;
    mdSearchItems = [];
    document.getElementById('mdlists-title-results').replaceChildren();
  }
  const requestId = mdSearchSequence.next();
  const query = document.getElementById('mdlists-title-search').value;
  const loadMore = document.getElementById('mdlists-load-more');
  loadMore.disabled = true;
  setTranslatedStatus('mdlists-picker-status', 'mdlists.searching', 'Searching titles…', 'info');
  try {
    const response = await apiFetch(MDListsCore.buildSearchUrl({ query, sort: mdSort, page: mdSearchPage, pageSize: 20 }));
    if (!response.ok) throw new Error(await apiMessage(response, mdText('mdlists.errorSearch', 'Could not search titles.')));
    const data = await response.json();
    if (!mdSearchSequence.isCurrent(requestId)) return;
    mdSearchItems = reset ? (data.items || []) : mdSearchItems.concat(data.items || []);
    mdSearchHasMore = mdSearchPage < (data.totalPages || 0);
    if (mdSearchHasMore) mdSearchPage += 1;
    renderTitleResults();
    clearStatus('mdlists-picker-status');
    loadMore.hidden = !mdSearchHasMore;
  } catch (error) {
    if (mdSearchSequence.isCurrent(requestId)) setStatus('mdlists-picker-status', error.message, 'error');
  } finally {
    loadMore.disabled = false;
  }
}

function renderSortMenu() {
  const menu = document.getElementById('mdlists-sort-menu');
  menu.replaceChildren();
  MDLIST_SORTS.forEach(([value, key, fallback]) => {
    const label = mdText(key, fallback);
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.sort = value; button.textContent = label;
    button.addEventListener('click', () => {
      mdSort = value;
      document.getElementById('mdlists-sort-value').textContent = label;
      closeDropdown('mdlists-sort-menu');
      searchTitles(true);
    });
    menu.appendChild(button);
  });
  const current = MDLIST_SORTS.find(([value]) => value === mdSort) || MDLIST_SORTS[0];
  document.getElementById('mdlists-sort-value').textContent = mdText(current[1], current[2]);
}

function renderTitleResults() {
  const container = document.getElementById('mdlists-title-results');
  container.className = `mdlists-title-results ${mdPickerView}`;
  container.replaceChildren();
  if (!mdSearchItems.length) {
    const empty = document.createElement('p');
    empty.className = 'mdlists-picker-empty';
    empty.textContent = mdText('mdlists.noMatches', 'No matching titles yet. Try another name or spelling.');
    container.appendChild(empty);
    return;
  }
  mdSearchItems.forEach(item => {
    const selected = mdEditor.selected.some(entry => Number(entry.mangaId || entry.id) === Number(item.id));
    const result = document.createElement('article');
    result.className = `mdlists-result ${mdPickerView}${selected ? ' selected' : ''}`;
    const image = document.createElement('img');
    image.src = MDListsCore.safeImageUrl(item.coverUrl) || '/img/dragon_ball.png';
    image.alt = '';
    const copy = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = item.title || '';
    const alternative = document.createElement('small'); alternative.textContent = item.alternativeTitle || '';
    copy.append(title, alternative);
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn btn-primary'; button.disabled = selected;
    button.textContent = selected ? mdText('mdlists.added', 'Added') : mdText('mdlists.add', 'Add');
    button.addEventListener('click', () => {
      if (mdEditor.selected.some(entry => Number(entry.mangaId || entry.id) === Number(item.id))) return;
      mdEditor.selected.push({ mangaId: item.id, title: item.title, coverUrl: item.coverUrl });
      renderSelected();
      renderTitleResults();
    });
    result.append(image, copy, button);
    container.appendChild(result);
  });
}

async function apiMessage(response, fallback) {
  try { const body = await response.json(); return body.message || fallback; } catch { return fallback; }
}

function setStatus(id, message, kind) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message;
  element.className = `mdlists-status ${kind}`;
  delete element.dataset.i18nStatus;
  delete element.dataset.i18nFallback;
  element.hidden = false;
}

function setTranslatedStatus(id, key, fallback, kind) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = mdText(key, fallback);
  element.className = `mdlists-status ${kind}`;
  element.dataset.i18nStatus = key;
  element.dataset.i18nFallback = fallback;
  element.hidden = false;
}

function clearStatus(id) {
  const element = document.getElementById(id);
  if (element) element.hidden = true;
}

function toggleDropdown(id) { const element = document.getElementById(id); if (element) element.hidden = !element.hidden; }
function closeDropdown(id) { const element = document.getElementById(id); if (element) element.hidden = true; }
function refreshIcons() { if (typeof lucide !== 'undefined') lucide.createIcons(); }
