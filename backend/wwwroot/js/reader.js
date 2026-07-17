// Reader State Variables
let activeChapterId = null;
let chapterDetail = null;
let mangaDetail = null;
let readingMode = 'scroll';
let activeSlideIndex = 0;
let fitMode = 'both';
let readerHeaderHidden = localStorage.getItem('reader_header_hidden') === 'true';
let progressMode = localStorage.getItem('reader_progress_mode') || 'normal';
let readerDirection = localStorage.getItem('reader_direction') || 'ltr';
let readerBackground = localStorage.getItem('reader_background') || 'black';
let readerDisplayStyle = localStorage.getItem('reader_display_style') || 'long';
let isReaderDrawerPinned = localStorage.getItem('reader_drawer_pinned') === 'true';
let isReaderDrawerCollapsed = localStorage.getItem('reader_drawer_collapsed') === 'true';
let readerDrawerHoverExpanded = false;
let autoAdvanceLastPage = localStorage.getItem('reader_auto_advance') === 'true';
let tapMode = localStorage.getItem('reader_tap_mode') || 'directional';
let scrollTurnMode = localStorage.getItem('reader_scroll_turn') || 'keyboard';
let doubleClickFullscreen = localStorage.getItem('reader_double_fullscreen') === 'true';

let lastScrollY = window.scrollY;
let isPageDropdownOpen = false;
let isChapterDropdownOpen = false;
let isReaderSettingsOpen = false;
let progressSaveTimer = null;
let lastWheelTurnAt = 0;
const submittedReaderViewKeys = new Set();
const defaultReaderKeybinds = {
  toggleMenu: ['KeyM'],
  pageRight: ['ArrowRight', 'KeyD', 'Numpad6'],
  pageLeft: ['ArrowLeft', 'KeyA', 'Numpad4'],
  scrollUp: ['KeyW', 'Numpad8'],
  scrollDown: ['KeyS', 'Numpad2'],
  chapterForward: ['Period'],
  chapterBackward: ['Comma'],
  immersive: ['KeyF'],
  cycleFit: ['KeyI']
};
let readerKeybinds = loadReaderKeybinds();

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSession();
  const savedMode = localStorage.getItem('reader_mode');
  if (savedMode) readingMode = savedMode;
  const savedFit = localStorage.getItem('reader_fit');
  if (savedFit) fitMode = savedFit;

  // MVC mode: data injected by server
  if (window.__CHAPTER_DETAIL__) {
    chapterDetail = window.__CHAPTER_DETAIL__;
    mangaDetail = window.__MANGA_DETAIL__;
    activeChapterId = chapterDetail.id;

    // Update breadcrumb link
    const breadcrumb = document.getElementById('reader-manga-title-breadcrumb');
    if (breadcrumb) {
      breadcrumb.onclick = () => window.location.href = `/manga/${chapterDetail.mangaId}`;
    }
    renderReaderMetadata();

    initReaderControls();
    initReaderSearch();
    initReaderDrawer();
    initReaderSettingsModal();
    initReaderKeybinds();
    applyReaderHeaderMode();
    applyProgressMode();
    applyReaderBackground();
    applyReaderDisplayStyle();
    renderChaptersDropdown();
    renderReader();
    saveReadingHistoryEntry();
    incrementReaderMangaViewCount();
    saveReadingProgress();
    return;
  }

  // Legacy fetch mode
  const params = new URLSearchParams(window.location.search);
  const chapId = params.get('chapterId');
  if (!chapId) { showToast(t('reader.notFound', 'Không tìm thấy chương truyện!'), 'error'); window.location.href = '/'; return; }
  activeChapterId = Number(chapId);
  initReaderControls();
  initReaderSearch();
  initReaderDrawer();
  initReaderSettingsModal();
  initReaderKeybinds();
  applyReaderHeaderMode();
  applyProgressMode();
  applyReaderBackground();
  applyReaderDisplayStyle();
  await fetchChapterDetail();
});

async function fetchChapterDetail() {
  toggleReaderLoading(true);
  try {
    const res = await fetch(`${API_BASE}/chapter/${activeChapterId}`);
    if (res.ok) {
      chapterDetail = await res.json();
      activeSlideIndex = 0;

      document.title = `${chapterDetail.mangaTitle} - ${t('reader.chapterSelect', 'Chương')} ${chapterDetail.chapterNumber} - MangaNPK`;
      const breadcrumb = document.getElementById('reader-manga-title-breadcrumb');
      if (breadcrumb) { breadcrumb.textContent = chapterDetail.mangaTitle; breadcrumb.onclick = () => window.location.href = `/manga/${chapterDetail.mangaId}`; }
      const h2 = document.getElementById('reader-manga-title-h2');
      if (h2) h2.textContent = chapterDetail.mangaTitle;
      const chapP = document.getElementById('reader-chapter-title-p');
      if (chapP) chapP.textContent = `${t('reader.chapterSelect', 'Chương')} ${chapterDetail.chapterNumber}${chapterDetail.title ? ': ' + chapterDetail.title : ''}`;
      renderReaderMetadata();

      if (!mangaDetail || mangaDetail.id !== chapterDetail.mangaId) {
        await fetchMangaDetail(chapterDetail.mangaId);
      } else { renderChaptersDropdown(); }

      renderReader();
      saveReadingHistoryEntry();
      incrementReaderMangaViewCount();
    } else { showToast(t('reader.loadError', 'Lỗi tải chương.'), 'error'); window.location.href = '/'; }
  } catch (e) { console.error(e); } finally { toggleReaderLoading(false); }
}

async function fetchMangaDetail(mangaId) {
  try {
    const res = await fetch(`${API_BASE}/manga/${mangaId}`);
    if (res.ok) { mangaDetail = await res.json(); renderChaptersDropdown(); }
  } catch (e) { console.error(e); }
}

function toggleReaderLoading(isLoading) {
  const spinner = document.getElementById('reader-loading-spinner');
  const mainContent = document.getElementById('reader-main-content');
  if (spinner && mainContent) {
    spinner.style.display = isLoading ? 'flex' : 'none';
    mainContent.style.display = isLoading ? 'block' : 'block';
  }
}

function renderReader() {
  if (!chapterDetail) return;
  const scrollContainer = document.getElementById('viewer-scroll-container');
  const slideContainer = document.getElementById('viewer-slide-container');
  clearScrollObserver();

  const getImgStyle = () => {
    const base = "display: block; margin: 0 auto; transition: max-width 0.2s; user-select: none; pointer-events: none;";
    if (fitMode === 'both') return base + " max-width: 100%; max-height: 95vh; height: auto; width: auto; object-fit: contain;";
    if (fitMode === 'width') return base + " max-width: 100%; width: 100%; height: auto;";
    if (fitMode === 'height') return base + " max-height: 95vh; height: 95vh; width: auto;";
    return base + " max-width: none; max-height: none; width: auto; height: auto;";
  };

  const pages = chapterDetail.pages || [];

  if (readingMode === 'scroll') {
    scrollContainer.style.display = 'flex';
    slideContainer.style.display = 'none';
    scrollContainer.innerHTML = pages.map((p, idx) => `
      <div id="page-wrapper-${idx}" style="position: relative; width: 100%; text-align: center; line-height: 0;">
        <img id="page-image-${idx}" src="${p.imageUrl}" alt="${t('reader.pageOf', 'Trang')} ${p.pageNumber}" style="${getImgStyle()}" />
      </div>
    `).join('');
    setupScrollObserver();
  } else {
    scrollContainer.style.display = 'none';
    slideContainer.style.display = 'flex';
    if (pages.length === 0) {
      slideContainer.innerHTML = `<p style="color: var(--text-muted);">${t('reader.noPages', 'Chương này chưa có trang ảnh nào.')}</p>`;
    } else {
      const activePage = pages[activeSlideIndex] || pages[0];
      slideContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; width: 100%; position: relative;">
          <img id="page-image-slide" src="${activePage.imageUrl}" alt="${t('reader.pageOf', 'Trang')} ${activePage.pageNumber}" style="${getImgStyle()}" />
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 12px;">${t('reader.pageOf', 'Trang')} ${activePage.pageNumber} / ${pages.length}</div>
        </div>
      `;
    }
  }

  updateHeaderLabels();
  updateNavButtons();
  updateReadingProgressBar();
  updateDrawerButtonStates();
  saveReadingProgress();
}

function renderReaderMetadata() {
  if (!chapterDetail) return;

  const title = document.getElementById('reader-manga-title-h2');
  if (title) title.textContent = chapterDetail.mangaTitle || '';

  const chapterTitle = document.getElementById('reader-chapter-title-p');
  if (chapterTitle) {
    const chapterLabel = `${t('reader.chapter', 'Chương')} ${chapterDetail.chapterNumber}`;
    const titleSuffix = chapterDetail.title && chapterDetail.title !== chapterLabel ? `: ${chapterDetail.title}` : '';
    chapterTitle.textContent = `${chapterLabel}${titleSuffix}`;
  }

  const authorLine = document.getElementById('reader-author-name');
  const authorText = authorLine?.querySelector('span');
  if (authorText) {
    const names = (chapterDetail.authors || []).map(a => a.name).filter(Boolean);
    authorText.textContent = names.length > 0 ? names.join(', ') : t('detail.updating', 'Đang cập nhật');
  }
}

function updateHeaderLabels() {
  if (!chapterDetail) return;
  const pagesCount = chapterDetail.pages ? chapterDetail.pages.length : 0;
  const currentPageIdx = Math.min(activeSlideIndex, pagesCount - 1);
  const pageLabel = document.getElementById('current-page-label');
  if (pageLabel) pageLabel.textContent = `${t('reader.pageOf', 'Trang')} ${pagesCount > 0 ? (currentPageIdx + 1) : 0} / ${pagesCount}`;
  const chapLabel = document.getElementById('current-chapter-label');
  if (chapLabel) chapLabel.textContent = `${t('common.chapter', 'Chương')} ${chapterDetail.chapterNumber}`;
  const drawerPageLabel = document.getElementById('reader-drawer-page-label');
  if (drawerPageLabel) drawerPageLabel.textContent = `${pagesCount > 0 ? (currentPageIdx + 1) : 0}`;
  const drawerChapterLabel = document.getElementById('reader-drawer-chapter-label');
  if (drawerChapterLabel) drawerChapterLabel.textContent = `Chapter ${chapterDetail.chapterNumber}`;
  const drawerChapterTitle = document.getElementById('reader-drawer-chapter-title');
  if (drawerChapterTitle) drawerChapterTitle.textContent = `Chapter ${chapterDetail.chapterNumber}`;

  const pageOptions = document.getElementById('page-select-options');
  if (pageOptions && chapterDetail.pages) {
    pageOptions.innerHTML = chapterDetail.pages.map((p, idx) => `
      <div class="dropdown-item ${idx === currentPageIdx ? 'active' : ''}" data-page-idx="${idx}" style="font-weight: ${idx === currentPageIdx ? 700 : 500};">${t('reader.pageOf', 'Trang')} ${p.pageNumber}</div>
    `).join('');
    pageOptions.querySelectorAll('.dropdown-item').forEach(item => {
      item.onclick = (e) => {
        e.stopPropagation();
        isPageDropdownOpen = false;
        pageOptions.style.display = 'none';
        handlePageChange(Number(item.dataset.pageIdx));
      };
    });
  }
  updateReadingProgressBar();
}

function updateReadingProgressBar() {
  const fill = document.getElementById('reader-reading-progress');
  if (!fill || !chapterDetail) return;

  const pagesCount = chapterDetail.pages ? chapterDetail.pages.length : 0;
  const currentPage = pagesCount > 0 ? Math.min(activeSlideIndex + 1, pagesCount) : 0;
  const pct = pagesCount > 0 ? (currentPage / pagesCount) * 100 : 0;
  fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  const label = document.getElementById('reader-progress-label');
  if (label) label.textContent = `${currentPage} / ${pagesCount}`;
  updateDrawerButtonStates();
}

function renderChaptersDropdown() {
  const container = document.getElementById('chapter-select-options');
  if (!container || !mangaDetail || !mangaDetail.chapters) return;
  const sorted = [...mangaDetail.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
  container.innerHTML = sorted.map(c => `
    <div class="dropdown-item ${chapterDetail && c.id === chapterDetail.id ? 'active' : ''}" data-chap-id="${c.id}" style="display: flex; flex-direction: column; gap: 2px;">
      <span style="font-weight: 700;">${t('common.chapter', 'Chương')} ${c.chapterNumber}</span>
      ${c.title && c.title !== `${t('common.chapter', 'Chương')} ${c.chapterNumber}` ? `<span style="font-size: 0.75rem; opacity: 0.7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.title}</span>` : ''}
    </div>
  `).join('');
  container.querySelectorAll('.dropdown-item').forEach(item => {
    item.onclick = (e) => {
      e.stopPropagation();
      const chapId = Number(item.dataset.chapId);
      isChapterDropdownOpen = false;
      container.style.display = 'none';
      // Navigate to chapter URL
      window.location.href = `/chapter/${chapId}`;
    };
  });
}

function updateNavButtons() {
  if (!chapterDetail) return;
  const prevBtns = [document.getElementById('btn-prev-chap'), document.getElementById('btn-bottom-prev')];
  const nextBtns = [document.getElementById('btn-next-chap'), document.getElementById('btn-bottom-next')];

  prevBtns.forEach(btn => {
    if (!btn) return;
    if (chapterDetail.prevChapterId) {
      btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
      btn.onclick = () => window.location.href = `/chapter/${chapterDetail.prevChapterId}`;
    } else {
      btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'not-allowed'; btn.onclick = null;
    }
  });

  nextBtns.forEach(btn => {
    if (!btn) return;
    if (chapterDetail.nextChapterId) {
      btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
      btn.onclick = () => window.location.href = `/chapter/${chapterDetail.nextChapterId}`;
    } else {
      btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'not-allowed'; btn.onclick = null;
    }
  });
}

function handlePageChange(idx) {
  activeSlideIndex = idx;
  if (readingMode === 'scroll') {
    const el = document.getElementById(`page-wrapper-${idx}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else { renderReader(); }
  updateReadingProgressBar();
}

function initReaderControls() {
  window.addEventListener('scroll', handleHeaderVisibility);
  window.addEventListener('mousemove', handlePinnedHeaderPeek);
  document.getElementById('global-header')?.addEventListener('mouseleave', () => {
    if (isReaderDrawerPinned) document.body.classList.remove('reader-header-peek');
  });

  const chapTrigger = document.getElementById('chapter-select-trigger');
  const chapOptions = document.getElementById('chapter-select-options');
  if (chapTrigger && chapOptions) {
    chapTrigger.onclick = (e) => {
      e.stopPropagation();
      isChapterDropdownOpen = !isChapterDropdownOpen;
      isPageDropdownOpen = false; isReaderSettingsOpen = false;
      chapOptions.style.display = isChapterDropdownOpen ? 'block' : 'none';
      if (document.getElementById('page-select-options')) document.getElementById('page-select-options').style.display = 'none';
      if (document.getElementById('reader-settings-options')) document.getElementById('reader-settings-options').style.display = 'none';
    };
  }

  const pageTrigger = document.getElementById('page-select-trigger');
  const pageOptions = document.getElementById('page-select-options');
  if (pageTrigger && pageOptions) {
    pageTrigger.onclick = (e) => {
      e.stopPropagation();
      isPageDropdownOpen = !isPageDropdownOpen;
      isChapterDropdownOpen = false; isReaderSettingsOpen = false;
      pageOptions.style.display = isPageDropdownOpen ? 'block' : 'none';
      if (chapOptions) chapOptions.style.display = 'none';
      if (document.getElementById('reader-settings-options')) document.getElementById('reader-settings-options').style.display = 'none';
    };
  }

  const settingsTrigger = document.getElementById('reader-settings-btn');
  const settingsOptions = document.getElementById('reader-settings-options');
  if (settingsTrigger) {
    settingsTrigger.onclick = (e) => {
      e.stopPropagation();
      openReaderDrawer();
      isReaderSettingsOpen = false;
      isChapterDropdownOpen = false; isPageDropdownOpen = false;
      if (chapOptions) chapOptions.style.display = 'none';
      if (pageOptions) pageOptions.style.display = 'none';
    };
  }

  document.addEventListener('click', () => {
    isChapterDropdownOpen = false; isPageDropdownOpen = false; isReaderSettingsOpen = false;
    if (chapOptions) chapOptions.style.display = 'none';
    if (pageOptions) pageOptions.style.display = 'none';
    if (settingsOptions) settingsOptions.style.display = 'none';
  });

  const btnScroll = document.getElementById('opt-mode-scroll');
  const btnSlide = document.getElementById('opt-mode-slide');
  const updateModeUI = () => {
    if (!btnScroll || !btnSlide) return;
    if (readingMode === 'scroll') {
      btnScroll.style.backgroundColor = '#FF5C38'; btnScroll.style.color = 'white';
      btnSlide.style.backgroundColor = 'transparent'; btnSlide.style.color = 'var(--text-muted)';
    } else {
      btnSlide.style.backgroundColor = '#FF5C38'; btnSlide.style.color = 'white';
      btnScroll.style.backgroundColor = 'transparent'; btnScroll.style.color = 'var(--text-muted)';
    }
  };
  btnScroll?.addEventListener('click', (e) => { e.stopPropagation(); readingMode = 'scroll'; localStorage.setItem('reader_mode', 'scroll'); updateModeUI(); renderReader(); });
  btnSlide?.addEventListener('click', (e) => { e.stopPropagation(); readingMode = 'slide'; localStorage.setItem('reader_mode', 'slide'); updateModeUI(); renderReader(); });
  updateModeUI();

  const fitButtons = document.querySelectorAll('.opt-fit-btn');
  const updateFitUI = () => {
    fitButtons.forEach(btn => {
      btn.style.backgroundColor = btn.dataset.fit === fitMode ? '#FF5C38' : 'var(--bg-input)';
      btn.style.color = btn.dataset.fit === fitMode ? 'white' : 'var(--text-main)';
    });
  };
  fitButtons.forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); fitMode = btn.dataset.fit; localStorage.setItem('reader_fit', fitMode); updateFitUI(); renderReader(); });
  });
  updateFitUI();

  const viewerPane = document.getElementById('reader-viewer-pane');
  if (viewerPane) {
    viewerPane.addEventListener('mousemove', handleViewerMouseMove);
    viewerPane.addEventListener('mouseleave', e => e.currentTarget.style.cursor = 'default');
    viewerPane.addEventListener('click', handleViewerAreaClick);
  }
}

function initReaderSearch() {
  const input = document.getElementById('reader-header-search-input');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const q = input.value.trim();
    window.location.href = q ? `/manga?search=${encodeURIComponent(q)}` : '/manga';
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      input.focus();
    }
  });
}

function initReaderDrawer() {
  document.getElementById('reader-drawer-close')?.addEventListener('click', closeReaderDrawer);
  document.getElementById('reader-drawer-overlay')?.addEventListener('click', closeReaderDrawer);
  document.getElementById('reader-drawer-pin')?.addEventListener('click', toggleReaderDrawerPin);
  document.getElementById('reader-drawer-rail')?.addEventListener('mouseenter', expandPinnedDrawerFromRail);
  document.getElementById('reader-drawer-rail')?.addEventListener('click', expandPinnedDrawerFromRail);
  document.getElementById('reader-menu-drawer')?.addEventListener('mouseleave', () => {
    if (readerDrawerHoverExpanded) collapsePinnedDrawer();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeReaderSettingsModal();
      closeReaderDrawer();
    }
  });

  document.getElementById('reader-drawer-page-prev')?.addEventListener('click', () => goToRelativePage(-1));
  document.getElementById('reader-drawer-page-next')?.addEventListener('click', () => goToRelativePage(1));
  document.getElementById('reader-drawer-chapter-prev')?.addEventListener('click', () => {
    if (chapterDetail?.prevChapterId) window.location.href = `/chapter/${chapterDetail.prevChapterId}`;
  });
  document.getElementById('reader-drawer-chapter-next')?.addEventListener('click', () => {
    if (chapterDetail?.nextChapterId) window.location.href = `/chapter/${chapterDetail.nextChapterId}`;
  });
  document.getElementById('reader-drawer-page-select')?.addEventListener('click', () => {
    closeReaderDrawer();
    document.getElementById('page-select-trigger')?.click();
  });
  document.getElementById('reader-drawer-chapter-select')?.addEventListener('click', () => {
    closeReaderDrawer();
    document.getElementById('chapter-select-trigger')?.click();
  });
  document.getElementById('reader-report-chapter')?.addEventListener('click', () => {
    showToast(t('reader.reportHint', 'Tính năng báo lỗi chương sẽ được bổ sung trong bản tiếp theo.'), 'coming-soon');
  });
  document.getElementById('reader-mode-long-strip')?.addEventListener('click', () => {
    setReaderDisplayStyle('long');
  });
  document.getElementById('reader-fit-both')?.addEventListener('click', () => {
    setReaderFitMode('both');
  });
  document.querySelector('.reader-drawer-square-btn[title="Fit settings"]')?.addEventListener('click', () => {
    openReaderSettingsModal('image');
  });
  document.getElementById('reader-direction-ltr')?.addEventListener('click', () => {
    setReaderDirection(readerDirection === 'ltr' ? 'rtl' : 'ltr');
  });
  document.getElementById('reader-toggle-header')?.addEventListener('click', () => {
    setReaderHeaderHidden(!readerHeaderHidden);
  });
  document.getElementById('reader-progress-mode')?.addEventListener('click', () => {
    setProgressMode(progressMode === 'normal' ? 'lightbar' : progressMode === 'lightbar' ? 'hidden' : 'normal');
  });
  document.querySelector('.reader-drawer-square-btn[title="Progress settings"]')?.addEventListener('click', () => {
    openReaderSettingsModal('layout');
  });
  document.getElementById('reader-settings-open')?.addEventListener('click', () => openReaderSettingsModal('layout'));
  document.getElementById('reader-settings-placeholder')?.addEventListener('click', () => {
    showToast(t('reader.settingsComingSoon', 'Reader Settings sẽ được bổ sung sau.'), 'coming-soon');
  });

  applyPinnedDrawerState();
  updateDrawerButtonStates();
}

function openReaderDrawer() {
  isReaderDrawerCollapsed = false;
  if (isReaderDrawerPinned) localStorage.setItem('reader_drawer_collapsed', 'false');
  document.body.classList.add('reader-drawer-open');
  document.body.classList.toggle('reader-drawer-pinned', isReaderDrawerPinned);
  document.body.classList.remove('reader-drawer-collapsed');
  document.body.classList.remove('reader-drawer-peeking');
  document.getElementById('reader-menu-drawer')?.setAttribute('aria-hidden', 'false');
  updateHeaderLabels();
  updateDrawerButtonStates();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeReaderDrawer() {
  if (isReaderDrawerPinned) {
    collapsePinnedDrawer();
    return;
  }
  document.body.classList.remove('reader-drawer-open');
  document.body.classList.remove('reader-drawer-pinned');
  document.body.classList.remove('reader-drawer-collapsed');
  document.body.classList.remove('reader-drawer-peeking');
  document.getElementById('reader-menu-drawer')?.setAttribute('aria-hidden', 'true');
  updateDrawerButtonStates();
}

function toggleReaderDrawerPin() {
  isReaderDrawerPinned = !isReaderDrawerPinned;
  localStorage.setItem('reader_drawer_pinned', String(isReaderDrawerPinned));
  if (isReaderDrawerPinned) {
    isReaderDrawerCollapsed = false;
    localStorage.setItem('reader_drawer_collapsed', 'false');
    openReaderDrawer();
  } else {
    isReaderDrawerCollapsed = false;
    localStorage.setItem('reader_drawer_collapsed', 'false');
    document.body.classList.remove('reader-drawer-pinned', 'reader-drawer-collapsed', 'reader-drawer-peeking');
  }
  readerDrawerHoverExpanded = false;
  updateDrawerButtonStates();
}

function collapsePinnedDrawer() {
  if (!isReaderDrawerPinned) return;
  isReaderDrawerCollapsed = true;
  readerDrawerHoverExpanded = false;
  localStorage.setItem('reader_drawer_collapsed', 'true');
  document.body.classList.remove('reader-drawer-open');
  document.body.classList.add('reader-drawer-pinned', 'reader-drawer-collapsed');
  document.body.classList.remove('reader-drawer-peeking');
  document.getElementById('reader-menu-drawer')?.setAttribute('aria-hidden', 'true');
  updateDrawerButtonStates();
}

function expandPinnedDrawerFromRail() {
  if (!isReaderDrawerPinned || !isReaderDrawerCollapsed) return;
  readerDrawerHoverExpanded = true;
  isReaderDrawerCollapsed = false;
  document.body.classList.add('reader-drawer-open', 'reader-drawer-pinned');
  document.body.classList.remove('reader-drawer-collapsed');
  document.body.classList.add('reader-drawer-peeking');
  document.getElementById('reader-menu-drawer')?.setAttribute('aria-hidden', 'false');
  updateHeaderLabels();
  updateDrawerButtonStates();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function applyPinnedDrawerState() {
  document.body.classList.toggle('reader-drawer-pinned', isReaderDrawerPinned);
  document.body.classList.toggle('reader-drawer-collapsed', isReaderDrawerPinned && isReaderDrawerCollapsed);
  if (isReaderDrawerPinned && isReaderDrawerCollapsed) {
    document.body.classList.remove('reader-drawer-open');
    document.body.classList.remove('reader-drawer-peeking');
    document.getElementById('reader-menu-drawer')?.setAttribute('aria-hidden', 'true');
  } else if (isReaderDrawerPinned) {
    openReaderDrawer();
  }
}

function goToRelativePage(delta) {
  const pagesCount = chapterDetail?.pages?.length || 0;
  if (!pagesCount) return;
  const next = Math.max(0, Math.min(pagesCount - 1, activeSlideIndex + delta));
  if (next === activeSlideIndex) return;
  handlePageChange(next);
}

function applyReaderHeaderMode() {
  document.body.classList.toggle('reader-header-hidden', readerHeaderHidden);
  const main = document.getElementById('main-layout');
  if (main) main.style.paddingTop = readerHeaderHidden ? '0' : '60px';
}

function applyProgressMode() {
  document.body.classList.remove('reader-progress-normal', 'reader-progress-lightbar', 'reader-progress-hidden');
  document.body.classList.add(`reader-progress-${progressMode}`);
}

function setProgressMode(mode) {
  progressMode = mode;
  localStorage.setItem('reader_progress_mode', progressMode);
  applyProgressMode();
  updateDrawerButtonStates();
  syncReaderSettingsUI();
}

function setReaderHeaderHidden(isHidden) {
  readerHeaderHidden = isHidden;
  localStorage.setItem('reader_header_hidden', String(readerHeaderHidden));
  applyReaderHeaderMode();
  updateDrawerButtonStates();
  syncReaderSettingsUI();
}

function setReaderDirection(direction) {
  readerDirection = direction;
  localStorage.setItem('reader_direction', readerDirection);
  updateDrawerButtonStates();
  syncReaderSettingsUI();
}

function setReaderFitMode(mode) {
  fitMode = mode;
  localStorage.setItem('reader_fit', fitMode);
  renderReader();
  updateDrawerButtonStates();
  syncReaderSettingsUI();
}

function setReaderDisplayStyle(style) {
  readerDisplayStyle = style;
  localStorage.setItem('reader_display_style', readerDisplayStyle);
  readingMode = style === 'long' || style === 'wide' ? 'scroll' : 'slide';
  localStorage.setItem('reader_mode', readingMode);
  renderReader();
  updateDrawerButtonStates();
  syncReaderSettingsUI();
}

function applyReaderDisplayStyle() {
  readingMode = readerDisplayStyle === 'long' || readerDisplayStyle === 'wide' ? 'scroll' : 'slide';
  localStorage.setItem('reader_mode', readingMode);
}

function setReaderBackground(background) {
  readerBackground = background;
  localStorage.setItem('reader_background', readerBackground);
  applyReaderBackground();
  syncReaderSettingsUI();
}

function applyReaderBackground() {
  document.body.classList.remove('reader-bg-white', 'reader-bg-black');
  document.body.classList.add(readerBackground === 'white' ? 'reader-bg-white' : 'reader-bg-black');
}

function updateDrawerButtonStates() {
  document.getElementById('reader-mode-long-strip')?.classList.toggle('active', readingMode === 'scroll');
  document.getElementById('reader-fit-both')?.classList.toggle('active', fitMode === 'both');
  document.getElementById('reader-toggle-header')?.classList.toggle('active', readerHeaderHidden);
  document.getElementById('reader-drawer-pin')?.classList.toggle('active', isReaderDrawerPinned);

  const pagesCount = chapterDetail?.pages?.length || 0;
  const pagePrev = document.getElementById('reader-drawer-page-prev');
  const pageNext = document.getElementById('reader-drawer-page-next');
  if (pagePrev) pagePrev.disabled = activeSlideIndex <= 0;
  if (pageNext) pageNext.disabled = pagesCount === 0 || activeSlideIndex >= pagesCount - 1;
  const chapterPrev = document.getElementById('reader-drawer-chapter-prev');
  const chapterNext = document.getElementById('reader-drawer-chapter-next');
  if (chapterPrev) chapterPrev.disabled = !chapterDetail?.prevChapterId;
  if (chapterNext) chapterNext.disabled = !chapterDetail?.nextChapterId;

  const progressBtn = document.getElementById('reader-progress-mode');
  const progressText = progressBtn?.querySelector('span');
  if (progressText) {
    progressText.textContent = progressMode === 'normal'
      ? 'Normal Progress'
      : progressMode === 'lightbar'
        ? 'Progress Lightbar'
        : 'Progress Hidden';
  }
  progressBtn?.classList.toggle('active', progressMode !== 'hidden');

  const directionBtn = document.getElementById('reader-direction-ltr');
  const directionText = directionBtn?.querySelector('span');
  const directionIcon = directionBtn?.querySelector('i');
  if (directionText) directionText.textContent = readerDirection === 'ltr' ? 'Left To Right' : 'Right To Left';
  if (directionIcon) directionIcon.setAttribute('data-lucide', readerDirection === 'ltr' ? 'circle-arrow-right' : 'circle-arrow-left');
  directionBtn?.classList.add('active');

  syncReaderSettingsUI();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}


function turnPageByDirection(direction) {
  const forward = readerDirection === 'ltr' ? direction === 'right' : direction === 'left';
  if (forward) goToRelativePageOrChapter(1);
  else goToRelativePageOrChapter(-1);
}

function goToRelativePageOrChapter(delta) {
  const pagesCount = chapterDetail?.pages?.length || 0;
  if (!pagesCount) return;
  const next = activeSlideIndex + delta;
  if (next >= 0 && next < pagesCount) {
    handlePageChange(next);
    return;
  }
  if (delta > 0 && autoAdvanceLastPage) goToNextChapter();
  if (delta < 0) goToPreviousChapter();
}

function cycleReaderFitMode() {
  const modes = ['both', 'width', 'height', 'none'];
  setReaderFitMode(modes[(modes.indexOf(fitMode) + 1) % modes.length]);
}

function goToNextChapter() {
  if (chapterDetail?.nextChapterId) window.location.href = `/chapter/${chapterDetail.nextChapterId}`;
}

function goToPreviousChapter() {
  if (chapterDetail?.prevChapterId) window.location.href = `/chapter/${chapterDetail.prevChapterId}`;
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
}

function handleHeaderVisibility() {
  const header = document.getElementById('global-header');
  if (!header) return;
  if (isReaderDrawerPinned) return;
  const currentScrollY = window.scrollY;
  if (currentScrollY <= 60) { header.style.transform = 'translateY(0)'; }
  else if (currentScrollY > lastScrollY && currentScrollY - lastScrollY > 10) { header.style.transform = 'translateY(-100%)'; }
  else if (currentScrollY < lastScrollY && lastScrollY - currentScrollY > 10) { header.style.transform = 'translateY(0)'; }
  lastScrollY = currentScrollY;
}

function handlePinnedHeaderPeek(e) {
  if (!isReaderDrawerPinned) {
    document.body.classList.remove('reader-header-peek');
    return;
  }
  const header = document.getElementById('global-header');
  const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
  if (e.clientY <= 14) {
    document.body.classList.add('reader-header-peek');
    return;
  }
  if (headerBottom > 0 && e.clientY <= headerBottom + 8) return;
  document.body.classList.remove('reader-header-peek');
}

function handleViewerMouseMove(e) {
  const pane = e.currentTarget;
  const rect = pane.getBoundingClientRect();
  const divider = document.getElementById('reader-divider-line');
  if (divider) {
    const dividerRect = divider.getBoundingClientRect();
    if (e.clientY - rect.top < dividerRect.bottom - rect.top) { pane.style.cursor = 'default'; return; }
  }
  const side = e.clientX - rect.left < rect.width / 2 ? 'left' : 'right';
  pane.style.cursor = side === 'left'
    ? `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='15 18 9 12 15 6'></polyline></svg>") 12 12, w-resize`
    : `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='9 18 15 12 9 6'></polyline></svg>") 12 12, e-resize`;
}

function handleViewerAreaClick(e) {
  if (e.button !== 0) return;
  if (tapMode === 'never') return;
  const pane = e.currentTarget;
  const rect = pane.getBoundingClientRect();
  const divider = document.getElementById('reader-divider-line');
  if (divider) {
    if (e.clientY - rect.top < divider.getBoundingClientRect().bottom - rect.top) return;
  }
  const pagesCount = chapterDetail && chapterDetail.pages ? chapterDetail.pages.length : 0;
  if (pagesCount === 0) return;
  const side = tapMode === 'forward' ? (readerDirection === 'ltr' ? 'right' : 'left') : (e.clientX - rect.left < rect.width / 2 ? 'left' : 'right');
  if (side === 'left') {
    if (readingMode === 'slide') {
      if (activeSlideIndex > 0) { activeSlideIndex--; renderReader(); }
      else if (chapterDetail.prevChapterId) window.location.href = `/chapter/${chapterDetail.prevChapterId}`;
      else showToast(t('reader.firstPage', 'Đây là trang đầu tiên của chương đầu tiên!'), 'info');
    } else { handlePageChange(Math.max(0, activeSlideIndex - 1)); }
  } else {
    if (readingMode === 'slide') {
      if (activeSlideIndex < pagesCount - 1) { activeSlideIndex++; renderReader(); }
      else if (chapterDetail.nextChapterId && autoAdvanceLastPage) window.location.href = `/chapter/${chapterDetail.nextChapterId}`;
      else showToast(t('reader.lastChapter', 'Chúc mừng! Bạn đã đọc xong chương cuối cùng.'), 'success');
    } else { handlePageChange(Math.min(pagesCount - 1, activeSlideIndex + 1)); }
  }
}

let readerObserver = null;
function setupScrollObserver() {
  if (!chapterDetail || !chapterDetail.pages) return;
  readerObserver = new IntersectionObserver((entries) => {
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120) {
      activeSlideIndex = chapterDetail.pages.length - 1; updateHeaderLabels(); updateReadingProgressBar(); return;
    }
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const match = entry.target.id.match(/^page-image-(\d+)$/);
        if (match) { activeSlideIndex = parseInt(match[1], 10); updateHeaderLabels(); updateReadingProgressBar(); }
      }
    });
  }, { root: null, rootMargin: '-30% 0px -30% 0px', threshold: 0 });
  chapterDetail.pages.forEach((_, idx) => {
    const el = document.getElementById(`page-image-${idx}`);
    if (el) readerObserver.observe(el);
  });
  window.addEventListener('scroll', checkExtremeScrolls);
}

function checkExtremeScrolls() {
  if (readingMode !== 'scroll' || !chapterDetail) return;
  if (window.scrollY < 50) { activeSlideIndex = 0; updateHeaderLabels(); updateReadingProgressBar(); }
}

function clearScrollObserver() {
  if (readerObserver) { readerObserver.disconnect(); readerObserver = null; }
  window.removeEventListener('scroll', checkExtremeScrolls);
}

function saveReadingProgress() {
  if (!currentUser || !chapterDetail) return;

  clearTimeout(progressSaveTimer);
  progressSaveTimer = setTimeout(async () => {
    const pages = chapterDetail.pages || [];
    const pageNum = pages[activeSlideIndex]?.pageNumber || (activeSlideIndex + 1);
    try {
      await apiFetch(`${API_BASE}/library/progress`, {
        method: 'PUT',
        body: JSON.stringify({
          mangaId: chapterDetail.mangaId,
          chapterId: chapterDetail.id,
          pageNumber: pageNum
        })
      });
    } catch (e) {
      console.error('Progress save error:', e);
    }
  }, 1500);
}

function saveReadingHistoryEntry() {
  if (!chapterDetail || typeof saveLocalReadingHistoryItem !== 'function') return;

  // Lưu lịch sử ngay khi vào trang đọc, kể cả truyện chưa được thêm vào thư viện.
  const pages = chapterDetail.pages || [];
  const currentPage = pages[activeSlideIndex]?.pageNumber || (activeSlideIndex + 1) || 1;
  const authors = [
    ...(chapterDetail.authors || []),
    ...(mangaDetail?.authors || [])
  ].map(author => author.name).filter(Boolean);
  const chapterLabel = `${t('common.chapter', 'Chương')} ${chapterDetail.chapterNumber}`;
  const chapterTitle = chapterDetail.title && chapterDetail.title !== chapterLabel ? chapterDetail.title : '';

  saveLocalReadingHistoryItem({
    mangaId: chapterDetail.mangaId || mangaDetail?.id,
    chapterId: chapterDetail.id,
    title: chapterDetail.mangaTitle || mangaDetail?.title || '',
    mangaTitle: chapterDetail.mangaTitle || mangaDetail?.title || '',
    chapterNumber: chapterDetail.chapterNumber,
    chapterTitle,
    coverUrl: mangaDetail?.coverUrl || chapterDetail.coverUrl || '',
    description: mangaDetail?.description || '',
    type: mangaDetail?.type || 'Manga',
    status: mangaDetail?.status || 'Ongoing',
    viewCount: mangaDetail?.viewCount || 0,
    genres: mangaDetail?.genres || [],
    themes: mangaDetail?.themes || [],
    authorName: authors.length > 0 ? authors.join(', ') : '',
    pageNumber: currentPage,
    pageCount: pages.length
  });
}

async function incrementReaderMangaViewCount() {
  const mangaId = chapterDetail?.mangaId || mangaDetail?.id;
  const chapterId = chapterDetail?.id || activeChapterId;
  if (!mangaId || !chapterId) return;

  // Chặn gọi API cộng lượt đọc nhiều lần nếu reader render lại cùng một chương.
  const viewKey = `${mangaId}:${chapterId}`;
  if (submittedReaderViewKeys.has(viewKey)) return;
  submittedReaderViewKeys.add(viewKey);

  try {
    await apiFetch(`${API_BASE}/manga/${mangaId}/view?chapterId=${chapterId}`, { method: 'POST' });
  } catch (e) {
    submittedReaderViewKeys.delete(viewKey);
    console.error('View count update error:', e);
  }
}
