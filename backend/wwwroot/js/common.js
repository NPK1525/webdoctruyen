// API Base URL config
const API_BASE = '/api';
const MOCK_WHITE_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800'><rect width='600' height='800' fill='white'/></svg>";

// State management
let currentUser = null;
let isSidebarOpen = false;
let isUserMenuOpen = false;

// Initialize common page controls
document.addEventListener('DOMContentLoaded', () => {
  initUserSession();
  initSidebar();
  initAuthModals();
  initHeaderSearch();
  initHeaderScroll();
  
  // Render User Area in Header & Footer
  renderHeaderUserArea();
  renderSidebarFooterArea();
  
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

// Parse user session
function initUserSession() {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      currentUser = JSON.parse(userStr);
    } catch (e) {
      console.error("Error parsing user session:", e);
      localStorage.removeItem('user');
    }
  }
}

// Sidebar logic
function initSidebar() {
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const closeBtn = document.getElementById('sidebar-close-btn');
  const overlay = document.getElementById('sidebar-drawer-overlay');
  
  if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
  if (closeBtn) closeBtn.addEventListener('click', toggleSidebar);
  if (overlay) overlay.addEventListener('click', toggleSidebar);

  // Restore sidebar state from sessionStorage
  const savedState = sessionStorage.getItem('sidebarOpen');
  if (savedState === 'true') {
    isSidebarOpen = true;
    document.body.classList.add('sidebar-open');
  }

  // Logo buttons
  const headerLogo = document.getElementById('logo-btn');
  if (headerLogo) {
    headerLogo.addEventListener('click', () => {
      window.location.href = '/';
    });
  }

  const sidebarLogo = document.getElementById('sidebar-logo');
  if (sidebarLogo) {
    sidebarLogo.addEventListener('click', () => {
      window.location.href = '/';
    });
  }

  // Sidebar navigation routes
  document.getElementById('nav-home-btn')?.addEventListener('click', () => {
    window.location.href = '/';
  });
  
  document.getElementById('nav-admin-btn')?.addEventListener('click', () => {
    window.location.href = '/admin';
  });

  document.getElementById('nav-bookmarks-btn')?.addEventListener('click', () => {
    alert("Tính năng đang phát triển!");
  });

  document.getElementById('nav-info-btn')?.addEventListener('click', () => {
    alert("MangaNPK - Ứng dụng đọc truyện tranh trực tuyến chất lượng cao.");
  });

  // Admin button visibility check
  const adminBtn = document.getElementById('nav-admin-btn');
  if (adminBtn) {
    adminBtn.style.display = (currentUser && currentUser.role === 'Admin') ? 'flex' : 'none';
  }
}

function toggleSidebar() {
  isSidebarOpen = !isSidebarOpen;
  const overlay = document.getElementById('sidebar-drawer-overlay');
  const drawer = document.getElementById('sidebar-drawer');
  
  if (drawer) {
    if (isSidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
  }

  // Persist sidebar state across page navigations
  sessionStorage.setItem('sidebarOpen', isSidebarOpen);

  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
  }
}

// User Header UI render
function renderHeaderUserArea() {
  const area = document.getElementById('header-user-area');
  if (!area) return;

  if (currentUser) {
    area.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; position: relative;">
        <!-- Clickable Avatar -->
        <div id="header-avatar" style="width: 36px; height: 36px; border-radius: 50%; background-color: #2F333B; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid #FF8C00; color: white; transition: all 0.2s;" title="Tài khoản">
          <i data-lucide="user" style="width: 18px; height: 18px;"></i>
        </div>

        <!-- Dropdown Menu -->
        <div id="header-user-dropdown" style="display: none; position: absolute; top: 48px; right: 0; width: 220px; background-color: #151A22; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px 0; overflow: hidden;">
          ${currentUser.username && currentUser.username !== 'undefined' ? `
            <div style="padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 2px;">
              <span style="font-size: 0.85rem; font-weight: 700; color: white;">${currentUser.username}</span>
              ${currentUser.role === 'Admin' ? `<span style="font-size: 0.75rem; color: var(--text-muted);">Quản trị viên</span>` : ''}
            </div>
          ` : ''}
          ${currentUser.role === 'Admin' ? `
            <a href="/admin" style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; font-size: 0.85rem; text-align: left; color: white; text-decoration: none;" class="dropdown-item-link">
              <i data-lucide="settings" style="width: 16px; height: 16px;"></i>
              <span>Bảng Quản Trị</span>
            </a>
          ` : ''}
          <button id="hdr-logout-btn" style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; width: 100%; font-size: 0.85rem; text-align: left; color: #FF4552; cursor: pointer; background: none; border: none;">
            <i data-lucide="log-out" style="width: 16px; height: 16px;"></i>
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    `;

    // Dropdown toggle event
    const avatar = document.getElementById('header-avatar');
    const dropdown = document.getElementById('header-user-dropdown');
    
    avatar.addEventListener('click', (e) => {
      e.stopPropagation();
      isUserMenuOpen = !isUserMenuOpen;
      dropdown.style.display = isUserMenuOpen ? 'block' : 'none';
    });

    document.addEventListener('click', () => {
      isUserMenuOpen = false;
      if (dropdown) dropdown.style.display = 'none';
    });

    document.getElementById('hdr-logout-btn')?.addEventListener('click', handleLogout);
    
  } else {
    area.innerHTML = `
      <button id="header-login-btn" class="btn btn-secondary" style="border-radius: 20px; font-weight: 700; padding: 6px 16px; font-size: 0.85rem;">
        Đăng Nhập
      </button>
      <button id="header-register-btn" class="btn btn-primary" style="border-radius: 20px; font-weight: 700; padding: 6px 16px; font-size: 0.85rem; background-color: #FF4552; border: none; color: white;">
        Đăng Ký
      </button>
    `;
    
    document.getElementById('header-login-btn')?.addEventListener('click', () => {
      openAuthModal('login');
    });
    
    document.getElementById('header-register-btn')?.addEventListener('click', () => {
      openAuthModal('register');
    });
  }
  
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Sidebar footer UI render
function renderSidebarFooterArea() {
  const footerArea = document.getElementById('sidebar-footer-area');
  if (!footerArea) return;

  footerArea.innerHTML = `
    <div class="sidebar-footer-info" style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
      <!-- Social links -->
      <div class="sidebar-social-row">
        <a class="sidebar-social-link" href="#"><i data-lucide="twitter" style="width: 16px; height: 16px;"></i></a>
        <a class="sidebar-social-link" href="#"><i data-lucide="instagram" style="width: 16px; height: 16px;"></i></a>
        <a class="sidebar-social-link" href="#"><i data-lucide="discord" style="width: 16px; height: 16px;"></i></a>
      </div>
      
      <!-- Copyright text -->
      <div class="sidebar-copyright-text">
        v2026.6.3<br>
        © MangaNPK 2026<br>
        <a href="#" style="text-decoration: underline; color: #ffffff !important;">Điều khoản & Chính sách</a>
      </div>

      <!-- Payment icons at the very bottom -->
      <div class="sidebar-payment-row">
        <!-- Visa Inline SVG Logo -->
        <svg class="sidebar-payment-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="height: 12px; width: auto; fill: currentColor; opacity: 0.5;">
          <path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z"/>
        </svg>
        <img class="sidebar-payment-icon" src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Mastercard_2019_logo.svg" alt="Mastercard" />
        <img class="sidebar-payment-icon" src="https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg" alt="Amex" />
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Header search bar global binding
function initHeaderSearch() {
  const searchInput = document.getElementById('header-search-input');
  if (!searchInput) return;

  // Read search query from URL on load and set value
  const params = new URLSearchParams(window.location.search);
  const searchQ = params.get('search');
  if (searchQ && searchInput) {
    searchInput.value = searchQ;
  }

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = searchInput.value.trim();
      const currentPath = window.location.pathname;
      
      if (currentPath.endsWith('index.html') || currentPath === '/' || currentPath.indexOf('.html') === -1) {
        // If we are already on home page, trigger standard filter instead of redirecting
        if (typeof onHomeSearchTriggered === 'function') {
          onHomeSearchTriggered(q);
        } else {
          window.location.href = `/?search=${encodeURIComponent(q)}`;
        }
      } else {
        // Redirect to homepage search query
        window.location.href = `/?search=${encodeURIComponent(q)}`;
      }
    }
  });

  // Global keypress Ctrl+K to focus search input
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
  });
}

// User Actions
function handleLogout() {
  localStorage.removeItem('user');
  currentUser = null;
  alert("Bạn đã đăng xuất thành công!");
  window.location.reload();
}

// Auth Modals logic
function initAuthModals() {
  const modal = document.getElementById('auth-modal');
  const closeBtn = document.getElementById('auth-modal-close');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
  
  if (modal) {
    modal.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  // Swap login/register tabs
  document.getElementById('switch-to-register')?.addEventListener('click', () => {
    switchAuthView('register');
  });
  
  document.getElementById('switch-to-login')?.addEventListener('click', () => {
    switchAuthView('login');
  });

  // Form submit: Login
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errMsg = document.getElementById('login-error-message');

    if (errMsg) errMsg.style.display = 'none';

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('user', JSON.stringify({
          username: data.username,
          role: data.role,
          token: data.token // If token is provided by server
        }));
        
        modal.style.display = 'none';
        window.location.reload();
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (errMsg) {
          errMsg.querySelector('.msg-txt').textContent = errorData.message || 'Tài khoản hoặc mật khẩu không chính xác.';
          errMsg.style.display = 'flex';
        }
      }
    } catch (err) {
      console.error(err);
      if (errMsg) {
        errMsg.querySelector('.msg-txt').textContent = 'Lỗi kết nối máy chủ.';
        errMsg.style.display = 'flex';
      }
    }
  });

  // Form submit: Register
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const errMsg = document.getElementById('register-error-message');

    if (errMsg) errMsg.style.display = 'none';

    if (password !== confirmPassword) {
      if (errMsg) {
        errMsg.querySelector('.msg-txt').textContent = 'Mật khẩu xác nhận không khớp.';
        errMsg.style.display = 'flex';
      }
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        alert("Đăng ký tài khoản thành công! Hãy đăng nhập.");
        switchAuthView('login');
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (errMsg) {
          errMsg.querySelector('.msg-txt').textContent = errorData.message || 'Đăng ký không thành công.';
          errMsg.style.display = 'flex';
        }
      }
    } catch (err) {
      console.error(err);
      if (errMsg) {
        errMsg.querySelector('.msg-txt').textContent = 'Lỗi kết nối máy chủ.';
        errMsg.style.display = 'flex';
      }
    }
  });
}

function openAuthModal(viewMode = 'login') {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  
  modal.style.display = 'flex';
  switchAuthView(viewMode);
}

function switchAuthView(viewMode) {
  const loginView = document.getElementById('auth-modal-login-view');
  const registerView = document.getElementById('auth-modal-register-view');
  
  if (viewMode === 'login') {
    if (loginView) loginView.style.display = 'block';
    if (registerView) registerView.style.display = 'none';
  } else {
    if (loginView) loginView.style.display = 'none';
    if (registerView) registerView.style.display = 'block';
  }
}

function initHeaderScroll() {
  const header = document.getElementById('global-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 10) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  handleScroll();
  window.addEventListener('scroll', handleScroll);
}
