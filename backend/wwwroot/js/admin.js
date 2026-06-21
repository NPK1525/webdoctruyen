// Admin states
let activeTab = 'manga-list';
let editingMangaId = null;
let selectedAdminMangaAuthors = [];

// Data lists
let authorsList = [];
let genresList = [];
let mangasList = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!currentUser || currentUser.role !== 'Admin') {
    document.getElementById('admin-access-denied').style.display = 'block';
    document.getElementById('admin-panel-wrapper').style.display = 'none';
    return;
  }
  document.getElementById('admin-access-denied').style.display = 'none';
  document.getElementById('admin-panel-wrapper').style.display = 'block';
  initAdminTabs();
  loadAdminData();
  initAdminForms();
});

async function loadAdminData() {
  await loadAuthors();
  await loadGenres();
  await loadMangas();
}

async function loadAuthors() {
  try {
    const res = await fetch(`${API_BASE}/author`);
    if (res.ok) { authorsList = await res.json(); populateAuthorsDropdowns(); }
  } catch (e) { console.error(e); }
}

async function loadGenres() {
  try {
    const res = await fetch(`${API_BASE}/genre`);
    if (res.ok) { genresList = await res.json(); renderGenresCheckboxes(); }
  } catch (e) { console.error(e); }
}

async function loadMangas() {
  try {
    const res = await fetch(`${API_BASE}/manga?pageSize=200`);
    if (res.ok) {
      const data = await res.json();
      mangasList = data.items;
      renderMangasTable();
      populateMangasDropdowns();
    }
  } catch (e) { console.error(e); }
}

function populateAuthorsDropdowns() {
  const select = document.getElementById('manga-form-author-select');
  if (select) {
    select.innerHTML = '<option value="">-- Chọn tác giả --</option>' +
      authorsList.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  }
}

function populateMangasDropdowns() {
  const select = document.getElementById('chapter-form-manga-select');
  if (select) {
    select.innerHTML = '<option value="">-- Chọn truyện tranh --</option>' +
      mangasList.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
  }
}

function renderGenresCheckboxes() {
  const container = document.getElementById('manga-form-genres-checkbox-container');
  if (container) {
    container.innerHTML = genresList.map(g => `
      <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-main); cursor: pointer; user-select: none;">
        <input type="checkbox" name="manga-genres" value="${g.id}" style="width: 16px; height: 16px; accent-color: #FF4552;" />
        <span>${g.name}</span>
      </label>
    `).join('');
  }
}

function getStatusText(status) {
  if (status === 'Ongoing' || status === 0) return 'Đang tiến hành';
  if (status === 'Completed' || status === 1) return 'Đã hoàn thành';
  return 'Tạm ngưng';
}

function getTypeBadgeClass(type) {
  if (type === 'Manga' || type === 0) return 'badge badge-manga';
  if (type === 'Manhwa' || type === 1) return 'badge badge-manhwa';
  return 'badge badge-manhua';
}

function getTypeLabel(type) {
  if (type === 'Manga' || type === 0) return 'Manga';
  if (type === 'Manhwa' || type === 1) return 'Manhwa';
  return 'Manhua';
}

function renderMangasTable() {
  const tbody = document.getElementById('admin-mangas-table-body');
  if (!tbody) return;

  if (mangasList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px 0;">Chưa có truyện nào.</td></tr>`;
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
          <button class="btn-edit-manga" data-manga-id="${m.id}" style="color:#FF8C00;padding:6px;display:inline-flex;align-items:center;background:none;border:none;cursor:pointer;" title="Chỉnh sửa">
            <i data-lucide="edit" style="width:18px;height:18px;"></i>
          </button>
          <button class="btn-delete-manga" data-manga-id="${m.id}" style="color:#FF4552;padding:6px;display:inline-flex;align-items:center;background:none;border:none;cursor:pointer;" title="Xoá">
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
    if (!res.ok) { showToast("Không thể tải thông tin truyện.", false); return; }
    const manga = await res.json();
    editingMangaId = id;

    document.getElementById('manga-form-title').value = manga.title || '';
    document.getElementById('manga-form-alt-title').value = manga.alternativeTitle || '';
    document.getElementById('manga-form-description').value = manga.description || '';

    const typeVal = typeof manga.type === 'string'
      ? (manga.type === 'Manga' ? 0 : manga.type === 'Manhwa' ? 1 : 2)
      : manga.type;
    document.getElementById('manga-form-type').value = typeVal;

    const statusVal = typeof manga.status === 'string'
      ? (manga.status === 'Ongoing' ? 0 : manga.status === 'Completed' ? 1 : 2)
      : manga.status;
    document.getElementById('manga-form-status').value = statusVal;

    document.getElementById('manga-form-year').value = manga.releaseYear || '';
    document.getElementById('manga-form-demographic').value = manga.demographic || 0;
    document.getElementById('manga-form-format').value = manga.format || 0;
    document.getElementById('manga-form-cover').value = manga.coverUrl || '';

    const checkedIds = (manga.genres || []).map(g => g.id);
    document.querySelectorAll('input[name="manga-genres"]').forEach(cb => {
      cb.checked = checkedIds.includes(Number(cb.value));
    });

    selectedAdminMangaAuthors = (manga.authors || []).map(a => ({ authorId: a.id, role: a.role, name: a.name }));
    renderMangaFormAuthorsList();

    document.getElementById('btn-cancel-manga-form').style.display = 'inline-flex';
    document.getElementById('manga-form-header-title').textContent = `Chỉnh sửa: ${manga.title}`;
    document.getElementById('tab-label-manga-form').textContent = "Chỉnh sửa truyện";
    switchTab('manga');
  } catch (e) { console.error(e); showToast("Lỗi kết nối.", false); }
}

function resetMangaForm() {
  editingMangaId = null;
  document.getElementById('admin-manga-form').reset();
  document.querySelectorAll('input[name="manga-genres"]').forEach(cb => cb.checked = false);
  selectedAdminMangaAuthors = [];
  renderMangaFormAuthorsList();
  document.getElementById('btn-cancel-manga-form').style.display = 'none';
  document.getElementById('manga-form-header-title').textContent = "Đăng Truyện Tranh Mới";
  document.getElementById('tab-label-manga-form').textContent = "Đăng truyện mới";
}

async function deleteManga(id) {
  if (!confirm("Xoá truyện này và toàn bộ chương liên quan?")) return;
  try {
    const res = await fetch(`${API_BASE}/admin/manga/${id}`, { method: 'DELETE' });
    if (res.ok) { showToast("Xoá thành công!", true); await loadMangas(); }
    else { showToast("Lỗi xoá từ máy chủ.", false); }
  } catch (e) { showToast("Lỗi kết nối.", false); }
}

function renderMangaFormAuthorsList() {
  const container = document.getElementById('manga-form-added-authors-list');
  if (!container) return;
  if (selectedAdminMangaAuthors.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:0.8rem;text-align:center;margin:6px 0;">Chưa gán tác giả.</p>`;
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

document.getElementById('btn-add-form-author')?.addEventListener('click', () => {
  const select = document.getElementById('manga-form-author-select');
  const roleSelect = document.getElementById('manga-form-author-role');
  if (!select || !roleSelect) return;
  const authorId = Number(select.value);
  if (!authorId) { alert("Vui lòng chọn tác giả!"); return; }
  if (selectedAdminMangaAuthors.some(a => a.authorId === authorId)) { alert("Tác giả đã được thêm!"); return; }
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
        if (confirm("Huỷ bỏ chỉnh sửa hiện tại?")) resetMangaForm();
        else return;
      }
      switchTab(tabName);
    });
  });
  document.getElementById('btn-cancel-manga-form')?.addEventListener('click', () => {
    resetMangaForm(); switchTab('manga-list');
  });
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

function initAdminForms() {
  // Author form
  document.getElementById('admin-author-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('author-form-name').value.trim();
    const biography = document.getElementById('author-form-biography').value.trim();
    try {
      const res = await fetch(`${API_BASE}/admin/author`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, biography })
      });
      if (res.ok) { showToast("Thêm tác giả thành công!", true); document.getElementById('admin-author-form').reset(); await loadAuthors(); }
      else { showToast("Lỗi thêm tác giả.", false); }
    } catch { showToast("Lỗi kết nối.", false); }
  });

  // Genre form
  document.getElementById('admin-genre-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('genre-form-name').value.trim();
    const slug = document.getElementById('genre-form-slug').value.trim();
    try {
      const res = await fetch(`${API_BASE}/admin/genre`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug })
      });
      if (res.ok) { showToast("Thêm thể loại thành công!", true); document.getElementById('admin-genre-form').reset(); await loadGenres(); }
      else { showToast("Lỗi thêm thể loại.", false); }
    } catch { showToast("Lỗi kết nối.", false); }
  });

  // Chapter form
  document.getElementById('admin-chapter-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mangaId = Number(document.getElementById('chapter-form-manga-select').value);
    const chapterNumber = Number(document.getElementById('chapter-form-number').value);
    const title = document.getElementById('chapter-form-title').value.trim();
    const pagesText = document.getElementById('chapter-form-pages').value.trim();

    if (!mangaId) { alert("Vui lòng chọn truyện!"); return; }
    const pageUrls = pagesText.split('\n').map(l => l.trim()).filter(l => l);
    if (pageUrls.length === 0) { alert("Vui lòng thêm ít nhất một trang!"); return; }

    try {
      const res = await fetch(`${API_BASE}/admin/chapter`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mangaId, chapterNumber, title, pageUrls })
      });
      if (res.ok) { showToast("Thêm chương thành công!", true); document.getElementById('admin-chapter-form').reset(); }
      else { showToast("Lỗi thêm chương.", false); }
    } catch { showToast("Lỗi kết nối.", false); }
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
    if (genreIds.length === 0) { alert("Vui lòng chọn ít nhất một thể loại!"); return; }
    if (selectedAdminMangaAuthors.length === 0) { alert("Vui lòng gán ít nhất một tác giả!"); return; }

    const payload = {
      title, alternativeTitle, description, coverUrl,
      type, status, releaseYear, demographic, format,
      genreIds,
      authors: selectedAdminMangaAuthors.map(a => ({ authorId: a.authorId, role: a.role }))
    };

    try {
      let res;
      if (editingMangaId !== null) {
        res = await fetch(`${API_BASE}/admin/manga/${editingMangaId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}/admin/manga`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
      }
      if (res.ok) {
        showToast(editingMangaId ? "Cập nhật thành công!" : "Đăng truyện mới thành công!", true);
        resetMangaForm(); await loadMangas(); switchTab('manga-list');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || "Lỗi lưu truyện.", false);
      }
    } catch { showToast("Lỗi kết nối.", false); }
  });
}

let toastTimeout = null;
function showToast(message, isSuccess = true) {
  const toast = document.getElementById('admin-toast-message');
  if (!toast) return;
  if (toastTimeout) clearTimeout(toastTimeout);
  const succIcon = toast.querySelector('.icon-success');
  const errIcon = toast.querySelector('.icon-error');
  const text = toast.querySelector('.msg-text');
  text.textContent = message;
  if (isSuccess) {
    toast.style.cssText = 'display:flex;padding:12px 16px;border-radius:6px;margin-bottom:24px;font-size:0.85rem;align-items:center;gap:8px;background-color:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#10B981;';
    succIcon.style.display = 'block'; errIcon.style.display = 'none';
  } else {
    toast.style.cssText = 'display:flex;padding:12px 16px;border-radius:6px;margin-bottom:24px;font-size:0.85rem;align-items:center;gap:8px;background-color:rgba(255,69,82,0.15);border:1px solid rgba(255,69,82,0.3);color:#FF4552;';
    succIcon.style.display = 'none'; errIcon.style.display = 'block';
  }
  toastTimeout = setTimeout(() => { toast.style.display = 'none'; }, 4000);
}
