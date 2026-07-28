(() => {
  const state = {
    initialized: false,
    loaded: false,
    loading: false,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    timer: null
  };

  const getValue = id => document.getElementById(id)?.value.trim() || '';
  const escape = value => window.adminEscapeHtml
    ? window.adminEscapeHtml(value)
    : String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  const safeImage = value => /^(https?:\/\/|\/)/i.test(String(value || ''))
    ? value
    : '/img/dragon_ball.png';

  function renderRows(users) {
    const root = document.getElementById('admin-user-list');
    if (!root) return;
    if (!users.length) {
      root.innerHTML = '<div class="management-empty">Không tìm thấy người dùng phù hợp.</div>';
      return;
    }

    root.innerHTML = users.map(user => {
      const current = Boolean(user.isCurrentUser);
      const locked = Boolean(user.isLocked);
      return `<div class="admin-user-row" data-user-row="${user.id}">
        <div class="admin-user-identity">
          <img class="admin-user-avatar" src="${escape(safeImage(user.avatarUrl))}" alt="">
          <strong>${escape(user.username)}</strong>
        </div>
        <span class="admin-user-email">${escape(user.email)}</span>
        <span class="admin-user-badge">${escape(user.role)}</span>
        <span class="admin-user-badge ${locked ? 'locked' : ''}">${locked ? 'Đã khóa' : 'Hoạt động'}</span>
        <div class="admin-user-actions">
          <a class="btn btn-secondary" href="/admin/users/${user.id}">Xem / Chỉnh sửa</a>
          <button type="button" class="btn ${locked ? 'btn-secondary' : 'btn-primary'}"
            data-user-toggle-lock="${user.id}" ${current ? 'disabled' : ''}>
            ${locked ? 'Mở khóa' : 'Khóa'}
          </button>
        </div>
      </div>`;
    }).join('');

    root.querySelectorAll('[data-user-toggle-lock]').forEach(button => {
      button.addEventListener('click', () => updateLock(Number(button.dataset.userToggleLock), button));
    });
  }

  function renderSummary(total) {
    const summary = document.getElementById('admin-user-summary');
    if (summary) {
      summary.textContent = `${total} người dùng · Trang ${state.page}/${Math.max(state.totalPages, 1)}`;
    }
  }

  function renderPagination() {
    const root = document.getElementById('admin-user-pagination');
    if (!root) return;
    if (state.totalPages <= 1) {
      root.innerHTML = '';
      return;
    }

    const start = Math.max(1, state.page - 2);
    const end = Math.min(state.totalPages, state.page + 2);
    const buttons = [
      `<button type="button" data-user-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>‹</button>`
    ];
    for (let page = start; page <= end; page += 1) {
      buttons.push(`<button type="button" data-user-page="${page}" class="${page === state.page ? 'active' : ''}">${page}</button>`);
    }
    buttons.push(`<button type="button" data-user-page="${state.page + 1}" ${state.page === state.totalPages ? 'disabled' : ''}>›</button>`);
    root.innerHTML = buttons.join('');
    root.querySelectorAll('[data-user-page]').forEach(button => {
      button.addEventListener('click', () => {
        const page = Number(button.dataset.userPage);
        if (page >= 1 && page <= state.totalPages && page !== state.page) {
          state.page = page;
          load();
        }
      });
    });
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    const root = document.getElementById('admin-user-list');
    if (root) root.innerHTML = '<div class="management-empty">Đang tải người dùng...</div>';
    const params = new URLSearchParams({
      page: String(state.page),
      pageSize: String(state.pageSize),
      search: getValue('admin-user-search'),
      role: getValue('admin-user-role'),
      status: getValue('admin-user-status')
    });
    [...params.keys()].forEach(key => {
      if (!params.get(key)) params.delete(key);
    });

    try {
      const response = await apiFetch(`${API_BASE}/admin/users?${params}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể tải danh sách người dùng.');
      }
      state.loaded = true;
      state.page = payload.page || 1;
      state.totalPages = payload.totalPages || 1;
      renderRows(payload.items || []);
      renderSummary(payload.totalItems || 0);
      renderPagination();
    } catch (error) {
      if (root) root.innerHTML = `<div class="management-empty">${escape(error.message)}</div>`;
      showToast(error.message, false);
    } finally {
      state.loading = false;
    }
  }

  async function updateLock(id, button) {
    const locked = button.textContent.trim() === 'Mở khóa';
    if (!confirm(locked ? 'Mở khóa tài khoản này?' : 'Khóa tài khoản này?')) return;
    button.disabled = true;
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${id}/lock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: !locked })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể cập nhật trạng thái tài khoản.');
      }
      showToast(locked ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.', true);
      await load();
    } catch (error) {
      button.disabled = false;
      showToast(error.message, false);
    }
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;
    document.getElementById('admin-user-search')?.addEventListener('input', () => {
      clearTimeout(state.timer);
      state.timer = setTimeout(() => {
        state.page = 1;
        load();
      }, 250);
    });
    ['admin-user-role', 'admin-user-status'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        state.page = 1;
        load();
      });
    });
    document.getElementById('admin-user-reset')?.addEventListener('click', () => {
      ['admin-user-search', 'admin-user-role', 'admin-user-status'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
      });
      state.page = 1;
      load();
    });
  }

  function activate() {
    if (!state.loaded) load();
  }

  window.AdminUsers = { init, activate };
})();
