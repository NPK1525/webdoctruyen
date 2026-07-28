(() => {
  const userId = Number(document.body.dataset.adminUserId);
  let user = null;

  const byId = id => document.getElementById(id);
  const safeImage = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : '/img/dragon_ball.png';
    } catch {
      return '/img/dragon_ball.png';
    }
  };

  function showMessage(message, success) {
    const element = byId('admin-user-detail-message');
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('success', success);
    element.hidden = false;
  }

  function render() {
    if (!user) return;
    byId('admin-user-detail-username').value = user.username || '';
    byId('admin-user-detail-email').value = user.email || '';
    byId('admin-user-detail-role').value = user.role || 'User';
    byId('admin-user-detail-avatar').value = user.avatarUrl || '';
    byId('admin-user-detail-badge').value = user.badge || '';
    byId('admin-user-detail-bio').value = user.bio || '';
    byId('admin-user-detail-name').textContent = user.username || '';
    byId('admin-user-detail-email-preview').textContent = user.email || '';
    byId('admin-user-detail-avatar-preview').src = safeImage(user.avatarUrl);

    const status = byId('admin-user-detail-status');
    status.textContent = user.isLocked ? t('admin.locked', 'Đã khóa') : t('admin.active', 'Hoạt động');
    status.classList.toggle('locked', Boolean(user.isLocked));

    const lockButton = byId('admin-user-detail-lock');
    lockButton.textContent = user.isLocked ? t('admin.unlock', 'Mở khóa tài khoản') : t('admin.lock', 'Khóa tài khoản');
    lockButton.disabled = Boolean(user.isCurrentUser);
  }

  async function load() {
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${userId}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || t('admin.loadUserError', 'Không thể tải thông tin người dùng.'));
      user = payload;
      render();
    } catch (error) {
      showMessage(error.message, false);
      byId('admin-user-detail-form').hidden = true;
    }
  }

  async function save(event) {
    event.preventDefault();
    const button = byId('admin-user-detail-save');
    button.disabled = true;
    const body = {
      username: byId('admin-user-detail-username').value.trim(),
      email: byId('admin-user-detail-email').value.trim(),
      role: byId('admin-user-detail-role').value,
      avatarUrl: byId('admin-user-detail-avatar').value.trim(),
      badge: byId('admin-user-detail-badge').value.trim(),
      bio: byId('admin-user-detail-bio').value.trim()
    };

    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || t('admin.updateUserError', 'Không thể cập nhật người dùng.'));
      user = payload;
      render();
      showMessage(t('admin.saveUserSuccess', 'Đã lưu thông tin người dùng.'), true);
    } catch (error) {
      showMessage(error.message, false);
    } finally {
      button.disabled = false;
    }
  }

  async function toggleLock() {
    if (!user || user.isCurrentUser) return;
    const nextLocked = !user.isLocked;
    if (!confirm(nextLocked
      ? t('admin.confirmLock', 'Khóa tài khoản này?')
      : t('admin.confirmUnlock', 'Mở khóa tài khoản này?'))) return;
    const button = byId('admin-user-detail-lock');
    button.disabled = true;
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${userId}/lock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: nextLocked })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || t('admin.updateAccountStatusError', 'Không thể cập nhật trạng thái tài khoản.'));
      user = payload;
      render();
      showMessage(nextLocked
        ? t('admin.lockSuccess', 'Đã khóa tài khoản.')
        : t('admin.unlockSuccess', 'Đã mở khóa tài khoản.'), true);
    } catch (error) {
      showMessage(error.message, false);
      button.disabled = false;
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    const newPassword = byId('admin-user-new-password').value;
    const confirmPassword = byId('admin-user-confirm-password').value;

    if (newPassword !== confirmPassword) {
      showMessage(t('admin.passwordMismatch', 'Mật khẩu xác nhận không khớp.'), false);
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      showMessage(t('admin.passwordPolicy', 'Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ và số.'), false);
      return;
    }

    const button = byId('admin-user-password-save');
    button.disabled = true;
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, confirmPassword })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || t('admin.resetPasswordError', 'Không thể đặt lại mật khẩu người dùng.'));
      byId('admin-user-password-form').reset();
      showMessage(payload.message || t('admin.resetPasswordSuccess', 'Đã đặt lại mật khẩu người dùng.'), true);
    } catch (error) {
      showMessage(error.message, false);
    } finally {
      button.disabled = false;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    byId('admin-user-detail-form')?.addEventListener('submit', save);
    byId('admin-user-password-form')?.addEventListener('submit', resetPassword);
    byId('admin-user-detail-lock')?.addEventListener('click', toggleLock);
    window.addEventListener('manganpk:localechanged', render);
    load();
  });
})();
