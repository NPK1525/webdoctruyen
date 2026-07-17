// Admin manga table and edit actions.

function renderMangasTable() {
  const tbody = document.getElementById('admin-mangas-table-body');
  if (!tbody) return;

  if (mangasList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px 0;">${t('admin.noManga', 'Chưa có truyện nào.')}</td></tr>`;
    return;
  }

  tbody.innerHTML = mangasList.map(m => `
    <tr id="admin-manga-row-${m.id}">
      <td style="padding:12px 8px;"><img src="${m.coverUrl}" alt="${m.title}" style="width:45px;height:60px;object-fit:cover;border-radius:4px;" /></td>
      <td style="padding:12px 8px;font-weight:700;color:white;">${m.title}</td>
      <td style="padding:12px 8px;"><span class="${getTypeBadgeClass(m.type)}">${getTypeLabel(m.type)}</span></td>
      <td style="padding:12px 8px;"><span class="badge" style="background-color:rgba(255,255,255,0.06);color:white;">${getStatusText(m.status)}</span></td>
      <td style="padding:12px 8px;text-align:right;">
        <div style="display:inline-flex;gap:8px;">
          <button class="btn-edit-manga" data-manga-id="${m.id}" style="color:#FF8C00;padding:6px;display:inline-flex;align-items:center;background:none;border:none;cursor:pointer;" title="${t('common.edit', 'Chỉnh sửa')}">
            <i data-lucide="edit" style="width:18px;height:18px;"></i>
          </button>
          <button class="btn-delete-manga" data-manga-id="${m.id}" style="color:#FF4552;padding:6px;display:inline-flex;align-items:center;background:none;border:none;cursor:pointer;" title="${t('common.delete', 'Xoá')}">
            <i data-lucide="trash-2" style="width:18px;height:18px;"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.btn-edit-manga').forEach(btn => {
    btn.onclick = () => loadMangaForEditing(Number(btn.dataset.mangaId));
  });
  document.querySelectorAll('.btn-delete-manga').forEach(btn => {
    btn.onclick = () => deleteManga(Number(btn.dataset.mangaId));
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function loadMangaForEditing(id) {
  try {
    const res = await fetch(`${API_BASE}/manga/${id}`);
    if (!res.ok) { showToast(t('admin.loadMangaError', 'Không thể tải thông tin truyện.'), false); return; }
    const manga = await res.json();
    editingMangaId = id;

    document.getElementById('manga-form-title').value = manga.title || '';
    document.getElementById('manga-form-alt-title').value = manga.alternativeTitle || '';
    document.getElementById('manga-form-description').value = manga.description || '';

    const typeVal = typeof manga.type === 'string'
      ? normalizeEnumValue(manga.type, { Manga: 0, Manhwa: 1, Manhua: 2, Webtoon: 3, Comic: 4 })
      : manga.type;
    document.getElementById('manga-form-type').value = typeVal;

    const statusVal = typeof manga.status === 'string'
      ? normalizeEnumValue(manga.status, { Ongoing: 0, Completed: 1, Hiatus: 2, Cancelled: 3 })
      : manga.status;
    document.getElementById('manga-form-status').value = statusVal;

    document.getElementById('manga-form-year').value = manga.releaseYear || '';
    document.getElementById('manga-form-demographic').value = typeof manga.demographic === 'string'
      ? normalizeEnumValue(manga.demographic, { None: 0, Shounen: 1, Shoujo: 2, Seinen: 3, Josei: 4 })
      : (manga.demographic ?? 0);
    document.getElementById('manga-form-format').value = typeof manga.format === 'string'
      ? normalizeEnumValue(manga.format, { None: 0, Adaptation: 1, WebComic: 2, OneShot: 3, Comic: 4, Book: 5 })
      : (manga.format ?? 0);
    document.getElementById('manga-form-demographic').dispatchEvent(new Event('change'));
    document.getElementById('manga-form-format').dispatchEvent(new Event('change'));
    document.getElementById('manga-form-cover').value = manga.coverUrl || '';
    const warnings = String(manga.contentWarnings || '').split(',').map(value => value.trim());
    document.querySelectorAll('input[name="manga-content-warning"]').forEach(cb => {
      cb.checked = warnings.includes(cb.value);
    });

    const checkedIds = (manga.genres || []).map(g => g.id);
    document.querySelectorAll('input[name="manga-genres"]').forEach(cb => {
      cb.checked = checkedIds.includes(Number(cb.value));
    });
    const checkedThemeIds = (manga.themes || []).map(theme => theme.id);
    document.querySelectorAll('input[name="manga-themes"]').forEach(cb => {
      cb.checked = checkedThemeIds.includes(Number(cb.value));
    });

    selectedAdminMangaAuthors = (manga.authors || []).map(a => ({ authorId: a.id, role: a.role, name: a.name }));
    renderMangaFormAuthorsList();

    document.getElementById('btn-cancel-manga-form').style.display = 'inline-flex';
    document.getElementById('manga-form-header-title').textContent = t('admin.editing', 'Chỉnh sửa') + `: ${manga.title}`;
    document.getElementById('tab-label-manga-form').textContent = t('admin.editManga', 'Chỉnh sửa truyện');
    switchTab('manga');
  } catch (e) { console.error(e); showToast(t('admin.connectionError', 'Lỗi kết nối.'), false); }
}

function resetMangaForm() {
  editingMangaId = null;
  document.getElementById('admin-manga-form').reset();
  document.getElementById('manga-form-demographic').dispatchEvent(new Event('change'));
  document.getElementById('manga-form-format').dispatchEvent(new Event('change'));
  document.querySelectorAll('input[name="manga-genres"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('input[name="manga-themes"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('input[name="manga-content-warning"]').forEach(cb => cb.checked = false);
  selectedAdminMangaAuthors = [];
  renderMangaFormAuthorsList();
  document.getElementById('btn-cancel-manga-form').style.display = 'none';
  document.getElementById('manga-form-header-title').textContent = t('admin.postNewManga', 'Đăng Truyện Tranh Mới');
  document.getElementById('tab-label-manga-form').textContent = t('admin.createManga', 'Đăng truyện mới');
}

async function deleteManga(id) {
  if (!confirm(t('admin.confirmDeleteManga', 'Xoá truyện này và toàn bộ chương liên quan?'))) return;
  try {
    const res = await apiFetch(`${API_BASE}/admin/manga/${id}`, { method: 'DELETE' });
    if (res.ok) { showToast(t('admin.deleteSuccess', 'Xoá thành công!'), true); await loadMangas(); }
    else { showToast(t('admin.deleteServerError', 'Lỗi xoá từ máy chủ.'), false); }
  } catch (e) { showToast(t('admin.connectionError', 'Lỗi kết nối.'), false); }
}

function renderMangaFormAuthorsList() {
  const container = document.getElementById('manga-form-added-authors-list');
  if (!container) return;
  if (selectedAdminMangaAuthors.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:0.8rem;text-align:center;margin:6px 0;">${t('admin.noAuthorsAssigned', 'Chưa gán tác giả.')}</p>`;
    return;
  }
  container.innerHTML = selectedAdminMangaAuthors.map((a, idx) => `
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:0.85rem;background-color:rgba(255,255,255,0.03);padding:6px 12px;border-radius:4px;">
      <span style="color:white;font-weight:600;">${a.name} <span style="color:#FF8C00;font-size:0.75rem;">(${a.role})</span></span>
      <button type="button" class="btn-remove-form-author" data-idx="${idx}" style="color:#FF4552;display:flex;align-items:center;background:none;border:none;cursor:pointer;">
        <i data-lucide="x" style="width:16px;height:16px;"></i>
      </button>
    </div>
  `).join('');
  container.querySelectorAll('.btn-remove-form-author').forEach(btn => {
    btn.onclick = () => { selectedAdminMangaAuthors.splice(Number(btn.dataset.idx), 1); renderMangaFormAuthorsList(); };
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
