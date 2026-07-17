// API Base URL config
const API_BASE = '/api';
const MOCK_WHITE_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800'><rect width='600' height='800' fill='white'/></svg>";

// i18n fallback - prefer loaded translations, then fall back to clean text.
function t(key, defaultValue) {
  if (typeof I18N !== 'undefined' && I18N.strings && Object.prototype.hasOwnProperty.call(I18N.strings, key)) {
    return I18N.strings[key];
  }
  return defaultValue || key;
}

// State management
let currentUser = null;
let isSidebarOpen = false;
let isUserMenuOpen = false;

function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(url, { ...options, credentials: 'same-origin', headers });
}

function waitForSession() {
  return new Promise(resolve => {
    if (window.__sessionReady) return resolve();
    const iv = setInterval(() => {
      if (window.__sessionReady) { clearInterval(iv); resolve(); }
    }, 30);
    setTimeout(() => { clearInterval(iv); resolve(); }, 3000);
  });
}


// Initialize common page controls
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof I18N !== 'undefined') await I18N.init();
  await initUserSession();
  renderUnifiedSidebarDrawer();
  initSidebar();
  initAuthModals();
  initHeaderSearch();
  initHeaderScroll();
  initTheme();
  initLangToggle();

  // Render User Area in Header & Footer
  renderHeaderUserArea();
  renderSidebarFooterArea();
  if (typeof I18N !== 'undefined') I18N.apply();

  window.addEventListener('manganpk:localechanged', () => {
    renderHeaderUserArea();
    renderSidebarFooterArea();
    if (typeof I18N !== 'undefined') I18N.apply();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  });

  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

function renderUnifiedSidebarDrawer() {
  const drawer = document.getElementById('sidebar-drawer');
  if (!drawer) return;
  const useUnifiedSidebar = drawer.dataset && drawer.dataset.useUnifiedSidebar === 'true';
  if (drawer.children.length > 0 && !useUnifiedSidebar) return;

  drawer.innerHTML = `
  <div class="sidebar-header">
    <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;" id="sidebar-logo">
      <div style="width: 30px; height: 30px; border-radius: 6px; background-color: #FF8C00; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="book-open" style="width: 15px; height: 15px; color: white;"></i>
      </div>
      <span style="font-size: 1.12rem; font-weight: 800; color: white;">Manga<span style="color: #FF8C00;">NPK</span></span>
    </div>
    <button id="sidebar-close-btn" style="color: white; cursor: pointer; display: flex; align-items: center; background: none; border: none;" title="${t('common.close', 'Close')}">
      <i data-lucide="x" style="width: 20px; height: 20px;"></i>
    </button>
  </div>
  <div class="sidebar-content-scroll">
    <div class="sidebar-menu-section sidebar-menu-section-tight">
      <button id="nav-home-btn" class="sidebar-sub-item sidebar-main-item">
        <span><i data-lucide="home"></i><span data-i18n="nav.home">Home</span></span>
      </button>
    </div>

    <div class="sidebar-menu-section">
      <div class="sidebar-section-title">
        <span class="sidebar-section-title-left"><i data-lucide="bookmark"></i><span data-i18n="nav.follow">Follows</span></span>
      </div>
      <div class="sidebar-sub-list">
        <button id="nav-updates-btn" class="sidebar-sub-item" data-i18n="nav.updates">Updates</button>
        <button id="nav-library-btn" class="sidebar-sub-item" data-i18n="nav.library">Library</button>
        <button id="nav-lists-btn" class="sidebar-sub-item" data-i18n="nav.mdlists">MDLists</button>
        <button id="nav-history-btn" class="sidebar-sub-item" data-i18n="nav.history">Reading History</button>
      </div>
    </div>

    <div class="sidebar-menu-section">
      <div class="sidebar-section-title">
        <span class="sidebar-section-title-left"><i data-lucide="book-open"></i><span data-i18n="nav.titles">Titles</span></span>
      </div>
      <div class="sidebar-sub-list">
        <button id="nav-advanced-search-btn" class="sidebar-sub-item" data-i18n="nav.advancedSearch">Advanced Search</button>
        <button id="nav-recently-added-btn" class="sidebar-sub-item" data-i18n="nav.recentlyAdded">Recently Added</button>
        <button id="nav-latest-updates-btn" class="sidebar-sub-item" data-i18n="nav.latestUpdates">Latest Updates</button>
        <button class="sidebar-sub-item" onclick="showToast(t('sidebar.feature', 'T\u00ednh n\u0103ng \u0111ang ph\u00e1t tri\u1ec3n!'), 'coming-soon')" data-i18n="sidebar.random">Random</button>
      </div>
    </div>

    <div class="sidebar-menu-section">
      <div class="sidebar-section-title">
        <span class="sidebar-section-title-left"><i data-lucide="pin"></i><span>MangaDex</span></span>
      </div>
      <div class="sidebar-sub-list">
        <button id="nav-info-btn" class="sidebar-sub-item" data-i18n="nav.aboutUs">About Us</button>
        <button class="sidebar-sub-item" onclick="showToast('Li\u00ean h\u1ec7: contact@manganpk.com', 'info')" data-i18n="nav.contact">Contact</button>
      </div>
    </div>

    <div class="sidebar-menu-section">
      <div class="sidebar-section-title">
        <span class="sidebar-section-title-left"><i data-lucide="copyright"></i><span data-i18n="nav.compliance">Compliance</span></span>
      </div>
      <div class="sidebar-sub-list">
        <button class="sidebar-sub-item" onclick="showToast(t('sidebar.feature', 'T\u00ednh n\u0103ng \u0111ang ph\u00e1t tri\u1ec3n!'), 'coming-soon')" data-i18n="nav.rightsholders">Rightsholders</button>
        <button class="sidebar-sub-item" onclick="showToast(t('sidebar.feature', 'T\u00ednh n\u0103ng \u0111ang ph\u00e1t tri\u1ec3n!'), 'coming-soon')" data-i18n="nav.copyrightCenter">Copyright Center</button>
        <button id="nav-admin-btn" class="sidebar-sub-item" style="display: none;" data-i18n="nav.admin">Admin</button>
      </div>
    </div>

    <div id="sidebar-footer-area"></div>
  </div>`;
}

// Parse user session and sync with server session
async function initUserSession() {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      currentUser = JSON.parse(userStr);
    } catch (e) {
      console.error("Error parsing user session:", e);
      localStorage.removeItem('user');
    }
  }

  try {
    const res = await apiFetch(`${API_BASE}/auth/me`);
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      localStorage.setItem('user', JSON.stringify(currentUser));
    } else if (currentUser) {
      localStorage.removeItem('user');
      currentUser = null;
    }
  } catch (e) {
    console.error("Session sync error:", e);
  }
  window.__sessionReady = true;
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
    setActiveSidebarItem('nav-home-btn');
    window.location.href = '/';
  });

  document.getElementById('nav-admin-btn')?.addEventListener('click', () => {
    setActiveSidebarItem('nav-admin-btn');
    window.location.href = '/admin';
  });

  document.getElementById('nav-history-btn')?.addEventListener('click', () => {
    setActiveSidebarItem('nav-history-btn');
    window.location.href = '/history';
  });

  document.getElementById('nav-updates-btn')?.addEventListener('click', () => {
    setActiveSidebarItem('nav-updates-btn');
    window.location.href = '/follow-updates';
  });

  document.getElementById('nav-library-btn')?.addEventListener('click', () => {
    setActiveSidebarItem('nav-library-btn');
    window.location.href = '/library';
  });

  document.getElementById('nav-info-btn')?.addEventListener('click', () => {
    showToast(t('nav.about', 'MangaNPK - \u1ee9ng d\u1ee5ng \u0111\u1ecdc truy\u1ec7n tranh tr\u1ef1c tuy\u1ebfn.'), 'info');
  });

  document.getElementById('nav-lists-btn')?.addEventListener('click', () => {
    setActiveSidebarItem('nav-lists-btn');
    window.location.href = '/lists';
  });

  document.getElementById('nav-advanced-search-btn')?.addEventListener('click', () => {
    setActiveSidebarItem('nav-advanced-search-btn');
    window.location.href = '/manga';
  });

  document.getElementById('nav-recently-added-btn')?.addEventListener('click', () => {
    setActiveSidebarItem('nav-recently-added-btn');
    window.location.href = '/recently-added';
  });

  document.getElementById('nav-latest-updates-btn')?.addEventListener('click', () => {
    setActiveSidebarItem('nav-latest-updates-btn');
    window.location.href = '/updates';
  });

  document.querySelectorAll('#nav-random-btn, [data-i18n="sidebar.random"]').forEach(btn => {
    btn.removeAttribute('onclick');
    btn.addEventListener('click', async () => {
      try {
        const res = await fetch(`${API_BASE}/manga/random`);
        if (!res.ok) {
          showToast(t('search.noResults', 'Kh\u00f4ng t\u00ecm th\u1ea5y truy\u1ec7n n\u00e0o.'), 'warning');
          return;
        }
        const data = await res.json();
        if (data.id) window.location.href = `/manga/${data.id}`;
      } catch (e) {
        showToast(t('common.error', 'C\u00f3 l\u1ed7i x\u1ea3y ra.'), 'error');
      }
    });
  });

  // Admin button visibility check
  const adminBtn = document.getElementById('nav-admin-btn');
  if (adminBtn) {
    adminBtn.style.display = (currentUser && currentUser.role === 'Admin') ? 'flex' : 'none';
  }

  syncSidebarActiveState();
}

function setActiveSidebarItem(id) {
  if (!id) return;
  sessionStorage.setItem('sidebarActiveItem', id);
  document.querySelectorAll('#sidebar-drawer .sidebar-sub-item.active').forEach(item => item.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

function syncSidebarActiveState() {
  const path = window.location.pathname.toLowerCase();
  const query = window.location.search.toLowerCase();
  let activeId = sessionStorage.getItem('sidebarActiveItem') || '';

  if (path === '/' || path.endsWith('/index.html')) activeId = 'nav-home-btn';
  else if (path.startsWith('/follow-updates')) activeId = 'nav-updates-btn';
  else if (path.startsWith('/updates')) activeId = 'nav-latest-updates-btn';
  else if (path.startsWith('/recently-added')) activeId = 'nav-recently-added-btn';
  else if (path.startsWith('/history')) activeId = 'nav-history-btn';
  else if (path === '/manga') activeId = 'nav-advanced-search-btn';
  else if (path.startsWith('/library') && !['nav-library-btn', 'nav-history-btn', 'nav-updates-btn'].includes(activeId)) activeId = 'nav-library-btn';
  else if (path.includes('lists')) activeId = 'nav-lists-btn';
  else if (path.startsWith('/admin')) activeId = 'nav-admin-btn';

  setActiveSidebarItem(activeId || 'nav-home-btn');
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
  const area = document.getElementById('header-user-controls') || document.getElementById('header-user-area');
  if (!area) return;

  if (currentUser) {
    area.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; position: relative;">
        <!-- Clickable Avatar -->
        <div id="header-avatar" style="width: 36px; height: 36px; border-radius: 50%; background-color: #2F333B; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid #FF8C00; color: white; transition: all 0.2s;" title="${t('user.profile', 'T\u00e0i kho\u1ea3n')}">
          <i data-lucide="user" style="width: 18px; height: 18px;"></i>
        </div>

        <!-- Dropdown Menu -->
        <div id="header-user-dropdown" style="display: none; position: absolute; top: 48px; right: 0; width: 220px; background-color: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 12px; overflow: hidden; flex-direction: column; gap: 10px;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background-color: var(--bg-input); display: flex; align-items: center; justify-content: center; border: 2px solid #FF8C00; overflow: hidden;">
              <i data-lucide="user" style="width: 24px; height: 24px; color: var(--text-bright);"></i>
            </div>
            <span style="font-size: 0.95rem; font-weight: 700; color: var(--text-bright);">${currentUser.username}</span>
            <span style="font-size: 0.65rem; font-weight: 600; padding: 1px 8px; border-radius: 12px; background-color: var(--bg-input); color: var(--text-muted); border: 1px solid var(--border-subtle); text-transform: uppercase;">${currentUser.role || 'User'}</span>
          </div>
          <div style="height: 1px; background-color: var(--border-subtle); width: 100%;"></div>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <a href="/profile.html" class="dropdown-item-link" style="display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 6px; font-size: 0.85rem; color: var(--text-main); text-decoration: none;"><i data-lucide="user" style="width: 15px; height: 15px; color: var(--text-muted);"></i><span>${t('user.profile', 'H\u1ed3 s\u01a1 c\u1ee7a t\u00f4i')}</span></a>
            <a href="/library" class="dropdown-item-link" style="display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 6px; font-size: 0.85rem; color: var(--text-main); text-decoration: none;"><i data-lucide="bookmark" style="width: 15px; height: 15px; color: var(--text-muted);"></i><span>${t('user.followed', 'Truy\u1ec7n theo d\u00f5i')}</span></a>
            <a href="/lists" class="dropdown-item-link" style="display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 6px; font-size: 0.85rem; color: var(--text-main); text-decoration: none;"><i data-lucide="list" style="width: 15px; height: 15px; color: var(--text-muted);"></i><span>${t('lists.title', 'Danh s\u00e1ch c\u1ee7a t\u00f4i')}</span></a>
          </div>
          <div style="height: 1px; background-color: var(--border-subtle); width: 100%;"></div>
          <div style="display: flex; gap: 4px;"><a href="/profile.html" class="dropdown-item-link" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 8px; border-radius: 6px; font-size: 0.8rem; color: var(--text-main); text-decoration: none;"><i data-lucide="settings" style="width: 14px; height: 14px; color: var(--text-muted);"></i><span>${t('user.settings', 'C\u00e0i \u0111\u1eb7t')}</span></a><div id="dropdown-theme-toggle" class="dropdown-item-link" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 8px; border-radius: 6px; font-size: 0.8rem; color: var(--text-main); cursor: pointer;"><i data-lucide="droplet" style="width: 14px; height: 14px; color: var(--text-muted);"></i><span>${t('user.theme', 'Giao di\u1ec7n')}</span></div></div>
          <div style="height: 1px; background-color: var(--border-subtle); width: 100%;"></div>
          <button id="hdr-logout-btn" style="display: flex; align-items: center; gap: 10px; padding: 6px 10px; width: 100%; font-size: 0.85rem; text-align: left; color: #FF4552; cursor: pointer; background: none; border: none; border-radius: 6px;" class="dropdown-item-link"><i data-lucide="log-out" style="width: 15px; height: 15px;"></i><span style="font-weight: 600;">${t('auth.logout', '\u0110\u0103ng xu\u1ea5t')}</span></button>
        </div>
      </div>
    `;

    // Dropdown toggle event
    const avatar = document.getElementById('header-avatar');
    const dropdown = document.getElementById('header-user-dropdown');

    avatar.addEventListener('click', (e) => {
      e.stopPropagation();
      isUserMenuOpen = !isUserMenuOpen;
      dropdown.style.display = isUserMenuOpen ? 'flex' : 'none';
    });

    document.addEventListener('click', () => {
      isUserMenuOpen = false;
      if (dropdown) dropdown.style.display = 'none';
    });

    document.getElementById('dropdown-theme-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = document.body.classList.contains('light-mode') ? 'light' : 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      applyTheme(next);
      if (typeof lucide !== 'undefined') lucide.createIcons();
    });


    document.getElementById('hdr-logout-btn')?.addEventListener('click', handleLogout);

  } else {
    area.innerHTML = `
      <button id="header-login-btn" class="btn btn-secondary" style="border-radius: 20px; font-weight: 700; padding: 6px 16px; font-size: 0.85rem;">
        ${t('auth.login', '\u0110\u0103ng nh\u1eadp')}
      </button>
      <button id="header-register-btn" class="btn btn-primary" style="border-radius: 20px; font-weight: 700; padding: 6px 16px; font-size: 0.85rem; background-color: var(--accent-primary); border: none; color: white;">
        ${t('auth.register', '\u0110\u0103ng k\u00fd')}
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
      <div class="sidebar-chibi-container">
        <img class="sidebar-chibi-img" src="/img/dragon_ball.png" alt="Dragon Ball" />
      </div>

      <!-- Social links -->
      <div class="sidebar-social-row">
        <a class="sidebar-social-link" href="#"><i data-lucide="twitter" style="width: 16px; height: 16px;"></i></a>
        <a class="sidebar-social-link" href="#"><i data-lucide="instagram" style="width: 16px; height: 16px;"></i></a>
        <a class="sidebar-social-link" href="#"><i data-lucide="discord" style="width: 16px; height: 16px;"></i></a>
      </div>
      
      <!-- Copyright text -->
      <div class="sidebar-copyright-text">
        v2026.6.3<br>
        &copy; MangaNPK 2026<br>
        <a href="#" style="text-decoration: underline; color: var(--text-muted) !important;">${t('sidebar.terms', 'Terms & Policies')}</a>
      </div>

      <!-- Payment icons at the very bottom -->
      <div class="sidebar-payment-row">
        <!-- Visa Inline SVG Logo -->
        <svg class="sidebar-payment-icon visa-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="height: 12px; width: auto; fill: var(--text-bright); opacity: 0.6;">
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

// ========== GLOBAL TOAST NOTIFICATION ==========
// Usage: showToast('message') or showToast('message', 'error'|'success'|'info'|'warning')
(function setupGlobalToast() {
  const style = document.createElement('style');
  style.textContent = `
    #global-toast-container{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;}
    .global-toast{display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:8px;font-size:0.875rem;font-weight:600;color:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.35);pointer-events:auto;opacity:0;transform:translateY(10px);transition:opacity 0.25s,transform 0.25s;max-width:340px;word-break:break-word;line-height:1.4;}
    .global-toast.show{opacity:1;transform:translateY(0);}
    .global-toast.success{background:rgba(16,185,129,0.92);border:1px solid rgba(16,185,129,0.5);}
    .global-toast.error{background:rgba(220,38,38,0.92);border:1px solid rgba(220,38,38,0.5);}
    .global-toast.info{background:rgba(59,130,246,0.92);border:1px solid rgba(59,130,246,0.5);}
    .global-toast.warning{background:rgba(245,158,11,0.92);border:1px solid rgba(245,158,11,0.5);}
    .global-toast.coming-soon{background:rgba(99,102,241,0.92);border:1px solid rgba(99,102,241,0.4);}
  `;
  document.head.appendChild(style);
  const container = document.createElement('div');
  container.id = 'global-toast-container';
  document.body.appendChild(container);
})();

function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('global-toast-container');
  if (!container) return;
  const icons = { success: 'check-circle', error: 'alert-circle', info: 'info', warning: 'alert-triangle', 'coming-soon': 'clock' };
  const icon = icons[type] || 'info';
  const toast = document.createElement('div');
  toast.className = `global-toast ${type}`;
  toast.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;" data-lucide="${icon}"></svg><span>${message}</span>`;
  container.appendChild(toast);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// User Actions
async function handleLogout() {
  try {
    await apiFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  } catch (e) {
    console.error(e);
  }
  localStorage.removeItem('user');
  currentUser = null;
  window.location.reload();
}

function initLangToggle() {
  const btn = document.getElementById('lang-toggle-btn');
  if (btn && typeof I18N !== 'undefined') {
    I18N.updateLangButton();
    btn.addEventListener('click', () => I18N.toggle());
  }
}

// Auth Modals logic

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

// ========== THEME TOGGLE ==========
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-mode');
  } else {
    document.body.classList.remove('light-mode');
  }
}
