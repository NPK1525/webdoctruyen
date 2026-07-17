let userLists = [];
let editingListId = null;
let viewListId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof I18N !== 'undefined') await I18N.init();
  await initUserSession();
  initSidebar();
  initAuthModals();
  initHeaderSearch();
  initHeaderScroll();
  initTheme();
  initLangToggle();
  renderHeaderUserArea();
  renderSidebarFooterArea();

  if (typeof lucide !== 'undefined') lucide.createIcons();

  if (!currentUser) {
    document.getElementById('lists-login-required').style.display = 'block';
    document.getElementById('lists-content').style.display = 'none';
    document.getElementById('lists-login-btn')?.addEventListener('click', () => openAuthModal('login'));
    return;
  }

  document.getElementById('lists-login-required').style.display = 'none';
  document.getElementById('lists-content').style.display = 'block';

  initListUI();
  await loadLists();
});

async function loadLists() {
  try {
    const res = await apiFetch(`${API_BASE}/mangalist`);
    if (res.ok) {
      userLists = await res.json();
      renderLists();
    }
  } catch (e) {
    console.error('Error loading lists:', e);
  }
}

function renderLists() {
  const grid = document.getElementById('lists-grid');
  if (!grid) return;

  if (userLists.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
        <i data-lucide="list" style="width: 36px; height: 36px; margin-bottom: 12px;"></i>
        <p data-i18n="lists.empty">Chưa có danh sách nào.</p>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  grid.innerHTML = userLists.map(list => `
    <div class="glass-card list-card" data-list-id="${list.id}" style="padding: 16px; border-radius: var(--radius-md); cursor: pointer;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-bright); margin: 0;">${escHtml(list.name)}</h4>
        <span style="font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 10px; background-color: ${list.isPublic ? 'rgba(16,185,129,0.15)' : 'rgba(255,69,82,0.15)'}; color: ${list.isPublic ? '#10B981' : '#FF4552'};">
          ${list.isPublic ? t('lists.public', 'Công khai') : t('lists.private', 'Riêng tư')}
        </span>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0 0 8px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
        ${list.description || t('common.noData', 'Không có mô tả.')}
      </p>
      <div style="font-size: 0.75rem; color: var(--text-muted);">
        ${list.itemCount} truyện
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.list-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = Number(card.dataset.listId);
      viewListDetail(id);
    });
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function viewListDetail(id) {
  try {
    const res = await apiFetch(`${API_BASE}/mangalist/${id}`);
    if (!res.ok) return;
    const list = await res.json();

    viewListId = id;
    document.getElementById('lists-grid').style.display = 'none';
    document.getElementById('list-detail-view').style.display = 'block';
    document.getElementById('list-detail-name').textContent = list.name;
    document.getElementById('list-detail-desc').textContent = list.description || t('common.noData', 'Không có mô tả.');

    const visEl = document.getElementById('list-detail-visibility');
    visEl.textContent = list.isPublic ? t('lists.public', 'Công khai') : t('lists.private', 'Riêng tư');
    visEl.style.backgroundColor = list.isPublic ? 'rgba(16,185,129,0.15)' : 'rgba(255,69,82,0.15)';
    visEl.style.color = list.isPublic ? '#10B981' : '#FF4552';

    const itemsGrid = document.getElementById('list-items-grid');
    if (!list.items || list.items.length === 0) {
      itemsGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);" data-i18n="lists.emptyItems">Danh sách này chưa có truyện nào.</div>`;
    } else {
      itemsGrid.innerHTML = list.items.map(item => `
        <a href="/manga/${item.mangaId}" style="text-decoration: none;">
          <div style="border-radius: var(--radius-sm); overflow: hidden; background-color: var(--bg-card); border: 1px solid var(--border-subtle); transition: transform 0.15s;">
            <img src="${item.coverUrl}" alt="${escHtml(item.title)}" style="width: 100%; height: 200px; object-fit: cover;" />
            <div style="padding: 8px;">
              <p style="font-size: 0.8rem; font-weight: 600; color: var(--text-main); margin: 0; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${escHtml(item.title)}</p>
            </div>
          </div>
        </a>
      `).join('');
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (e) {
    console.error(e);
  }
}

function initListUI() {
  // Create list
  document.getElementById('btn-create-list')?.addEventListener('click', () => openListModal());
  document.getElementById('btn-cancel-list')?.addEventListener('click', closeListModal);
  document.getElementById('btn-back-to-lists')?.addEventListener('click', () => {
    viewListId = null;
    document.getElementById('lists-grid').style.display = 'grid';
    document.getElementById('list-detail-view').style.display = 'none';
  });

  // Edit/Delete buttons
  document.getElementById('btn-edit-list')?.addEventListener('click', () => {
    if (viewListId) {
      const list = userLists.find(l => l.id === viewListId);
      if (list) openListModal(list);
    }
  });
  document.getElementById('btn-delete-list')?.addEventListener('click', async () => {
    if (!viewListId) return;
    if (!confirm(t('lists.confirmDelete', 'Bạn có chắc muốn xóa danh sách này?'))) return;
    try {
      const res = await apiFetch(`${API_BASE}/mangalist/${viewListId}`, { method: 'DELETE' });
      if (res.ok) {
        viewListId = null;
        document.getElementById('lists-grid').style.display = 'grid';
        document.getElementById('list-detail-view').style.display = 'none';
        await loadLists();
      } else {
        showToast(t('common.error', 'Không thể xóa danh sách.'), 'error');
      }
    } catch (e) {
      console.error(e);
    }
  });

  // List form submit
  document.getElementById('list-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('list-form-name').value.trim();
    const description = document.getElementById('list-form-desc').value.trim();
    const isPublic = document.getElementById('list-form-public').checked;

    try {
      let res;
      if (editingListId) {
        res = await apiFetch(`${API_BASE}/mangalist/${editingListId}`, {
          method: 'PUT',
          body: JSON.stringify({ name, description, isPublic })
        });
      } else {
        res = await apiFetch(`${API_BASE}/mangalist`, {
          method: 'POST',
          body: JSON.stringify({ name, description, isPublic })
        });
      }

      if (res.ok) {
        closeListModal();
        await loadLists();
      } else {
        showToast(t('common.error', 'Không thể lưu danh sách.'), 'error');
      }
    } catch (e) {
      console.error(e);
      showToast(t('common.error', 'Lỗi kết nối.'), 'error');
    }
  });

  // Close modal on overlay click
  document.getElementById('list-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeListModal();
  });
}

function openListModal(list) {
  editingListId = list?.id || null;
  document.getElementById('list-modal-title').textContent = editingListId
    ? t('lists.editTitle', 'Sửa danh sách')
    : t('lists.createTitle', 'Tạo danh sách mới');
  document.getElementById('list-form-name').value = list?.name || '';
  document.getElementById('list-form-desc').value = list?.description || '';
  document.getElementById('list-form-public').checked = list?.isPublic !== false;
  document.getElementById('list-modal').style.display = 'flex';
}

function closeListModal() {
  editingListId = null;
  document.getElementById('list-modal').style.display = 'none';
  document.getElementById('list-form').reset();
  document.getElementById('list-form-public').checked = true;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
