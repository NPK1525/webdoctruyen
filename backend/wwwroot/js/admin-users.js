(() => {
  const state = {
    initialized: false,
    loaded: false,
    loading: false,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    timer: null,
    drawerUserId: null,
    drawerUser: null,
    drawerTrigger: null
  };

  const byId = id => document.getElementById(id);
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
          <button type="button" class="btn btn-secondary" data-user-edit="${user.id}">Xem / Chỉnh sửa</button>
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
    root.querySelectorAll('[data-user-edit]').forEach(button => {
      button.addEventListener('click', () => openDrawer(Number(button.dataset.userEdit), button));
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

  function showDrawerMessage(message, success = false) {
    const element = byId('admin-user-drawer-message');
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('success', success);
    element.hidden = false;
  }

  function renderDrawer() {
    const user = state.drawerUser;
    if (!user) return;
    for (const [id, value] of Object.entries({
      'admin-user-drawer-username': user.username || '',
      'admin-user-drawer-email': user.email || '',
      'admin-user-drawer-role': user.role || 'User',
      'admin-user-drawer-avatar': user.avatarUrl || '',
      'admin-user-drawer-badge': user.badge || '',
      'admin-user-drawer-bio': user.bio || ''
    })) {
      byId(id).value = value;
    }
    byId('admin-user-drawer-name').textContent = user.username || '';
    byId('admin-user-drawer-email-preview').textContent = user.email || '';
    byId('admin-user-drawer-avatar-preview').src = safeImage(user.avatarUrl);

    const status = byId('admin-user-drawer-status');
    status.textContent = user.isLocked ? 'Đã khóa' : 'Hoạt động';
    status.classList.toggle('locked', Boolean(user.isLocked));

    const lockButton = byId('admin-user-drawer-lock');
    lockButton.textContent = user.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản';
    lockButton.disabled = Boolean(user.isCurrentUser);
  }

  async function openDrawer(userId, trigger) {
    state.drawerUserId = userId;
    state.drawerTrigger = trigger;
    state.drawerUser = null;
    byId('admin-user-drawer-overlay').hidden = false;
    byId('admin-user-drawer-loading').hidden = false;
    byId('admin-user-drawer-content').hidden = true;
    byId('admin-user-drawer-message').hidden = true;
    byId('admin-user-drawer-password-form').reset();
    document.body.classList.add('admin-user-drawer-open');
    byId('admin-user-drawer').focus();

    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${userId}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể tải thông tin người dùng.');
      }
      state.drawerUser = payload;
      renderDrawer();
      byId('admin-user-drawer-loading').hidden = true;
      byId('admin-user-drawer-content').hidden = false;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      byId('admin-user-drawer-loading').hidden = true;
      showDrawerMessage(error.message);
    }
  }

  function closeDrawer() {
    const userId = state.drawerUserId;
    const trigger = state.drawerTrigger;
    byId('admin-user-drawer-overlay').hidden = true;
    document.body.classList.remove('admin-user-drawer-open');
    byId('admin-user-drawer-password-form').reset();
    byId('admin-user-drawer-message').hidden = true;
    state.drawerUserId = null;
    state.drawerUser = null;
    state.drawerTrigger = null;
    const focusTarget = trigger?.isConnected
      ? trigger
      : document.querySelector(`[data-user-edit="${userId}"]`);
    focusTarget?.focus();
  }

  async function saveDrawer(event) {
    event.preventDefault();
    if (!state.drawerUserId) return;
    const button = byId('admin-user-drawer-save');
    button.disabled = true;
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${state.drawerUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: byId('admin-user-drawer-username').value.trim(),
          email: byId('admin-user-drawer-email').value.trim(),
          role: byId('admin-user-drawer-role').value,
          avatarUrl: byId('admin-user-drawer-avatar').value.trim(),
          badge: byId('admin-user-drawer-badge').value.trim(),
          bio: byId('admin-user-drawer-bio').value.trim()
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể cập nhật người dùng.');
      }
      state.drawerUser = payload;
      renderDrawer();
      await load();
      showDrawerMessage('Đã lưu thông tin người dùng.', true);
    } catch (error) {
      showDrawerMessage(error.message);
    } finally {
      button.disabled = false;
    }
  }

  async function toggleDrawerLock() {
    const user = state.drawerUser;
    if (!user || user.isCurrentUser) return;
    const nextLocked = !user.isLocked;
    if (!confirm(nextLocked ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?')) return;
    const button = byId('admin-user-drawer-lock');
    button.disabled = true;
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${state.drawerUserId}/lock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: nextLocked })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể cập nhật trạng thái tài khoản.');
      }
      state.drawerUser = payload;
      renderDrawer();
      await load();
      showDrawerMessage(nextLocked ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.', true);
    } catch (error) {
      showDrawerMessage(error.message);
      button.disabled = false;
    }
  }

  async function resetDrawerPassword(event) {
    event.preventDefault();
    if (!state.drawerUserId) return;
    const newPassword = byId('admin-user-drawer-new-password').value;
    const confirmPassword = byId('admin-user-drawer-confirm-password').value;

    if (newPassword !== confirmPassword) {
      showDrawerMessage('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      showDrawerMessage('Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ và số.');
      return;
    }

    const button = byId('admin-user-drawer-password-save');
    button.disabled = true;
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${state.drawerUserId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, confirmPassword })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể đặt lại mật khẩu người dùng.');
      }
      byId('admin-user-drawer-password-form').reset();
      showDrawerMessage(payload.message || 'Đã đặt lại mật khẩu người dùng.', true);
    } catch (error) {
      showDrawerMessage(error.message);
    } finally {
      button.disabled = false;
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
    byId('admin-user-drawer-close')?.addEventListener('click', closeDrawer);
    byId('admin-user-drawer-overlay')?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeDrawer();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !byId('admin-user-drawer-overlay')?.hidden) closeDrawer();
    });
    byId('admin-user-drawer-form')?.addEventListener('submit', saveDrawer);
    byId('admin-user-drawer-lock')?.addEventListener('click', toggleDrawerLock);
    byId('admin-user-drawer-password-form')?.addEventListener('submit', resetDrawerPassword);
  }

  function activate() {
    if (!state.loaded) load();
  }

  window.AdminUsers = { init, activate };
})();
