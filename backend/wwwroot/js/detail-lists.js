// Detail page: MDList membership and modal interactions.
function escapeDetailListHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadUserListsForDetail() {
  if (!currentUser) return [];
  try {
    const res = await apiFetch(`${API_BASE}/mangalist`);
    if (res.ok) return await res.json();
  } catch (e) { console.error(e); }
  return [];
}

async function getMangaInListIds() {
  if (!currentUser || !activeMangaId) return [];
  try {
    const res = await apiFetch(`${API_BASE}/mangalist/check/${activeMangaId}`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (e) { console.error(e); }
  return [];
}

function initAddToListButton() {
  const btn = document.getElementById('btn-add-to-list');
  if (!btn) return;

  if (!currentUser) {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = 'inline-flex';
  btn.onclick = openAddToListModal;

  document.getElementById('btn-close-list-modal')?.addEventListener('click', closeAddToListModal);
  document.getElementById('add-to-list-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAddToListModal();
  });

  document.getElementById('btn-create-list-from-detail')?.addEventListener('click', async () => {
    const name = prompt(t('lists.name', 'Tên danh sách:'));
    if (!name || !name.trim()) return;
    try {
      const res = await apiFetch(`${API_BASE}/mangalist`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: '', isPublic: true })
      });
      if (res.ok) {
        await renderAddToListOptions();
      } else {
        showToast(t('common.error', 'Không thể tạo danh sách.'), 'error');
      }
    } catch (e) {
      console.error(e);
      showToast(t('common.error', 'Lỗi kết nối.'), 'error');
    }
  });
}

async function openAddToListModal() {
  const modal = document.getElementById('add-to-list-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  await renderAddToListOptions();
}

function closeAddToListModal() {
  document.getElementById('add-to-list-modal').style.display = 'none';
}

async function renderAddToListOptions() {
  const container = document.getElementById('add-to-list-options');
  if (!container) return;

  const lists = await loadUserListsForDetail();
  const inListIds = await getMangaInListIds();

  if (lists.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 16px 0;" data-i18n="lists.empty">Chưa có danh sách nào.</p>`;
    return;
  }

  container.innerHTML = lists.map(list => {
    const isInList = inListIds.includes(list.id);
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background-color: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid ${isInList ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'};">
        <div>
          <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-bright);">${escapeDetailListHtml(list.name)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${list.itemCount} items</div>
        </div>
        <button class="btn-toggle-list-item" data-list-id="${list.id}" data-in-list="${isInList}" style="padding: 4px 12px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; border: none; cursor: pointer; background-color: ${isInList ? 'rgba(255,69,82,0.15)' : 'rgba(16,185,129,0.15)'}; color: ${isInList ? '#FF4552' : '#10B981'};">
          ${isInList ? t('lists.removeManga', 'Xóa') : t('lists.addManga', 'Thêm')}
        </button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.btn-toggle-list-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      const listId = Number(btn.dataset.listId);
      const isInList = btn.dataset.inList === 'true';
      try {
        let res;
        if (isInList) {
          res = await apiFetch(`${API_BASE}/mangalist/${listId}/items/${activeMangaId}`, { method: 'DELETE' });
        } else {
          res = await apiFetch(`${API_BASE}/mangalist/${listId}/items`, {
            method: 'POST',
            body: JSON.stringify({ mangaId: activeMangaId })
          });
        }
        if (res.ok) {
          await renderAddToListOptions();
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(err.message || t('common.error', 'Lỗi.'), 'error');
        }
      } catch (e) {
        console.error(e);
        showToast(t('common.error', 'Lỗi kết nối.'), 'error');
      }
    });
  });
}
