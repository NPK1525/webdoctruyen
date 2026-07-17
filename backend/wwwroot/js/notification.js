// Notification state
let notifications = [];
let unreadCount = 0;
let isNotificationDropdownOpen = false;

document.addEventListener('DOMContentLoaded', () => {
  initNotifications();
});

function initNotifications() {
  // Notification bell click
  document.getElementById('notification-bell')?.addEventListener('click', toggleNotificationDropdown);

  // Mark all read button
  document.getElementById('mark-all-read-btn')?.addEventListener('click', markAllAsRead);

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const bell = document.getElementById('notification-bell');
    const dropdown = document.getElementById('notification-dropdown');

    if (isNotificationDropdownOpen && !bell?.contains(e.target) && !dropdown?.contains(e.target)) {
      closeNotificationDropdown();
    }
  });

  // Load notifications when user is logged in
  if (currentUser) {
    loadNotifications();
  }
}

async function loadNotifications() {
  if (!currentUser) return;

  try {
    const res = await apiFetch(`${API_BASE}/notifications`);
    if (res.ok) {
      const data = await res.json();
      notifications = data.notifications || [];
      unreadCount = data.unreadCount || 0;
      renderNotifications();
      updateNotificationBadge();
    }
  } catch (e) {
    console.error('Error loading notifications:', e);
  }
}

function renderNotifications() {
  const list = document.getElementById('notification-list');
  if (!list) return;

  if (notifications.length === 0) {
    list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.85rem;">' + t('notification.noNotifications', 'Không có thông báo') + '</div>';
    return;
  }

  list.innerHTML = notifications.map(n => `
    <div class="notification-item ${n.isRead ? 'read' : 'unread'}"
         style="padding: 10px; border-radius: 6px; cursor: pointer; transition: background-color 0.15s; ${n.isRead ? 'opacity: 0.6;' : 'background-color: rgba(255, 69, 82, 0.08);'}"
         data-id="${n.id}">
      <div style="display: flex; gap: 10px;">
        <div style="flex: 1;">
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-bright); margin-bottom: 4px;">${escapeHtml(n.title)}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">${escapeHtml(n.message)}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 6px;">${formatTime(n.createdAt)}</div>
        </div>
        ${!n.isRead ? '<div style="width: 8px; height: 8px; background-color: #FF4552; border-radius: 50%; flex-shrink: 0; margin-top: 4px;"></div>' : ''}
      </div>
    </div>
  `).join('');

  // Add click handlers to notification items
  list.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.id);
      handleNotificationClick(id);
    });
  });
}

function updateNotificationBadge() {
  const badge = document.getElementById('notification-badge');
  if (!badge) return;

  if (unreadCount > 0) {
    badge.style.display = 'flex';
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
  } else {
    badge.style.display = 'none';
  }
}

function toggleNotificationDropdown() {
  const dropdown = document.getElementById('notification-dropdown');
  if (!dropdown) return;

  isNotificationDropdownOpen = !isNotificationDropdownOpen;
  dropdown.style.display = isNotificationDropdownOpen ? 'block' : 'none';

  if (isNotificationDropdownOpen) {
    // Load fresh notifications when opening
    loadNotifications();
  }
}

function closeNotificationDropdown() {
  const dropdown = document.getElementById('notification-dropdown');
  if (!dropdown) return;

  isNotificationDropdownOpen = false;
  dropdown.style.display = 'none';
}

async function handleNotificationClick(id) {
  // Mark as read
  await markAsRead(id);

  // Navigate if link exists
  const notification = notifications.find(n => n.id === id);
  if (notification?.link) {
    window.location.href = notification.link;
  }

  closeNotificationDropdown();
}

async function markAsRead(id) {
  try {
    const res = await apiFetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'POST'
    });
    if (res.ok) {
      // Update local state
      const notification = notifications.find(n => n.id === id);
      if (notification) {
        notification.isRead = true;
        unreadCount = Math.max(0, unreadCount - 1);
        renderNotifications();
        updateNotificationBadge();
      }
    }
  } catch (e) {
    console.error('Error marking notification as read:', e);
  }
}

async function markAllAsRead() {
  try {
    const res = await apiFetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST'
    });
    if (res.ok) {
      // Update local state
      notifications.forEach(n => n.isRead = true);
      unreadCount = 0;
      renderNotifications();
      updateNotificationBadge();
    }
  } catch (e) {
    console.error('Error marking all as read:', e);
  }
}

function formatTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('notification.justNow', 'Vừa xong');
  if (diffMins < 60) return `${diffMins} ${t('notification.minutesAgo', 'phút trước')}`;
  if (diffHours < 24) return `${diffHours} ${t('notification.hoursAgo', 'giờ trước')}`;
  if (diffDays < 7) return `${diffDays} ${t('notification.daysAgo', 'ngày trước')}`;

  return date.toLocaleDateString('vi-VN');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Update notifications when user logs in/out
const originalRenderHeaderUserArea = renderHeaderUserArea;
if (typeof originalRenderHeaderUserArea === 'function') {
  window.renderHeaderUserArea = function() {
    originalRenderHeaderUserArea();

    // Re-init notification handlers
    document.getElementById('notification-bell')?.addEventListener('click', toggleNotificationDropdown);
    document.getElementById('mark-all-read-btn')?.addEventListener('click', markAllAsRead);

    if (currentUser) {
      loadNotifications();
    } else {
      notifications = [];
      unreadCount = 0;
      updateNotificationBadge();
    }
  };
}

// Periodically check for new notifications (every 30 seconds)
setInterval(() => {
  if (currentUser) {
    loadNotifications();
  }
}, 30000);
