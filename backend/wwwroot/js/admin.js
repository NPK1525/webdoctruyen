// Admin states
let activeTab = 'manga-list';
let editingMangaId = null;
let editingChapterId = null;
let editingChapterSource = 'Local';
let selectedAdminMangaAuthors = [];
let selectedTitleAuthors = [];
let adminMangaPage = 1;
let adminMangaTotalPages = 0;
let adminMangaTotalItems = 0;
let adminMangaSearchTimer = null;
let chapterMangaSearchTimer = null;
let chapterListSearchTimer = null;
let chapterListPage = 1;
let chapterListPageSize = 20;

// Data lists
let authorsList = [];
let genresList = [];
let themesList = [];
let mangasList = [];
let titleDraftsList = [];
let mangaDexPreview = null;
let editingTitleDraftId = null;
let currentTitleDraft = null;

// Upload state
let uploadedChapterPages = [];
let uploading = false;

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSession();
  if (!currentUser || currentUser.role !== 'Admin') {
    document.getElementById('admin-access-denied').style.display = 'block';
    document.getElementById('admin-panel-wrapper').style.display = 'none';
    return;
  }
  document.getElementById('admin-access-denied').style.display = 'none';
  document.getElementById('admin-panel-wrapper').style.display = 'block';
  initAdminTabs();
  initAdminMangaFilters();
  initSingleChoiceChips('manga-form-demographic', 'manga-demographic-chips');
  initSingleChoiceChips('manga-form-format', 'manga-format-chips');
  loadAdminData();
  initAdminForms();
  initUploadHandlers();
  initMangaDexImport();
});

async function loadAdminData() {
  await loadAuthors();
  await loadGenres();
  await loadThemes();
  await loadMangas();
  await loadTitleDrafts();
}

async function loadAuthors() {
  try {
    const res = await fetch(`${API_BASE}/author`);
    if (res.ok) { authorsList = await res.json(); populateAuthorsDropdowns(); populateTitleAuthorDropdown(); }
  } catch (e) { console.error(e); }
}

async function loadGenres() {
  try {
    const res = await fetch(`${API_BASE}/genre`);
    if (res.ok) { genresList = await res.json(); renderGenresCheckboxes(); }
  } catch (e) { console.error(e); }
}

async function loadThemes() {
  try {
    const res = await fetch(`${API_BASE}/theme`);
    if (res.ok) { themesList = await res.json(); renderMangaThemesCheckboxes(); renderDraftThemesCheckboxes(); }
  } catch (e) { console.error(e); }
}

async function loadTitleDrafts() {
  try {
    const res = await apiFetch(`${API_BASE}/admin/title-drafts`);
    if (res.ok) {
      titleDraftsList = await res.json();
      renderTitleDraftsTable();
    }
  } catch (e) { console.error(e); }
}

async function loadMangas() {
  try {
    const params = new URLSearchParams({
      page: String(adminMangaPage),
      pageSize: document.getElementById('admin-manga-page-size')?.value || '20',
      search: document.getElementById('admin-manga-search')?.value.trim() || '',
      type: document.getElementById('admin-manga-type')?.value || '',
      status: document.getElementById('admin-manga-status')?.value || '',
      source: document.getElementById('admin-manga-source')?.value || '',
      chapterState: document.getElementById('admin-manga-chapter-state')?.value || '',
      sort: document.getElementById('admin-manga-sort')?.value || 'newest'
    });
    [...params.keys()].forEach(key => { if (!params.get(key)) params.delete(key); });
    const res = await fetch(`${API_BASE}/manga?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      mangasList = data.items || [];
      adminMangaTotalItems = data.totalItems ?? data.totalCount ?? 0;
      adminMangaTotalPages = data.totalPages ?? Math.ceil(adminMangaTotalItems / Number(params.get('pageSize') || 20));
      if (adminMangaPage > adminMangaTotalPages && adminMangaTotalPages > 0) { adminMangaPage = adminMangaTotalPages; return loadMangas(); }
      renderMangasTable();
      renderAdminMangaPagination();
      const count = document.getElementById('admin-manga-count-label');
      if (count) count.textContent = `${adminMangaTotalItems} truyện · Trang ${adminMangaPage}/${Math.max(adminMangaTotalPages, 1)}`;
      populateMangasDropdowns();
    } else {
      mangasList = [];
      renderMangasTable();
      showToast('Không thể tải danh sách truyện.', false);
    }
  } catch (e) { console.error(e); }
}

function renderAdminMangaPagination() {
  const container = document.getElementById('admin-manga-pagination');
  if (!container) return;
  if (adminMangaTotalPages <= 1) { container.innerHTML = ''; return; }
  const pages = [];
  const start = Math.max(1, adminMangaPage - 2);
  const end = Math.min(adminMangaTotalPages, adminMangaPage + 2);
  for (let page = start; page <= end; page++) pages.push(page);
  container.innerHTML = `<button data-page="${adminMangaPage - 1}" ${adminMangaPage === 1 ? 'disabled' : ''}>‹</button>${pages.map(page => `<button data-page="${page}" class="${page === adminMangaPage ? 'active' : ''}">${page}</button>`).join('')}<button data-page="${adminMangaPage + 1}" ${adminMangaPage === adminMangaTotalPages ? 'disabled' : ''}>›</button>`;
  container.querySelectorAll('button[data-page]').forEach(button => button.addEventListener('click', () => {
    const page = Number(button.dataset.page);
    if (page >= 1 && page <= adminMangaTotalPages && page !== adminMangaPage) { adminMangaPage = page; loadMangas(); }
  }));
}

function resetAdminMangaFilters() {
  ['admin-manga-search', 'admin-manga-type', 'admin-manga-status', 'admin-manga-source', 'admin-manga-chapter-state'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const sort = document.getElementById('admin-manga-sort'); if (sort) sort.value = 'newest';
  const size = document.getElementById('admin-manga-page-size'); if (size) size.value = '20';
  adminMangaPage = 1;
  loadMangas();
}

function initAdminMangaFilters() {
  const search = document.getElementById('admin-manga-search');
  search?.addEventListener('input', () => { clearTimeout(adminMangaSearchTimer); adminMangaSearchTimer = setTimeout(() => { adminMangaPage = 1; loadMangas(); }, 250); });
  ['admin-manga-type', 'admin-manga-status', 'admin-manga-source', 'admin-manga-chapter-state', 'admin-manga-sort', 'admin-manga-page-size'].forEach(id => document.getElementById(id)?.addEventListener('change', () => { adminMangaPage = 1; loadMangas(); }));
  document.getElementById('admin-manga-reset')?.addEventListener('click', resetAdminMangaFilters);
}

function populateAuthorsDropdowns() {
  const select = document.getElementById('manga-form-author-select');
  if (select) {
    select.innerHTML = '<option value="">-- ' + t('admin.selectAuthor', 'Chọn tác giả') + ' --</option>' +
      authorsList.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  }
}

function populateMangasDropdowns() {
  const select = document.getElementById('chapter-form-manga-select');
  if (select) {
    if (!select.value) select.innerHTML = '<option value="">-- Chọn truyện tranh --</option>';
  }
}

function renderChapterMangaResults(items) {
  const container = document.getElementById('chapter-form-manga-results');
  if (!container) return;
  container.innerHTML = items.length ? items.map(manga =>
    `<button type="button" class="btn btn-secondary chapter-manga-result" data-id="${manga.id}" data-title="${escapeAdminHtml(manga.title)}" style="text-align:left;padding:7px 10px;">${escapeAdminHtml(manga.title)}</button>`
  ).join('') : '<span style="color:var(--text-muted);">Không tìm thấy truyện.</span>';
  container.querySelectorAll('.chapter-manga-result').forEach(button => button.addEventListener('click', () => {
    const select = document.getElementById('chapter-form-manga-select');
    select.innerHTML = `<option value="${button.dataset.id}">${button.dataset.title}</option>`;
    select.value = button.dataset.id;
    document.getElementById('chapter-form-manga-search').value = button.dataset.title;
    container.innerHTML = '';
    chapterListPage = 1;
    loadChapterList(Number(button.dataset.id));
  }));
}

async function searchChapterMangas(search = '') {
  try {
    const query = new URLSearchParams({ page: '1', pageSize: '20', search: search.trim() });
    const res = await fetch(`${API_BASE}/manga?${query}`);
    if (!res.ok) throw new Error('search manga failed');
    const data = await res.json();
    renderChapterMangaResults(data.items || data.mangas || []);
  } catch { showToast('Không thể tìm danh sách truyện.', 'error'); }
}

function renderGenresCheckboxes() {
  const container = document.getElementById('manga-form-genres-checkbox-container');
  if (container) {
    container.innerHTML = genresList.map(g => `
      <label class="taxonomy-chip">
        <input type="checkbox" name="manga-genres" value="${g.id}" style="width: 16px; height: 16px; accent-color: var(--accent-primary);" />
        <span>${g.name}</span>
      </label>
    `).join('');
  }
  renderDraftGenresCheckboxes();
}

async function loadChapterList(mangaId) {
  const panel = document.getElementById('chapter-list-panel');
  if (!panel) return;
  if (!mangaId) { panel.style.display = 'none'; panel.innerHTML = ''; return; }
  try {
    const search = document.getElementById('chapter-form-chapter-search')?.value.trim() || '';
    const query = new URLSearchParams({ search, page: String(chapterListPage), pageSize: String(chapterListPageSize) });
    const res = await apiFetch(`${API_BASE}/admin/manga/${mangaId}/chapters?${query}`);
    if (!res.ok) throw new Error('load chapters failed');
    const data = await res.json();
    panel.style.display = 'block';
    const items = document.getElementById('chapter-list-items');
    if (items) items.innerHTML = data.items?.length ? data.items.map(chapter => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid rgba(255,255,255,.06);gap:10px;">
        <span>Ch&#432;&#417;ng ${chapter.chapterNumber}${chapter.title ? ` - ${escapeAdminHtml(chapter.title)}` : ''}</span>
        <button type="button" class="btn-edit-chapter btn btn-secondary" data-id="${chapter.id}" style="padding:5px 10px;">S&#7917;a</button>
      </div>`).join('') : '<span style="color:var(--text-muted);">Ch&#432;a c&#243; chapter.</span>';
    const summary = document.getElementById('chapter-list-summary');
    if (summary) summary.textContent = `${data.totalItems || 0} chapter · ${data.page}/${data.totalPages || 1}`;
    const pagination = document.getElementById('chapter-list-pagination');
    if (pagination) {
      pagination.innerHTML = '';
      for (let page = 1; page <= (data.totalPages || 1); page++) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'btn btn-secondary'; button.textContent = page;
        button.disabled = page === data.page; button.style.padding = '4px 9px';
        button.addEventListener('click', () => { chapterListPage = page; loadChapterList(mangaId); });
        pagination.appendChild(button);
      }
    }
    items?.querySelectorAll('.btn-edit-chapter').forEach(button => {
      button.addEventListener('click', () => loadChapterForEditing(Number(button.dataset.id)));
    });
  } catch {
    showToast('\u004b\u0068\u00f4\u006e\u0067 \u0074\u0068\u1ec3 \u0074\u1ea3\u0069 \u0064\u0061\u006e\u0068 \u0073\u00e1\u0063\u0068 \u0063\u0068\u0061\u0070\u0074\u0065\u0072.', 'error');
  }
}

async function loadChapterForEditing(id) {
  try {
    const res = await apiFetch(`${API_BASE}/admin/chapter/${id}`);
    const chapter = await res.json();
    if (!res.ok) { showToast(chapter.message || 'Kh\u00f4ng th\u1ec3 t\u1ea3i chapter.', 'error'); return; }
    editingChapterId = id;
    editingChapterSource = chapter.source || 'Local';
    document.getElementById('chapter-form-manga-select').value = chapter.mangaId;
    document.getElementById('chapter-form-manga-select').disabled = true;
    document.getElementById('chapter-form-number').value = chapter.chapterNumber;
    document.getElementById('chapter-form-title').value = chapter.title || '';
    uploadedChapterPages = (chapter.pages || []).map(page => page.imageUrl);
    renderChapterPagesPreview();
    const isMangaDex = editingChapterSource === 'MangaDex';
    document.getElementById('chapter-form-pages').disabled = isMangaDex;
    document.getElementById('btn-upload-pages').disabled = isMangaDex;
    document.getElementById('chapter-source-note').style.display = isMangaDex ? 'inline' : 'none';
    document.getElementById('btn-cancel-chapter-edit').style.display = 'inline-flex';
    document.getElementById('chapter-form-heading').innerHTML = 'S&#7917;a chapter';
    document.querySelector('#btn-save-chapter span').innerHTML = 'L&#432;u chapter';
  } catch {
    showToast('L\u1ed7i k\u1ebft n\u1ed1i khi t\u1ea3i chapter.', 'error');
  }
}

function resetChapterEdit() {
  editingChapterId = null;
  editingChapterSource = 'Local';
  uploadedChapterPages = [];
  document.getElementById('admin-chapter-form').reset();
  document.getElementById('chapter-form-manga-select').disabled = false;
  document.getElementById('chapter-form-pages').disabled = false;
  document.getElementById('btn-upload-pages').disabled = false;
  document.getElementById('chapter-source-note').style.display = 'none';
  document.getElementById('btn-cancel-chapter-edit').style.display = 'none';
  document.getElementById('chapter-form-heading').innerHTML = 'Th&#234;m ch&#432;&#417;ng m&#7899;i';
  document.querySelector('#btn-save-chapter span').innerHTML = '&#272;&#259;ng ch&#432;&#417;ng';
  chapterListPage = 1;
  const mangaSearch = document.getElementById('chapter-form-manga-search');
  if (mangaSearch) mangaSearch.value = '';
  const mangaResults = document.getElementById('chapter-form-manga-results');
  if (mangaResults) mangaResults.innerHTML = '';
  renderChapterPagesPreview();
}

function renderMangaThemesCheckboxes() {
  const container = document.getElementById('manga-form-themes-checkbox-container');
  if (!container) return;
  container.innerHTML = themesList.map(theme => `
    <label class="taxonomy-chip">
      <input type="checkbox" name="manga-themes" value="${theme.id}" style="width:16px;height:16px;accent-color:var(--accent-primary);" />
      <span>${escapeAdminHtml(theme.name)}</span>
    </label>
  `).join('');
}

function initSingleChoiceChips(selectId, containerId) {
  const select = document.getElementById(selectId);
  const container = document.getElementById(containerId);
  if (!select || !container) return;
  const render = () => {
    container.innerHTML = [...select.options].map(option => `
      <button type="button" class="taxonomy-chip ${select.value === option.value ? 'selected' : ''}" data-value="${option.value}">${escapeAdminHtml(option.textContent)}</button>
    `).join('');
    container.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      select.value = button.dataset.value;
      select.dispatchEvent(new Event('change'));
      render();
    }));
  };
  select.addEventListener('change', render);
  render();
}

function getStatusText(status) {
  if (status === 'Ongoing' || status === 0) return t('admin.statusOngoing', 'Đang tiến hành');
  if (status === 'Completed' || status === 1) return t('admin.statusCompleted', '\u0110\u00e3 ho\u00e0n th\u00e0nh');
  if (status === 'Cancelled' || status === 3) return '\u0110\u00e3 h\u1ee7y';
  return t('admin.statusHiatus', 'Tạm ngưng');
}

function getTypeBadgeClass(type) {
  if (type === 'Manga' || type === 0) return 'badge badge-manga';
  if (type === 'Manhwa' || type === 1) return 'badge badge-manhwa';
  if (type === 'Manhua' || type === 2) return 'badge badge-manhua';
  return 'badge';
}

function getTypeLabel(type) {
  if (type === 'Manga' || type === 0) return 'Manga';
  if (type === 'Manhwa' || type === 1) return 'Manhwa';
  if (type === 'Manhua' || type === 2) return 'Manhua';
  if (type === 'Webtoon' || type === 3) return 'Webtoon';
  return 'Comic';
}

function getDraftStatusText(status) {
  if (status === 'Draft' || status === 0) return '\u004e\u0068\u00e1\u0070';
  if (status === 'Pending' || status === 1) return '\u0043\u0068\u1edd \u0064\u0075\u0079\u1ec7\u0074';
  if (status === 'Approved' || status === 2) return '\u0110\u00e3 \u0064\u0075\u0079\u1ec7\u0074';
  return '\u0054\u1eeb \u0063\u0068\u1ed1\u0069';
}

function normalizeEnumValue(value, map) {
  if (typeof value === 'number') return value;
  return map[value] ?? 0;
}

document.getElementById('btn-add-form-author')?.addEventListener('click', () => {
  const select = document.getElementById('manga-form-author-select');
  const roleSelect = document.getElementById('manga-form-author-role');
  if (!select || !roleSelect) return;
  const authorId = Number(select.value);
  if (!authorId) { showToast(t('admin.pleaseSelectAuthor', 'Vui lòng chọn tác giả!'), 'warning'); return; }
  if (selectedAdminMangaAuthors.some(a => a.authorId === authorId)) { showToast(t('admin.authorAlreadyAdded', 'T\u00e1c gi\u1ea3 \u0111\u00e3 \u0111\u01b0\u1ee3c th\u00eam!'), 'warning'); return; }
  const name = select.options[select.selectedIndex].text;
  selectedAdminMangaAuthors.push({ authorId, role: roleSelect.value, name });
  renderMangaFormAuthorsList();
  select.value = "";
});

function initAdminTabs() {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.currentTarget.dataset.tab;
      if (editingMangaId !== null && tabName !== 'manga') {
        if (confirm(t('admin.cancelEditing', 'Huỷ bỏ chỉnh sửa hiện tại?'))) resetMangaForm();
        else return;
      }
      switchTab(tabName);
    });
  });
  document.getElementById('btn-cancel-manga-form')?.addEventListener('click', () => {
    resetMangaForm(); switchTab('manga-list');
  });
  document.querySelectorAll('.title-draft-section-btn').forEach(btn => {
    btn.addEventListener('click', () => setTitleDraftSection(btn.dataset.section));
  });
  document.getElementById('btn-new-title-draft')?.addEventListener('click', () => {
    resetTitleDraftForm();
    showTitleDraftForm();
  });
  document.getElementById('btn-add-draft-author')?.addEventListener('click', addTitleAuthor);
  document.getElementById('btn-cancel-title-draft')?.addEventListener('click', resetTitleDraftForm);
  document.getElementById('btn-save-title-draft')?.addEventListener('click', () => saveTitleDraft(false));
  document.getElementById('btn-submit-title-draft')?.addEventListener('click', () => saveTitleDraft(true));
  document.getElementById('btn-approve-title-draft')?.addEventListener('click', approveTitleDraft);
  document.getElementById('btn-reject-title-draft')?.addEventListener('click', rejectTitleDraft);
}

function switchTab(tabName) {
  activeTab = tabName;
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.admin-tab-pane').forEach(pane => {
    pane.style.display = pane.id === `adm-content-${tabName}` ? 'block' : 'none';
  });
}

// ========== FILE UPLOAD HANDLERS ==========

function initAdminForms() {
  document.getElementById('chapter-form-manga-select')?.addEventListener('change', event => {
    if (!editingChapterId) loadChapterList(Number(event.target.value));
  });
  document.getElementById('chapter-form-manga-search')?.addEventListener('input', event => {
    clearTimeout(chapterMangaSearchTimer);
    chapterMangaSearchTimer = setTimeout(() => searchChapterMangas(event.target.value), 250);
  });
  document.getElementById('chapter-form-chapter-search')?.addEventListener('input', () => {
    clearTimeout(chapterListSearchTimer);
    chapterListSearchTimer = setTimeout(() => {
      chapterListPage = 1;
      const mangaId = Number(document.getElementById('chapter-form-manga-select')?.value);
      if (mangaId) loadChapterList(mangaId);
    }, 250);
  });
  searchChapterMangas();
  document.getElementById('btn-cancel-chapter-edit')?.addEventListener('click', resetChapterEdit);
  // Author form
  document.getElementById('admin-author-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('author-form-name').value.trim();
    const biography = document.getElementById('author-form-biography').value.trim();
    try {
      const res = await apiFetch(`${API_BASE}/admin/author`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, biography })
      });
      if (res.ok) { showToast(t('admin.createAuthorSuccess', 'Thêm tác giả thành công!'), true); document.getElementById('admin-author-form').reset(); await loadAuthors(); }
      else { showToast(t('admin.createAuthorError', 'Lỗi thêm tác giả.'), false); }
    } catch { showToast(t('admin.connectionError', 'Lỗi kết nối.'), false); }
  });

  // Genre form
  document.getElementById('admin-genre-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('genre-form-name').value.trim();
    const slug = document.getElementById('genre-form-slug').value.trim();
    try {
      const res = await apiFetch(`${API_BASE}/admin/genre`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug })
      });
      if (res.ok) { showToast(t('admin.createGenreSuccess', 'Thêm thể loại thành công!'), true); document.getElementById('admin-genre-form').reset(); await loadGenres(); }
      else { showToast(t('admin.createGenreError', 'Lỗi thêm thể loại.'), false); }
    } catch { showToast(t('admin.connectionError', 'Lỗi kết nối.'), false); }
  });

  // Chapter form
  document.getElementById('admin-chapter-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mangaId = Number(document.getElementById('chapter-form-manga-select').value);
    const chapterNumber = Number(document.getElementById('chapter-form-number').value);
    const title = document.getElementById('chapter-form-title').value.trim();
    const pageUrls = uploadedChapterPages.length > 0
      ? uploadedChapterPages
      : document.getElementById('chapter-form-pages').value.trim().split('\n').map(l => l.trim()).filter(l => l);

    if (!mangaId) { showToast(t('admin.pleaseSelectManga', 'Vui lòng chọn truyện!'), 'warning'); return; }
    if (editingChapterSource === 'Local' && pageUrls.length === 0) { showToast(t('admin.pleaseAddPage', 'Vui lòng thêm ít nhất một trang!'), 'warning'); return; }

    try {
      const isEditing = editingChapterId !== null;
      const payload = isEditing
        ? AdminChapterEdit.buildChapterPayload(editingChapterSource, chapterNumber, title, pageUrls)
        : { mangaId, chapterNumber, title, pageUrls };
      const res = await apiFetch(isEditing ? `${API_BASE}/admin/chapter/${editingChapterId}` : `${API_BASE}/admin/chapter`, {
        method: isEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(isEditing ? '\u0110\u00e3 c\u1eadp nh\u1eadt chapter.' : 'Th\u00eam ch\u01b0\u01a1ng th\u00e0nh c\u00f4ng!', 'success');
        const selectedMangaId = mangaId;
        resetChapterEdit();
        document.getElementById('chapter-form-manga-select').value = selectedMangaId;
        await loadChapterList(selectedMangaId);
      }
      else { const error = await res.json().catch(() => ({})); showToast(error.message || 'Lỗi lưu chapter.', 'error'); }
    } catch { showToast('Lỗi kết nối.', 'error'); }
  });

  // Manga form
  document.getElementById('admin-manga-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('manga-form-title').value.trim();
    const alternativeTitle = document.getElementById('manga-form-alt-title').value.trim();
    const description = document.getElementById('manga-form-description').value.trim();
    const type = Number(document.getElementById('manga-form-type').value);
    const status = Number(document.getElementById('manga-form-status').value);
    const yearVal = document.getElementById('manga-form-year').value;
    const releaseYear = yearVal ? Number(yearVal) : null;
    const demographic = Number(document.getElementById('manga-form-demographic').value);
    const format = Number(document.getElementById('manga-form-format').value);
    const coverUrl = document.getElementById('manga-form-cover').value.trim();

    const genreIds = [];
    document.querySelectorAll('input[name="manga-genres"]:checked').forEach(c => genreIds.push(Number(c.value)));
    if (genreIds.length === 0) { showToast(t('admin.pleaseSelectGenre', 'Vui lòng chọn ít nhất một thể loại!'), 'warning'); return; }
    const themeIds = [];
    document.querySelectorAll('input[name="manga-themes"]:checked').forEach(c => themeIds.push(Number(c.value)));
    const contentWarnings = [...document.querySelectorAll('input[name="manga-content-warning"]:checked')].map(c => c.value);
    if (selectedAdminMangaAuthors.length === 0) { showToast(t('admin.pleaseAssignAuthor', 'Vui lòng gán ít nhất một tác giả!'), 'warning'); return; }

    const payload = {
      title, alternativeTitle, description, coverUrl,
      type, status, releaseYear, demographic, format,
      genreIds, themeIds, contentWarnings,
      authors: selectedAdminMangaAuthors.map(a => ({ authorId: a.authorId, role: a.role }))
    };

    try {
      let res;
      if (editingMangaId !== null) {
        res = await apiFetch(`${API_BASE}/admin/manga/${editingMangaId}`, {
          method: 'PUT', body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch(`${API_BASE}/admin/manga`, {
          method: 'POST', body: JSON.stringify(payload)
        });
      }
      if (res.ok) {
        showToast(editingMangaId ? t('admin.updateSuccess', 'Cập nhật thành công!') : t('admin.createMangaSuccess', 'Đăng truyện mới thành công!'), true);
        resetMangaForm(); await loadMangas(); switchTab('manga-list');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || t('admin.saveMangaError', 'Lỗi lưu truyện.'), false);
      }
    } catch { showToast(t('admin.connectionError', 'Lỗi kết nối.'), false); }
  });
}

let toastTimeout = null;
function showToast(message, type = 'success') {
  const toast = document.getElementById('admin-toast-message');
  if (!toast) return;
  if (toastTimeout) clearTimeout(toastTimeout);
  const succIcon = toast.querySelector('.icon-success');
  const errIcon = toast.querySelector('.icon-error');
  const text = toast.querySelector('.msg-text');
  if (!message) return;
  text.textContent = message;
  if (type === true) type = 'success';
  if (type === false) type = 'error';
  if (type === 'success') {
    toast.style.cssText = 'display:flex;padding:12px 16px;border-radius:6px;margin-bottom:24px;font-size:0.85rem;align-items:center;gap:8px;background-color:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#10B981;';
    succIcon.style.display = 'block'; errIcon.style.display = 'none';
  } else if (type === 'warning') {
    toast.style.cssText = 'display:flex;padding:12px 16px;border-radius:6px;margin-bottom:24px;font-size:0.85rem;align-items:center;gap:8px;background-color:rgba(255,193,7,0.15);border:1px solid rgba(255,193,7,0.35);color:#FFC107;';
    succIcon.style.display = 'none'; errIcon.style.display = 'block';
  } else {
    toast.style.cssText = 'display:flex;padding:12px 16px;border-radius:6px;margin-bottom:24px;font-size:0.85rem;align-items:center;gap:8px;background-color:rgba(255,69,82,0.15);border:1px solid rgba(255,69,82,0.3);color:#FF4552;';
    succIcon.style.display = 'none'; errIcon.style.display = 'block';
  }
  toastTimeout = setTimeout(() => { toast.style.display = 'none'; }, 4000);
}
