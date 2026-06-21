// Reader State Variables
let activeChapterId = null;
let chapterDetail = null;
let mangaDetail = null;
let readingMode = 'scroll';
let activeSlideIndex = 0;
let fitMode = 'both';

let lastScrollY = window.scrollY;
let isPageDropdownOpen = false;
let isChapterDropdownOpen = false;
let isReaderSettingsOpen = false;

document.addEventListener('DOMContentLoaded', async () => {
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

    initReaderControls();
    renderChaptersDropdown();
    renderReader();
    return;
  }

  // Legacy fetch mode
  const params = new URLSearchParams(window.location.search);
  const chapId = params.get('chapterId');
  if (!chapId) { alert("Không tìm thấy chương truyện!"); window.location.href = '/'; return; }
  activeChapterId = Number(chapId);
  initReaderControls();
  await fetchChapterDetail();
});

async function fetchChapterDetail() {
  toggleReaderLoading(true);
  try {
    const res = await fetch(`${API_BASE}/chapter/${activeChapterId}`);
    if (res.ok) {
      chapterDetail = await res.json();
      activeSlideIndex = 0;

      document.title = `${chapterDetail.mangaTitle} - Chương ${chapterDetail.chapterNumber} - MangaNPK`;
      const breadcrumb = document.getElementById('reader-manga-title-breadcrumb');
      if (breadcrumb) { breadcrumb.textContent = chapterDetail.mangaTitle; breadcrumb.onclick = () => window.location.href = `/manga/${chapterDetail.mangaId}`; }
      const h2 = document.getElementById('reader-manga-title-h2');
      if (h2) h2.textContent = chapterDetail.mangaTitle;
      const chapP = document.getElementById('reader-chapter-title-p');
      if (chapP) chapP.textContent = `Chương ${chapterDetail.chapterNumber}${chapterDetail.title ? ': ' + chapterDetail.title : ''}`;

      if (!mangaDetail || mangaDetail.id !== chapterDetail.mangaId) {
        await fetchMangaDetail(chapterDetail.mangaId);
      } else { renderChaptersDropdown(); }

      renderReader();
    } else { alert("Lỗi tải chương."); window.location.href = '/'; }
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
      <div id="page-wrapper-${idx}" style="position: relative; width: 100%; text-align: center;">
        <img id="page-image-${idx}" src="${p.imageUrl}" alt="Trang ${p.pageNumber}" style="${getImgStyle()}" />
        <div style="font-size: 0.75rem; color: #8B949E; margin-top: 6px; margin-bottom: 20px;">Trang ${p.pageNumber} / ${pages.length}</div>
      </div>
    `).join('');
    setupScrollObserver();
  } else {
    scrollContainer.style.display = 'none';
    slideContainer.style.display = 'flex';
    if (pages.length === 0) {
      slideContainer.innerHTML = `<p style="color: #8B949E;">Chương này chưa có trang ảnh nào.</p>`;
    } else {
      const activePage = pages[activeSlideIndex] || pages[0];
      slideContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; width: 100%; position: relative;">
          <img id="page-image-slide" src="${activePage.imageUrl}" alt="Trang ${activePage.pageNumber}" style="${getImgStyle()}" />
          <div style="font-size: 0.8rem; color: #8B949E; margin-top: 12px;">Trang ${activePage.pageNumber} / ${pages.length}</div>
          <div style="position: fixed; bottom: 0; left: 0; width: 100%; height: 5px; background-color: #202229; z-index: 1005;">
            <div style="width: ${((activeSlideIndex + 1) / pages.length) * 100}%; height: 100%; background-color: #FF5C38; transition: width 0.15s ease;"></div>
          </div>
        </div>
      `;
    }
  }

  updateHeaderLabels();
  updateNavButtons();
}

function updateHeaderLabels() {
  if (!chapterDetail) return;
  const pagesCount = chapterDetail.pages ? chapterDetail.pages.length : 0;
  const currentPageIdx = Math.min(activeSlideIndex, pagesCount - 1);
  const pageLabel = document.getElementById('current-page-label');
  if (pageLabel) pageLabel.textContent = `Trang ${pagesCount > 0 ? (currentPageIdx + 1) : 0} / ${pagesCount}`;
  const chapLabel = document.getElementById('current-chapter-label');
  if (chapLabel) chapLabel.textContent = `Chương ${chapterDetail.chapterNumber}`;

  const pageOptions = document.getElementById('page-select-options');
  if (pageOptions && chapterDetail.pages) {
    pageOptions.innerHTML = chapterDetail.pages.map((p, idx) => `
      <div class="dropdown-item ${idx === currentPageIdx ? 'active' : ''}" data-page-idx="${idx}" style="font-weight: ${idx === currentPageIdx ? 700 : 500};">Trang ${p.pageNumber}</div>
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
}

function renderChaptersDropdown() {
  const container = document.getElementById('chapter-select-options');
  if (!container || !mangaDetail || !mangaDetail.chapters) return;
  const sorted = [...mangaDetail.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
  container.innerHTML = sorted.map(c => `
    <div class="dropdown-item ${chapterDetail && c.id === chapterDetail.id ? 'active' : ''}" data-chap-id="${c.id}" style="display: flex; flex-direction: column; gap: 2px;">
      <span style="font-weight: 700;">Chương ${c.chapterNumber}</span>
      ${c.title && c.title !== `Chương ${c.chapterNumber}` ? `<span style="font-size: 0.75rem; opacity: 0.7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.title}</span>` : ''}
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
}

function initReaderControls() {
  window.addEventListener('scroll', handleHeaderVisibility);

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
  if (settingsTrigger && settingsOptions) {
    settingsTrigger.onclick = (e) => {
      e.stopPropagation();
      isReaderSettingsOpen = !isReaderSettingsOpen;
      isChapterDropdownOpen = false; isPageDropdownOpen = false;
      settingsOptions.style.display = isReaderSettingsOpen ? 'block' : 'none';
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
      btn.style.backgroundColor = btn.dataset.fit === fitMode ? '#FF5C38' : '#1C1F26';
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

function handleHeaderVisibility() {
  const header = document.getElementById('global-header');
  if (!header) return;
  const currentScrollY = window.scrollY;
  if (currentScrollY <= 60) { header.style.transform = 'translateY(0)'; }
  else if (currentScrollY > lastScrollY && currentScrollY - lastScrollY > 10) { header.style.transform = 'translateY(-100%)'; }
  else if (currentScrollY < lastScrollY && lastScrollY - currentScrollY > 10) { header.style.transform = 'translateY(0)'; }
  lastScrollY = currentScrollY;
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
  const pane = e.currentTarget;
  const rect = pane.getBoundingClientRect();
  const divider = document.getElementById('reader-divider-line');
  if (divider) {
    if (e.clientY - rect.top < divider.getBoundingClientRect().bottom - rect.top) return;
  }
  const pagesCount = chapterDetail && chapterDetail.pages ? chapterDetail.pages.length : 0;
  if (pagesCount === 0) return;
  const side = e.clientX - rect.left < rect.width / 2 ? 'left' : 'right';
  if (side === 'left') {
    if (readingMode === 'slide') {
      if (activeSlideIndex > 0) { activeSlideIndex--; renderReader(); }
      else if (chapterDetail.prevChapterId) window.location.href = `/chapter/${chapterDetail.prevChapterId}`;
      else alert("Đây là trang đầu tiên của chương đầu tiên!");
    } else { handlePageChange(Math.max(0, activeSlideIndex - 1)); }
  } else {
    if (readingMode === 'slide') {
      if (activeSlideIndex < pagesCount - 1) { activeSlideIndex++; renderReader(); }
      else if (chapterDetail.nextChapterId) window.location.href = `/chapter/${chapterDetail.nextChapterId}`;
      else alert("Chúc mừng! Bạn đã đọc xong chương cuối cùng.");
    } else { handlePageChange(Math.min(pagesCount - 1, activeSlideIndex + 1)); }
  }
}

let readerObserver = null;
function setupScrollObserver() {
  if (!chapterDetail || !chapterDetail.pages) return;
  readerObserver = new IntersectionObserver((entries) => {
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120) {
      activeSlideIndex = chapterDetail.pages.length - 1; updateHeaderLabels(); return;
    }
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const match = entry.target.id.match(/^page-image-(\d+)$/);
        if (match) { activeSlideIndex = parseInt(match[1], 10); updateHeaderLabels(); }
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
  if (window.scrollY < 50) { activeSlideIndex = 0; updateHeaderLabels(); }
}

function clearScrollObserver() {
  if (readerObserver) { readerObserver.disconnect(); readerObserver = null; }
  window.removeEventListener('scroll', checkExtremeScrolls);
}
