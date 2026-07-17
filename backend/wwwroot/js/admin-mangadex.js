// Admin MangaDex preview/import handlers.

function initMangaDexImport() {
  const form = document.getElementById('admin-mangadex-form');
  const input = document.getElementById('mangadex-import-input');
  const previewBtn = document.getElementById('btn-mangadex-preview');
  const importBtn = document.getElementById('btn-mangadex-import');

  previewBtn?.addEventListener('click', async () => {
    const value = input?.value.trim() || '';
    if (!value) {
      showToast('\u0056\u0075\u0069 \u006c\u00f2\u006e\u0067 \u006e\u0068\u1ead\u0070 \u0055\u0052\u004c \u0068\u006f\u1eb7\u0063 \u0055\u0055\u0049\u0044 \u004d\u0061\u006e\u0067\u0061\u0044\u0065\u0078.', 'warning');
      return;
    }

    setMangaDexBusy(true);
    mangaDexPreview = null;
    if (importBtn) importBtn.disabled = true;

    try {
      const res = await apiFetch(`${API_BASE}/admin/mangadex/preview`, {
        method: 'POST',
        body: JSON.stringify({ input: value })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || '\u004b\u0068\u00f4\u006e\u0067 \u0074\u0068\u1ec3 \u0078\u0065\u006d \u0074\u0072\u01b0\u1edb\u0063 \u0074\u0072\u0075\u0079\u1ec7\u006e \u004d\u0061\u006e\u0067\u0061\u0044\u0065\u0078.', false);
        renderMangaDexPreview(null);
        return;
      }

      mangaDexPreview = data;
      renderMangaDexPreview(data);
      if (importBtn) importBtn.disabled = false;
      showToast(data.exists
        ? '\u0054\u0072\u0075\u0079\u1ec7\u006e \u0111\u00e3 \u0074\u1ed3\u006e \u0074\u1ea1\u0069, \u0062\u1ea1\u006e \u0063\u00f3 \u0074\u0068\u1ec3 \u0111\u1ed3\u006e\u0067 \u0062\u1ed9 \u0063\u1ead\u0070 \u006e\u0068\u1ead\u0074.'
        : '\u0110\u00e3 \u006c\u1ea5\u0079 \u0078\u0065\u006d \u0074\u0072\u01b0\u1edb\u0063 \u0074\u1eeb \u004d\u0061\u006e\u0067\u0061\u0044\u0065\u0078.', true);
    } catch (e) {
      console.error(e);
      showToast('\u004c\u1ed7\u0069 \u006b\u1ebf\u0074 \u006e\u1ed1\u0069 \u006b\u0068\u0069 \u0067\u1ecdi \u004d\u0061\u006e\u0067\u0061\u0044\u0065\u0078.', false);
    } finally {
      setMangaDexBusy(false);
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = input?.value.trim() || '';
    if (!value || !mangaDexPreview) {
      showToast('\u0056\u0075\u0069 \u006c\u00f2\u006e\u0067 \u0078\u0065\u006d \u0074\u0072\u01b0\u1edb\u0063 \u0074\u0072\u0075\u0079\u1ec7\u006e \u0074\u0072\u01b0\u1edb\u0063 \u006b\u0068\u0069 \u0111\u1ed3\u006e\u0067 \u0062\u1ed9.', 'warning');
      return;
    }

    setMangaDexBusy(true);
    try {
      const res = await apiFetch(`${API_BASE}/admin/mangadex/import`, {
        method: 'POST',
        body: JSON.stringify({ input: value })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || '\u0110\u1ed3\u006e\u0067 \u0062\u1ed9 \u004d\u0061\u006e\u0067\u0061\u0044\u0065\u0078 \u0074\u0068\u1ea5\u0074 \u0062\u1ea1\u0069.', false);
        return;
      }

      showToast(`${data.message || '\u0110\u1ed3\u006e\u0067 \u0062\u1ed9 \u0074\u0068\u00e0\u006e\u0068 \u0063\u00f4\u006e\u0067.'} (${data.chapterCount || 0} chương)`, true);
      await loadAdminData();
      if (data.mangaId) window.location.href = `/manga/${data.mangaId}`;
    } catch (e) {
      console.error(e);
      showToast('\u004c\u1ed7\u0069 \u006b\u1ebf\u0074 \u006e\u1ed1\u0069 \u006b\u0068\u0069 \u0111\u1ed3\u006e\u0067 \u0062\u1ed9.', false);
    } finally {
      setMangaDexBusy(false);
    }
  });
}

function setMangaDexBusy(isBusy) {
  const previewBtn = document.getElementById('btn-mangadex-preview');
  const importBtn = document.getElementById('btn-mangadex-import');
  if (previewBtn) {
    previewBtn.disabled = isBusy;
    previewBtn.style.opacity = isBusy ? '0.65' : '1';
  }
  if (importBtn) {
    importBtn.style.opacity = isBusy ? '0.65' : '1';
  }
}

function renderMangaDexPreview(data) {
  const panel = document.getElementById('mangadex-preview-panel');
  if (!panel) return;
  if (!data) {
    panel.style.display = 'none';
    panel.innerHTML = '';
    return;
  }

  const tagBadge = tag => `<span class="badge" style="background:rgba(255,255,255,.08);color:white;">${escapeAdminHtml(tag.name)}</span>`;
  const genres = (data.tags || []).filter(tag => String(tag.group).toLowerCase() === 'genre').map(tagBadge).join('');
  const themes = (data.tags || []).filter(tag => String(tag.group).toLowerCase() === 'theme').map(tagBadge).join('');
  const authors = (data.authors || []).map(a => escapeAdminHtml(a.name)).join(', ') || '\u0110\u0061\u006e\u0067 \u0063\u1ead\u0070 \u006e\u0068\u1ead\u0074';

  panel.style.display = 'block';
  panel.innerHTML = `
    <div style="display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 18px; padding: 18px;">
      <img src="${escapeAdminHtml(data.coverUrl || '')}" alt="${escapeAdminHtml(data.title || '')}" style="width: 130px; height: 185px; object-fit: cover; border-radius: 6px; background: rgba(255,255,255,0.06);" />
      <div style="min-width: 0;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
          <h4 style="font-size: 1.15rem; line-height: 1.3; font-weight: 800; color: white; margin: 0;">${escapeAdminHtml(data.title || '')}</h4>
          ${data.exists ? '<span class="badge" style="background: rgba(255,140,0,0.18); color: #ff8c00;">&#272;&#227; c&#243; trong h&#7879; th&#7889;ng</span>' : ''}
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 10px;">${authors}</p>
        <div style="display:grid;gap:7px;margin-bottom:12px;font-size:.82rem;">
          <div><strong style="color:white;">Genre:</strong> <span style="display:inline-flex;gap:6px;flex-wrap:wrap;">${genres || 'N/A'}</span></div>
          <div><strong style="color:white;">Theme:</strong> <span style="display:inline-flex;gap:6px;flex-wrap:wrap;">${themes || 'N/A'}</span></div>
          <div><strong style="color:white;">Demographic:</strong> ${escapeAdminHtml(data.demographic || 'None')} &nbsp; <strong style="color:white;">Format:</strong> ${escapeAdminHtml(data.format || 'None')}</div>
        </div>
        <p style="color: var(--text-main); font-size: 0.9rem; line-height: 1.55; margin: 0 0 12px; max-height: 90px; overflow: hidden;">${escapeAdminHtml(data.description || '')}</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;color:var(--text-muted);font-size:0.85rem;">
          <span><strong style="color:white;">${data.chapterCount || 0}</strong> ch&#432;&#417;ng ti&#7871;ng Vi&#7879;t</span>
          <span>N&#259;m: <strong style="color:white;">${data.releaseYear || 'N/A'}</strong></span>
          <span>Ngu&#7891;n: <strong style="color:white;">MangaDex</strong></span>
        </div>
      </div>
    </div>
  `;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function escapeAdminHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[ch]));
}
