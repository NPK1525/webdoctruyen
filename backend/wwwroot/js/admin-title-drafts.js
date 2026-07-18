// Admin title-draft state and actions.

function populateTitleAuthorDropdown() {
  const select = document.getElementById('draft-author-select');
  if (!select) return;
  select.innerHTML = '<option value="">-- Chọn tác giả --</option>' +
    authorsList.map(a => `<option value="${a.id}">${escapeAdminHtml(a.name)}</option>`).join('');
}

function renderTitleAuthors() {
  const container = document.getElementById('draft-authors-list');
  if (!container) return;
  container.innerHTML = selectedTitleAuthors.length
    ? selectedTitleAuthors.map((a, index) => `<button type="button" class="taxonomy-chip" data-remove-title-author="${index}"><span>${escapeAdminHtml(a.name)} (${escapeAdminHtml(a.role)}) ×</span></button>`).join('')
    : '<span style="color:var(--text-muted);font-size:.8rem;">Chưa thêm tác giả.</span>';
  container.querySelectorAll('[data-remove-title-author]').forEach(button => {
    button.addEventListener('click', () => {
      selectedTitleAuthors.splice(Number(button.dataset.removeTitleAuthor), 1);
      renderTitleAuthors();
    });
  });
}

function addTitleAuthor() {
  const select = document.getElementById('draft-author-select');
  const role = document.getElementById('draft-author-role')?.value || 'Story & Art';
  const newNameInput = document.getElementById('draft-new-author-name');
  const authorId = Number(select?.value || 0) || null;
  const newName = newNameInput?.value.trim() || '';
  const name = authorId ? select.options[select.selectedIndex].text : newName;
  if (!name) { showToast('Vui lòng chọn hoặc nhập tác giả.', 'warning'); return; }
  if (selectedTitleAuthors.some(a => a.authorId === authorId && a.name.trim().toLowerCase() === name.trim().toLowerCase() && a.role === role)) {
    showToast('Tác giả đã được thêm với vai trò này.', 'warning'); return;
  }
  selectedTitleAuthors.push({ authorId, name, role });
  if (select) select.value = '';
  if (newNameInput) newNameInput.value = '';
  renderTitleAuthors();
}

function renderDraftGenresCheckboxes() {
  const container = document.getElementById('draft-genres-checkbox-container');
  if (!container) return;
  container.innerHTML = genresList.map(g => `
    <label>
      <input type="checkbox" name="draft-genres" value="${g.id}" style="width:15px;height:15px;accent-color:var(--accent-primary);" />
      <span>${escapeAdminHtml(g.name)}</span>
    </label>
  `).join('');
}

function renderDraftThemesCheckboxes() {
  const container = document.getElementById('draft-themes-checkbox-container');
  if (!container) return;
  container.innerHTML = themesList.map(ti => `
    <label>
      <input type="checkbox" name="draft-themes" value="${ti.id}" style="width:15px;height:15px;accent-color:var(--accent-primary);" />
      <span>${escapeAdminHtml(ti.name)}</span>
    </label>
  `).join('');
}

function renderTitleDraftsTable() {
  const tbody = document.getElementById('title-drafts-table-body');
  if (!tbody) return;

  if (titleDraftsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding:18px;text-align:center;color:var(--text-muted);">${'\u0043\u0068\u01b0\u0061 \u0063\u00f3 \u0062\u1ea3\u006e \u006e\u0068\u00e1\u0070 \u006e\u00e0\u006f.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = titleDraftsList.map(d => `
    <tr>
      <td style="padding:10px;"><img src="${escapeAdminHtml(d.coverUrl || '')}" alt="" style="width:42px;height:58px;object-fit:cover;border-radius:4px;background:rgba(255,255,255,0.06);" /></td>
      <td style="padding:10px;color:white;font-weight:800;">${escapeAdminHtml(d.title || '')}<div style="color:var(--text-muted);font-size:0.75rem;font-weight:600;">${escapeAdminHtml(d.createdBy || '')}</div></td>
      <td style="padding:10px;"><span class="badge" style="background:rgba(255,255,255,0.08);color:white;">${getDraftStatusText(d.reviewStatus)}</span></td>
      <td style="padding:10px;color:var(--text-muted);">${formatAdminDate(d.updatedAt)}</td>
      <td style="padding:10px;text-align:right;">
        <button type="button" class="btn-edit-title-draft" data-draft-id="${d.id}" style="color:#FF8C00;padding:6px;display:inline-flex;align-items:center;background:none;border:none;cursor:pointer;" title="Edit">
          <i data-lucide="edit" style="width:18px;height:18px;"></i>
        </button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.btn-edit-title-draft').forEach(btn => {
    btn.onclick = () => loadTitleDraftForEditing(Number(btn.dataset.draftId));
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function formatAdminDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN');
}

let titleDraftSectionObserver = null;

function setActiveTitleDraftSection(section) {
  document.querySelectorAll('.title-draft-section-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });
}

function scrollToTitleDraftSection(section, behavior = 'smooth') {
  const panel = document.querySelector(`.title-draft-section[data-section-panel="${section}"]`);
  if (!panel) return;
  setActiveTitleDraftSection(section);
  panel.scrollIntoView({ behavior, block: 'start' });
}

function disconnectTitleDraftSectionObserver() {
  titleDraftSectionObserver?.disconnect();
  titleDraftSectionObserver = null;
}

function initTitleDraftSectionObserver() {
  disconnectTitleDraftSectionObserver();
  if (!('IntersectionObserver' in window)) return;

  const panels = [...document.querySelectorAll('.title-draft-section[data-section-panel]')];
  if (!panels.length) return;

  titleDraftSectionObserver = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setActiveTitleDraftSection(visible.target.dataset.sectionPanel);
  }, { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.2, 0.5, 0.75] });

  panels.forEach(panel => titleDraftSectionObserver.observe(panel));
}

function resetTitleDraftForm() {
  editingTitleDraftId = null;
  currentTitleDraft = null;
  const form = document.getElementById('title-draft-form');
  form?.reset();
  selectedTitleAuthors = [];
  renderTitleAuthors();
  document.getElementById('title-draft-id').value = '';
  document.querySelectorAll('input[name="draft-genres"],input[name="draft-themes"]').forEach(cb => cb.checked = false);
  document.getElementById('draft-review-status-label').value = '\u004e\u0068\u00e1\u0070';
  document.getElementById('draft-created-by-label').value = currentUser?.username || '';
  document.getElementById('draft-created-at-label').value = '';
  document.getElementById('draft-rejection-reason').value = '';
  document.getElementById('btn-approve-title-draft').style.display = 'none';
  document.getElementById('btn-reject-title-draft').style.display = 'none';
  document.getElementById('title-draft-list-panel').style.display = 'block';
  disconnectTitleDraftSectionObserver();
  setActiveTitleDraftSection('basic');
  form.style.display = 'none';
  renderDraftImagePreview();
}

function showTitleDraftForm() {
  document.getElementById('title-draft-list-panel').style.display = 'none';
  document.getElementById('title-draft-form').style.display = 'block';
  setActiveTitleDraftSection('basic');
  requestAnimationFrame(() => {
    scrollToTitleDraftSection('basic', 'auto');
    initTitleDraftSectionObserver();
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function loadTitleDraftForEditing(id) {
  try {
    const res = await apiFetch(`${API_BASE}/admin/title-drafts/${id}`);
    if (!res.ok) { showToast('\u004b\u0068\u00f4\u006e\u0067 \u0074\u0068\u1ec3 \u0074\u1ea3\u0069 \u0062\u1ea3\u006e \u006e\u0068\u00e1\u0070.', false); return; }
    const d = await res.json();
    currentTitleDraft = d;
    editingTitleDraftId = d.id;
    document.getElementById('title-draft-id').value = d.id || '';
    document.getElementById('draft-title').value = d.title || '';
    document.getElementById('draft-original-title').value = d.originalTitle || '';
    document.getElementById('draft-english-title').value = d.englishTitle || '';
    document.getElementById('draft-alternative-titles').value = (d.alternativeTitles || []).join(' | ');
    document.getElementById('draft-description').value = d.description || '';
    document.getElementById('draft-original-language').value = d.originalLanguage || 'vi';
    document.getElementById('draft-type').value = normalizeEnumValue(d.type, { Manga: 0, Manhwa: 1, Manhua: 2, Webtoon: 3, Comic: 4 });
    document.getElementById('draft-status').value = normalizeEnumValue(d.status, { Ongoing: 0, Completed: 1, Hiatus: 2, Cancelled: 3 });
    document.getElementById('draft-release-year').value = d.releaseYear || '';
    document.getElementById('draft-publisher').value = d.publisher || '';
    selectedTitleAuthors = (d.authors || []).map(a => ({ authorId: a.authorId || null, name: a.proposedName || a.name || '', role: a.role || 'Story & Art' }));
    renderTitleAuthors();
    document.getElementById('draft-demographic').value = normalizeEnumValue(d.demographic, { None: 0, Shounen: 1, Shoujo: 2, Seinen: 3, Josei: 4 });
    document.getElementById('draft-format').value = normalizeEnumValue(d.format, { None: 0, Adaptation: 1, WebComic: 2, OneShot: 3, Comic: 4, Book: 5 });
    document.getElementById('draft-age-rating').value = normalizeEnumValue(d.ageRating, { AllAges: 0, Teen13: 1, Teen16: 2, Adult18: 3 });
    document.getElementById('draft-cover-url').value = d.coverUrl || '';
    document.getElementById('draft-banner-url').value = d.bannerUrl || '';
    document.getElementById('draft-official-website').value = d.officialWebsite || '';
    document.getElementById('draft-reference-url').value = d.referenceUrl || '';
    document.getElementById('draft-tracking-url').value = d.trackingUrl || '';
    document.getElementById('draft-data-source').value = d.dataSource || 'Local';
    document.getElementById('draft-mangadex-id').value = d.mangaDexId || '';
    document.getElementById('draft-scanlation-group').value = d.scanlationGroup || '';
    document.getElementById('draft-note').value = d.note || '';
    document.getElementById('draft-review-status-label').value = getDraftStatusText(d.reviewStatus);
    document.getElementById('draft-created-by-label').value = d.createdBy || currentUser?.username || '';
    document.getElementById('draft-created-at-label').value = formatAdminDate(d.createdAt);
    document.getElementById('draft-rejection-reason').value = d.rejectionReason || '';
    setCheckedValues('draft-genres', d.genreIds || []);
    setCheckedValues('draft-themes', d.themeIds || []);
    const reviewValue = normalizeEnumValue(d.reviewStatus, { Draft: 0, Pending: 1, Approved: 2, Rejected: 3 });
    document.getElementById('btn-approve-title-draft').style.display = reviewValue === 2 ? 'none' : 'inline-flex';
    document.getElementById('btn-reject-title-draft').style.display = reviewValue === 2 ? 'none' : 'inline-flex';
    renderDraftImagePreview();
    showTitleDraftForm();
  } catch (e) {
    console.error(e);
    showToast('\u004c\u1ed7\u0069 \u006b\u1ebf\u0074 \u006e\u1ed1\u0069.', false);
  }
}

function setCheckedValues(name, values) {
  const set = new Set((values || []).map(v => Number(v)));
  document.querySelectorAll(`input[name="${name}"]`).forEach(cb => {
    cb.checked = set.has(Number(cb.value));
  });
}

function collectTitleDraftPayload(submitForReview) {
  const genreIds = [...document.querySelectorAll('input[name="draft-genres"]:checked')].map(cb => Number(cb.value));
  const themeIds = [...document.querySelectorAll('input[name="draft-themes"]:checked')].map(cb => Number(cb.value));
  return {
    title: document.getElementById('draft-title').value.trim(),
    originalTitle: document.getElementById('draft-original-title').value.trim(),
    englishTitle: document.getElementById('draft-english-title').value.trim(),
    alternativeTitles: document.getElementById('draft-alternative-titles').value.split('|').map(x => x.trim()).filter(Boolean),
    description: document.getElementById('draft-description').value.trim(),
    originalLanguage: document.getElementById('draft-original-language').value,
    type: Number(document.getElementById('draft-type').value),
    status: Number(document.getElementById('draft-status').value),
    format: Number(document.getElementById('draft-format').value),
    releaseYear: document.getElementById('draft-release-year').value ? Number(document.getElementById('draft-release-year').value) : null,
    publisher: document.getElementById('draft-publisher').value.trim(),
    authors: selectedTitleAuthors.map(a => ({ authorId: a.authorId, name: a.authorId ? '' : a.name, role: a.role })),
    genreIds,
    themeIds,
    demographic: Number(document.getElementById('draft-demographic').value),
    ageRating: Number(document.getElementById('draft-age-rating').value),
    contentWarnings: [...document.querySelectorAll('input[name="draft-content-warning"]:checked')].map(cb => cb.value),
    coverUrl: document.getElementById('draft-cover-url').value.trim(),
    bannerUrl: document.getElementById('draft-banner-url').value.trim(),
    officialWebsite: document.getElementById('draft-official-website').value.trim(),
    referenceUrl: document.getElementById('draft-reference-url').value.trim(),
    trackingUrl: document.getElementById('draft-tracking-url').value.trim(),
    dataSource: document.getElementById('draft-data-source').value,
    mangaDexId: document.getElementById('draft-mangadex-id').value.trim(),
    scanlationGroup: document.getElementById('draft-scanlation-group').value.trim(),
    note: document.getElementById('draft-note').value.trim(),
    submitForReview
  };
}

async function saveTitleDraft(submitForReview) {
  const payload = collectTitleDraftPayload(submitForReview);
  if (!payload.title) { showToast('\u0056\u0075\u0069 \u006c\u00f2\u006e\u0067 \u006e\u0068\u1ead\u0070 \u0074\u00ea\u006e \u0074\u0072\u0075\u0079\u1ec7\u006e.', 'warning'); return; }
  if (!payload.description) { showToast('\u0056\u0075\u0069 \u006c\u00f2\u006e\u0067 \u006e\u0068\u1ead\u0070 \u006d\u00f4 \u0074\u1ea3.', 'warning'); return; }
  if (submitForReview && !payload.coverUrl) { showToast('\u1ea2\u006e\u0068 \u0062\u00ec\u0061 \u006c\u00e0 \u0062\u1eaft\u0074 \u0062\u0075\u1ed9\u0063 \u006b\u0068\u0069 \u0067\u1eedi \u0064\u0075\u0079\u1ec7\u0074.', 'warning'); return; }

  const url = editingTitleDraftId ? `${API_BASE}/admin/title-drafts/${editingTitleDraftId}` : `${API_BASE}/title-submissions`;
  const method = editingTitleDraftId ? 'PUT' : 'POST';
  try {
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { showToast(data.message || '\u004c\u01b0\u0075 \u0062\u1ea3\u006e \u006e\u0068\u00e1\u0070 \u0074\u0068\u1ea5\u0074 \u0062\u1ea1\u0069.', false); return; }
    showToast(data.message || '\u0110\u00e3 \u0111\u0103ng truy\u1ec7n.', true);
    await loadTitleDrafts();
    await loadMangas();
    resetTitleDraftForm();
  } catch (e) {
    console.error(e);
    showToast('\u004c\u1ed7\u0069 \u006b\u1ebf\u0074 \u006e\u1ed1\u0069.', false);
  }
}

async function approveTitleDraft() {
  if (!editingTitleDraftId) return;
  try {
    const res = await apiFetch(`${API_BASE}/admin/title-drafts/${editingTitleDraftId}/approve`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { showToast(data.message || '\u0044\u0075\u0079\u1ec7\u0074 \u0062\u1ea3\u006e \u006e\u0068\u00e1\u0070 \u0074\u0068\u1ea5\u0074 \u0062\u1ea1\u0069.', false); return; }
    showToast(data.message || '\u0110\u00e3 \u0064\u0075\u0079\u1ec7\u0074.', true);
    await loadAdminData();
    resetTitleDraftForm();
    if (data.mangaId) window.location.href = `/manga/${data.mangaId}`;
  } catch (e) {
    console.error(e);
    showToast('\u004c\u1ed7\u0069 \u006b\u1ebf\u0074 \u006e\u1ed1\u0069.', false);
  }
}

async function rejectTitleDraft() {
  if (!editingTitleDraftId) return;
  const reason = document.getElementById('draft-rejection-reason').value.trim();
  try {
    const res = await apiFetch(`${API_BASE}/admin/title-drafts/${editingTitleDraftId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { showToast(data.message || '\u0054\u1eeb \u0063\u0068\u1ed1\u0069 \u0062\u1ea3\u006e \u006e\u0068\u00e1\u0070 \u0074\u0068\u1ea5\u0074 \u0062\u1ea1\u0069.', false); return; }
    showToast(data.message || '\u0110\u00e3 \u0074\u1eeb \u0063\u0068\u1ed1\u0069.', true);
    await loadTitleDrafts();
    resetTitleDraftForm();
  } catch (e) {
    console.error(e);
    showToast('\u004c\u1ed7\u0069 \u006b\u1ebf\u0074 \u006e\u1ed1\u0069.', false);
  }
}
