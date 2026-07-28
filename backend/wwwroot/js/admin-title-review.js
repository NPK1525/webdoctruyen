(() => {
  const PAGE_SIZE = 20;
  let drafts = [];
  let page = 1;
  let selectedId = null;
  let initialized = false;
  let busy = false;

  const byId = id => document.getElementById(id);
  const escape = value => (typeof adminEscapeHtml === 'function'
    ? adminEscapeHtml(value)
    : String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const statusText = value => ({
    0: t('admin.draftStatus', 'Nháp'),
    1: t('admin.pendingStatus', 'Chờ duyệt'),
    2: t('admin.approvedStatus', 'Đã duyệt'),
    3: t('admin.rejectedStatus', 'Từ chối')
  }[Number(value)] || t('admin.draftStatus', 'Nháp'));

  function getFilteredDrafts() {
    const search = byId('title-review-search')?.value.trim().toLowerCase() || '';
    const status = byId('title-review-status')?.value || '';
    return drafts.filter(draft =>
      (!status || String(Number(draft.reviewStatus)) === status) &&
      (!search || `${draft.title || ''} ${draft.createdBy || ''}`.toLowerCase().includes(search))
    );
  }

  function updatePendingBadge() {
    const badge = byId('title-review-pending-count');
    if (!badge) return;
    const pending = drafts.filter(draft => Number(draft.reviewStatus) === 1).length;
    badge.textContent = String(pending);
    badge.hidden = pending === 0;
  }

  function renderPagination(totalItems) {
    const root = byId('title-review-pagination');
    if (!root) return;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    page = Math.min(page, totalPages);
    if (totalPages <= 1) {
      root.innerHTML = '';
      return;
    }
    const buttons = [];
    for (let current = Math.max(1, page - 2); current <= Math.min(totalPages, page + 2); current += 1) {
      buttons.push(`<button type="button" data-review-page="${current}" class="${current === page ? 'active' : ''}">${current}</button>`);
    }
    root.innerHTML = `<button type="button" data-review-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>‹</button>${buttons.join('')}<button type="button" data-review-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>›</button>`;
    root.querySelectorAll('[data-review-page]').forEach(button => button.addEventListener('click', () => {
      const next = Number(button.dataset.reviewPage);
      if (next >= 1 && next <= totalPages && next !== page) {
        page = next;
        renderList();
      }
    }));
  }

  function renderList() {
    const root = byId('title-review-table-body');
    if (!root) return;
    const filtered = getFilteredDrafts();
    const start = (page - 1) * PAGE_SIZE;
    const visible = filtered.slice(start, start + PAGE_SIZE);
    root.innerHTML = visible.length ? visible.map(draft => `
      <tr>
        <td><img src="${escape(draft.coverUrl || '')}" alt="" style="width:42px;height:58px;object-fit:cover;border-radius:4px;background:var(--bg-input);" /></td>
        <td style="font-weight:700;color:var(--text-main);">${escape(draft.title)}</td>
        <td>${escape(draft.createdBy || '—')}</td>
        <td>${escape(statusText(draft.reviewStatus))}</td>
        <td>${escape(new Date(draft.updatedAt).toLocaleString(document.documentElement.lang === 'en' ? 'en-US' : 'vi-VN'))}</td>
        <td><button type="button" class="btn btn-secondary title-review-open" data-review-id="${Number(draft.id)}">${escape(t('common.view', 'Xem'))}</button></td>
      </tr>`).join('') : `<tr><td colspan="6" class="management-empty">${escape(t('admin.noTitlesForReview', 'Không có truyện phù hợp.'))}</td></tr>`;
    root.querySelectorAll('.title-review-open').forEach(button => button.addEventListener('click', () => openDetail(Number(button.dataset.reviewId))));
    renderPagination(filtered.length);
    updatePendingBadge();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function renderDetail(draft) {
    const root = byId('title-review-detail-content');
    if (!root) return;
    const genres = (draft.genreIds || []).map(id => (genresList || []).find(item => Number(item.id) === Number(id))?.name).filter(Boolean);
    const themes = (draft.themeIds || []).map(id => (themesList || []).find(item => Number(item.id) === Number(id))?.name).filter(Boolean);
    root.innerHTML = `
      <div class="draft-grid two">
        <div><strong>${escape(t('admin.mangaTitle', 'Tên truyện'))}</strong><p>${escape(draft.title || '—')}</p></div>
        <div><strong>${escape(t('admin.createdBy', 'Người tạo'))}</strong><p>${escape(draft.createdBy || '—')}</p></div>
        <div><strong>${escape(t('admin.description', 'Mô tả'))}</strong><p style="white-space:pre-wrap;">${escape(draft.description || '—')}</p></div>
        <div><strong>${escape(t('admin.reviewStatus', 'Trạng thái duyệt'))}</strong><p>${escape(statusText(draft.reviewStatus))}</p></div>
        <div><strong>${escape(t('admin.genresLabel', 'Thể loại'))}</strong><p>${escape(genres.join(', ') || '—')}</p></div>
        <div><strong>${escape(t('admin.themesLabel', 'Chủ đề'))}</strong><p>${escape(themes.join(', ') || '—')}</p></div>
        <div><strong>${escape(t('admin.authors', 'Tác giả'))}</strong><p>${escape((draft.authors || []).map(author => author.proposedName).filter(Boolean).join(', ') || '—')}</p></div>
        <div><strong>${escape(t('admin.updatedAt', 'Cập nhật'))}</strong><p>${escape(new Date(draft.updatedAt).toLocaleString(document.documentElement.lang === 'en' ? 'en-US' : 'vi-VN'))}</p></div>
      </div>`;
    byId('title-review-reason').value = draft.rejectionReason || '';
    const actionable = Number(draft.reviewStatus) === 1;
    byId('title-review-reject').hidden = !actionable;
    byId('title-review-approve').hidden = !actionable;
    byId('title-review-reason').disabled = !actionable;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  async function openDetail(id) {
    const response = await apiFetch(`${API_BASE}/admin/title-drafts/${id}`);
    if (!response.ok) return showReviewMessage('', t('admin.reviewLoadError', 'Không thể tải chi tiết duyệt truyện.'));
    const draft = await response.json();
    selectedId = id;
    renderDetail(draft);
    byId('title-review-list').hidden = true;
    byId('title-review-detail').hidden = false;
    byId('title-review-detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeDetail() {
    selectedId = null;
    byId('title-review-detail').hidden = true;
    byId('title-review-list').hidden = false;
  }

  function showReviewMessage(key, fallback, success = false) {
    if (typeof showToast === 'function') showToast(t(key, fallback), success);
  }

  function setBusy(value) {
    busy = value;
    ['title-review-reject', 'title-review-approve', 'title-review-back'].forEach(id => {
      const button = byId(id);
      if (button) button.disabled = value;
    });
  }

  async function runAction(kind, body) {
    if (busy || !selectedId) return;
    setBusy(true);
    try {
      const response = await apiFetch(`${API_BASE}/admin/title-drafts/${selectedId}/${kind}`, {
        method: 'POST',
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showReviewMessage('admin.reviewActionError', data.message || 'Không thể cập nhật trạng thái duyệt.');
        return;
      }
      closeDetail();
      await loadDrafts();
      showReviewMessage('', data.message || 'Đã cập nhật.', true);
    } finally {
      setBusy(false);
    }
  }

  async function rejectSelected() {
    const reason = byId('title-review-reason').value.trim();
    if (!reason) {
      showReviewMessage('admin.rejectionReasonRequired', 'Vui lòng nhập lý do từ chối.');
      return;
    }
    await runAction('reject', { reason });
  }

  async function loadDrafts() {
    const response = await apiFetch(`${API_BASE}/admin/title-drafts`);
    if (!response.ok) {
      showReviewMessage('admin.reviewLoadError', 'Không thể tải danh sách duyệt truyện.');
      return;
    }
    drafts = await response.json();
    page = 1;
    renderList();
  }

  function init() {
    if (initialized) return;
    initialized = true;
    byId('title-review-search')?.addEventListener('input', () => { page = 1; renderList(); });
    byId('title-review-status')?.addEventListener('change', () => { page = 1; renderList(); });
    byId('title-review-back')?.addEventListener('click', closeDetail);
    byId('title-review-approve')?.addEventListener('click', () => runAction('approve'));
    byId('title-review-reject')?.addEventListener('click', rejectSelected);
    window.addEventListener('manganpk:localechanged', () => {
      if (!initialized) return;
      renderList();
      if (selectedId) {
        const selected = drafts.find(draft => Number(draft.id) === Number(selectedId));
        if (selected) renderDetail(selected);
      }
    });
  }

  async function activate() {
    init();
    await loadDrafts();
  }

  window.AdminTitleReview = { init, activate, refresh: loadDrafts };
})();
