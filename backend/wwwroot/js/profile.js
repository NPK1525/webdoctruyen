// Profile state
let userProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSession();
  initProfile();
});

function initProfile() {
  document.getElementById('profile-login-btn')?.addEventListener('click', () => {
    openAuthModal('login');
  });

  document.getElementById('edit-profile-form')?.addEventListener('submit', handleEditProfile);
  document.getElementById('change-password-form')?.addEventListener('submit', handleChangePassword);

  loadProfile();
}

async function loadProfile() {
  const loading = document.getElementById('profile-loading-spinner');
  const mainContent = document.getElementById('profile-main-content');
  const notLoggedIn = document.getElementById('profile-not-logged-in');

  loading.style.display = 'flex';
  mainContent.style.display = 'none';
  notLoggedIn.style.display = 'none';

  if (!currentUser) {
    loading.style.display = 'none';
    notLoggedIn.style.display = 'block';
    return;
  }

  try {
    const res = await apiFetch(`${API_BASE}/userprofile/me`);
    if (res.ok) {
      userProfile = await res.json();
      renderProfile();
      mainContent.style.display = 'block';
    } else {
      showToast(t('profile.loadError', 'Không thể tải hồ sơ.'), 'error');
      notLoggedIn.style.display = 'block';
    }
  } catch (e) {
    console.error('Error loading profile:', e);
    showToast(t('profile.loadError', 'Lỗi kết nối máy chủ.'), 'error');
    notLoggedIn.style.display = 'block';
  } finally {
    loading.style.display = 'none';
  }
}

function renderProfile() {
  if (!userProfile) return;

  document.getElementById('profile-username').textContent = userProfile.username;
  document.getElementById('profile-role').textContent = userProfile.role || t('role.user', 'User');

  const avatarImg = document.getElementById('profile-avatar');
  const avatarPlaceholder = document.getElementById('profile-avatar-placeholder');
  if (userProfile.avatarUrl) {
    avatarImg.src = userProfile.avatarUrl;
    avatarImg.style.display = 'block';
    avatarPlaceholder.style.display = 'none';
  } else {
    avatarImg.style.display = 'none';
    avatarPlaceholder.style.display = 'flex';
  }

  const badge = document.getElementById('profile-badge');
  if (userProfile.badge) {
    badge.textContent = userProfile.badge;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }

  document.getElementById('stat-library-count').textContent = userProfile.libraryCount || 0;
  document.getElementById('stat-comment-count').textContent = userProfile.commentCount || 0;

  const bio = document.getElementById('profile-bio');
  bio.textContent = userProfile.bio || t('profile.noBio', 'Chưa có giới thiệu.');

  const joinedDate = document.getElementById('profile-joined-date');
  if (userProfile.createdAt) {
    joinedDate.textContent = new Date(userProfile.createdAt).toLocaleDateString('vi-VN');
  }

  document.getElementById('profile-email').value = userProfile.email || '';
  document.getElementById('profile-avatar-url').value = userProfile.avatarUrl || '';
  document.getElementById('profile-badge-input').value = userProfile.badge || '';
  document.getElementById('profile-bio-input').value = userProfile.bio || '';

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function handleEditProfile(e) {
  e.preventDefault();

  if (!currentUser) {
    openAuthModal('login');
    return;
  }

  const email = document.getElementById('profile-email').value.trim();
  const avatarUrl = document.getElementById('profile-avatar-url').value.trim();
  const badge = document.getElementById('profile-badge-input').value.trim();
  const bio = document.getElementById('profile-bio-input').value.trim();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const res = await apiFetch(`${API_BASE}/userprofile/me`, {
      method: 'PUT',
      body: JSON.stringify({
        email: email || null,
        avatarUrl: avatarUrl || null,
        badge: badge || null,
        bio: bio || null
      })
    });

    if (res.ok) {
      const updated = await res.json();
      userProfile = updated;
      renderProfile();
      showToast(t('profile.saveSuccess', 'Đã lưu thay đổi thành công!'), 'success');
    } else {
      const error = await res.json().catch(() => ({}));
      showToast(error.message || t('profile.saveError', 'Không thể lưu thay đổi.'), 'error');
    }
  } catch (e) {
    console.error('Error updating profile:', e);
    showToast(t('profile.saveError', 'Lỗi kết nối máy chủ.'), 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

async function handleChangePassword(e) {
  e.preventDefault();

  if (!currentUser) {
    openAuthModal('login');
    return;
  }

  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (newPassword !== confirmPassword) {
    showToast(t('profile.passwordMismatch', 'Mật khẩu xác nhận không khớp.'), 'warning');
    return;
  }

  // Consistent with backend: min 8 chars + letter + digit
  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    showToast(t('profile.passwordTooShort', 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số.'), 'warning');
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const res = await apiFetch(`${API_BASE}/userprofile/me/password`, {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });

    if (res.ok) {
      showToast(t('profile.passwordSuccess', 'Đổi mật khẩu thành công!'), 'success');
      e.target.reset();
    } else {
      const error = await res.json().catch(() => ({}));
      showToast(error.message || t('profile.passwordError', 'Không thể đổi mật khẩu.'), 'error');
    }
  } catch (e) {
    console.error('Error changing password:', e);
    showToast(t('profile.passwordError', 'Lỗi kết nối máy chủ.'), 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

function onLocaleChanged() {
  renderProfile();
}
