(function () {
  const mangaReasons = ['Duplicate entry', 'Incorrect or missing volume numbers', 'Information to correct', 'Missing cover art', 'Other', 'Troll entry', 'Vandalism'];
  const chapterReasons = ['Credit page in the middle of the chapter', 'Duplicate upload from same user/group', 'Extraneous political/race-baiting/offensive content', 'Fake/Spam chapter', 'Group lock evasion', 'Images not loading', 'Incorrect chapter number', 'Incorrect group', 'Incorrect or duplicate pages', 'Incorrect or missing chapter title', 'Incorrect or missing volume number', 'Missing pages', 'Naming rules broken', 'Official release/Raw', 'Other', 'Pages out of order', 'Released before raws released', 'Uploaded on wrong manga', 'Watermarked images'];
  let state = null;
  const modal = () => document.getElementById('report-modal');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function setError(message) { const el = document.getElementById('report-modal-error'); if (!el) return; el.textContent = message || ''; el.hidden = !message; }
  function renderTarget() {
    const target = document.getElementById('report-target-card');
    const label = document.getElementById('report-target-label');
    if (!target || !label || !state) return;
    const isChapter = state.targetType === 'Chapter';
    label.textContent = isChapter ? 'Reporting Chapter' : 'Reporting Title';
    target.innerHTML = isChapter
      ? `<div><strong>${escapeHtml(state.chapterTitle || `Chapter ${state.chapterNumber ?? ''}`)}</strong><small>${escapeHtml(state.group || '')}</small></div><div class="report-target-meta">${escapeHtml(state.mangaTitle || '')}</div>`
      : `<img src="${escapeHtml(state.coverUrl || '')}" alt=""><div><strong>${escapeHtml(state.title || '')}</strong><small>${escapeHtml(state.identifier || `Manga #${state.mangaId}`)}</small></div>`;
  }
  window.openReportModal = function (options) {
    let signedIn = false;
    try { signedIn = !!JSON.parse(localStorage.getItem('user') || 'null'); } catch (_) { signedIn = false; }
    if (!signedIn) { if (typeof window.openAuthModal === 'function') window.openAuthModal('login'); return; }
    state = { ...options };
    renderTarget();
    const select = document.getElementById('report-reason');
    select.innerHTML = '<option value="">Choose a reason</option>' + (state.targetType === 'Chapter' ? chapterReasons : mangaReasons).map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');
    document.getElementById('report-explanation').value = '';
    setError('');
    modal().style.display = 'flex'; modal().setAttribute('aria-hidden', 'false');
  };
  window.closeReportModal = function () { if (!modal()) return; modal().style.display = 'none'; modal().setAttribute('aria-hidden', 'true'); state = null; };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-report-close]').forEach(el => el.addEventListener('click', closeReportModal));
    document.getElementById('report-submit')?.addEventListener('click', async () => {
      if (!state) return;
      const reason = document.getElementById('report-reason').value;
      const explanation = document.getElementById('report-explanation').value.trim();
      if (!reason) return setError('Please choose a reason.');
      if (reason === 'Other' && !explanation) return setError('Explanation is required for Other.');
      const button = document.getElementById('report-submit'); button.disabled = true; setError('');
      try {
        const response = await apiFetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType: state.targetType, mangaId: state.mangaId ?? null, chapterId: state.chapterId ?? null, reason, explanation: explanation || null }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Unable to send report.');
        closeReportModal(); if (typeof window.showToast === 'function') window.showToast('Report sent.', 'success');
      } catch (error) { setError(error.message); } finally { button.disabled = false; }
    });
  });
})();
