(() => {
  const state = {
    initialized: false,
    loaded: false,
    loading: false,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    totalItems: 0,
    lastItems: [],
    timer: null,
    editorUserId: null,
    editorUser: null
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
      root.innerHTML = `<div class="management-empty">${t('admin.noUsers', 'Không tìm thấy người dùng phù hợp.')}</div>`;
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
        <span class="admin-user-badge ${locked ? 'locked' : ''}">${locked ? t('admin.locked', 'Đã khóa') : t('admin.active', 'Hoạt động')}</span>
        <div class="admin-user-actions">
          <button type="button" class="btn btn-secondary" data-user-edit="${user.id}">${t('admin.viewEdit', 'Xem / Chỉnh sửa')}</button>
          <button type="button" class="btn ${locked ? 'btn-secondary' : 'btn-primary'}"
            data-user-toggle-lock="${user.id}" data-user-locked="${locked}" ${current ? 'disabled' : ''}>
            ${locked ? t('admin.unlockShort', 'Mở khóa') : t('admin.lockShort', 'Khóa')}
          </button>
        </div>
      </div>`;
    }).join('');

    root.querySelectorAll('[data-user-toggle-lock]').forEach(button => {
      button.addEventListener('click', () => updateLock(Number(button.dataset.userToggleLock), button));
    });
    root.querySelectorAll('[data-user-edit]').forEach(button => {
      button.addEventListener('click', () => openEditor(Number(button.dataset.userEdit)));
    });
  }

  function renderSummary(total) {
    const summary = document.getElementById('admin-user-summary');
    if (summary) {
      summary.textContent = t('admin.userSummary', '{count} người dùng · Trang {page}/{pages}')
        .replace('{count}', total)
        .replace('{page}', state.page)
        .replace('{pages}', Math.max(state.totalPages, 1));
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
    if (root) root.innerHTML = `<div class="management-empty">${t('admin.loadingUsers', 'Đang tải người dùng...')}</div>`;
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
        throw new Error(payload.message || t('admin.loadUsersError', 'Không thể tải danh sách người dùng.'));
      }
      state.loaded = true;
      state.page = payload.page || 1;
      state.totalPages = payload.totalPages || 1;
      state.lastItems = payload.items || [];
      state.totalItems = payload.totalItems || 0;
      renderRows(state.lastItems);
      renderSummary(state.totalItems);
      renderPagination();
    } catch (error) {
      if (root) root.innerHTML = `<div class="management-empty">${escape(error.message)}</div>`;
      showToast(error.message, false);
    } finally {
      state.loading = false;
    }
  }

  async function updateLock(id, button) {
    const locked = button.dataset.userLocked === 'true';
    if (!confirm(locked
      ? t('admin.confirmUnlock', 'Mở khóa tài khoản này?')
      : t('admin.confirmLock', 'Khóa tài khoản này?'))) return;
    button.disabled = true;
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${id}/lock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: !locked })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || t('admin.updateAccountStatusError', 'Không thể cập nhật trạng thái tài khoản.'));
      }
      showToast(locked
        ? t('admin.unlockSuccess', 'Đã mở khóa tài khoản.')
        : t('admin.lockSuccess', 'Đã khóa tài khoản.'), true);
      await load();
    } catch (error) {
      button.disabled = false;
      showToast(error.message, false);
    }
  }

  function showEditorMessage(message, success = false) {
    const element = byId('admin-user-editor-message');
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('success', success);
    element.hidden = false;
  }

  function renderEditor() {
    const user = state.editorUser;
    if (!user) return;
    for (const [id, value] of Object.entries({
      'admin-user-editor-username': user.username || '',
      'admin-user-editor-email': user.email || '',
      'admin-user-editor-role': user.role || 'User',
      'admin-user-editor-avatar': user.avatarUrl || '',
      'admin-user-editor-badge': user.badge || '',
      'admin-user-editor-bio': user.bio || ''
    })) {
      byId(id).value = value;
    }
    byId('admin-user-editor-name').textContent = user.username || '';
    byId('admin-user-editor-email-preview').textContent = user.email || '';
    byId('admin-user-editor-avatar-preview').src = safeImage(user.avatarUrl);

    const status = byId('admin-user-editor-status');
    status.textContent = user.isLocked ? t('admin.locked', 'Đã khóa') : t('admin.active', 'Hoạt động');
    status.classList.toggle('locked', Boolean(user.isLocked));

    const lockButton = byId('admin-user-editor-lock');
    lockButton.textContent = user.isLocked ? t('admin.unlock', 'Mở khóa tài khoản') : t('admin.lock', 'Khóa tài khoản');
    lockButton.disabled = Boolean(user.isCurrentUser);
  }

  async function openEditor(userId) {
    state.editorUserId = userId;
    state.editorUser = null;
    byId('admin-user-editor-loading').hidden = false;
    byId('admin-user-editor-content').hidden = true;
    byId('admin-user-editor-message').hidden = true;
    byId('admin-user-editor-password-form').reset();

    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${userId}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || t('admin.loadUserError', 'Không thể tải thông tin người dùng.'));
      }
      state.editorUser = payload;
      renderEditor();
      byId('admin-user-editor-loading').hidden = true;
      byId('admin-user-editor-content').hidden = false;
      switchTab('user-edit');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      byId('admin-user-editor-loading').hidden = true;
      showToast(error.message, false);
    }
  }

  function closeEditor() {
    byId('admin-user-editor-password-form').reset();
    byId('admin-user-editor-message').hidden = true;
    state.editorUserId = null;
    state.editorUser = null;
    switchTab('users');
  }

  async function saveEditor(event) {
    event.preventDefault();
    if (!state.editorUserId) return;
    const button = byId('admin-user-editor-save');
    button.disabled = true;
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${state.editorUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: byId('admin-user-editor-username').value.trim(),
          email: byId('admin-user-editor-email').value.trim(),
          role: byId('admin-user-editor-role').value,
          avatarUrl: byId('admin-user-editor-avatar').value.trim(),
          badge: byId('admin-user-editor-badge').value.trim(),
          bio: byId('admin-user-editor-bio').value.trim()
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || t('admin.updateUserError', 'Không thể cập nhật người dùng.'));
      }
      state.editorUser = payload;
      renderEditor();
      await load();
      showEditorMessage(t('admin.saveUserSuccess', 'Đã lưu thông tin người dùng.'), true);
    } catch (error) {
      showEditorMessage(error.message);
    } finally {
      button.disabled = false;
    }
  }

  async function toggleEditorLock() {
    const user = state.editorUser;
    if (!user || user.isCurrentUser) return;
    const nextLocked = !user.isLocked;
    if (!confirm(nextLocked
      ? t('admin.confirmLock', 'Khóa tài khoản này?')
      : t('admin.confirmUnlock', 'Mở khóa tài khoản này?'))) return;
    const button = byId('admin-user-editor-lock');
    button.disabled = true;
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${state.editorUserId}/lock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: nextLocked })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || t('admin.updateAccountStatusError', 'Không thể cập nhật trạng thái tài khoản.'));
      }
      state.editorUser = payload;
      renderEditor();
      await load();
      showEditorMessage(nextLocked
        ? t('admin.lockSuccess', 'Đã khóa tài khoản.')
        : t('admin.unlockSuccess', 'Đã mở khóa tài khoản.'), true);
    } catch (error) {
      showEditorMessage(error.message);
      button.disabled = false;
    }
  }

  async function resetEditorPassword(event) {
    event.preventDefault();
    if (!state.editorUserId) return;
    const newPassword = byId('admin-user-editor-new-password').value;
    const confirmPassword = byId('admin-user-editor-confirm-password').value;

    if (newPassword !== confirmPassword) {
      showEditorMessage(t('admin.passwordMismatch', 'Mật khẩu xác nhận không khớp.'));
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      showEditorMessage(t('admin.passwordPolicy', 'Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ và số.'));
      return;
    }

    const button = byId('admin-user-editor-password-save');
    button.disabled = true;
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${state.editorUserId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, confirmPassword })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || t('admin.resetPasswordError', 'Không thể đặt lại mật khẩu người dùng.'));
      }
      byId('admin-user-editor-password-form').reset();
      showEditorMessage(payload.message || t('admin.resetPasswordSuccess', 'Đã đặt lại mật khẩu người dùng.'), true);
    } catch (error) {
      showEditorMessage(error.message);
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
    byId('admin-user-editor-back')?.addEventListener('click', closeEditor);
    byId('admin-user-editor-form')?.addEventListener('submit', saveEditor);
    byId('admin-user-editor-lock')?.addEventListener('click', toggleEditorLock);
    byId('admin-user-editor-password-form')?.addEventListener('submit', resetEditorPassword);
  }

  function activate() {
    if (!state.loaded) load();
  }

  function refreshLocale() {
    if (state.loaded) {
      renderRows(state.lastItems);
      renderSummary(state.totalItems);
      renderPagination();
    }
    if (state.editorUser) renderEditor();
  }

  window.AdminUsers = { init, activate };
  window.AdminUsers.refreshLocale = refreshLocale;
})();
