// Detail state variables
let activeMangaId = null;
let mangaDetail = null;
let recommendations = [];
let chapterSort = 'desc';
let activeTab = 'chapters';
let libraryState = { isFollowing: false, readingStatus: null };
let chapterPage = 1;
const chapterPageSize = 12;
let pendingLibraryStatus = 'reading';

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSession();

  // Try server-injected data first (MVC mode)
  if (window.__MANGA_DETAIL__) {
    mangaDetail = window.__MANGA_DETAIL__;
    recommendations = window.__RECOMMENDATIONS__ || [];
    activeMangaId = mangaDetail.id;
    initTabs();
    renderMangaDetails();
    renderRecommendations();
    await loadLibraryState();
    initAddToLibraryModal();
    initAddToListButton();
    return;
  }

  // Fallback: fetch from API (legacy HTML mode)
  const params = new URLSearchParams(window.location.search);
  const mId = params.get('mangaId');
  if (!mId) {
    window.location.href = '/';
    return;
  }
  activeMangaId = Number(mId);
  initTabs();
  await fetchMangaDetail();
  await fetchRecommendations();
  await loadLibraryState();
  initAddToLibraryModal();
  initAddToListButton();
});

// Demographic mapping
const demographicMap = { 0: t('common.na', 'Không có'), 1: 'Shounen', 2: 'Shoujo', 3: 'Seinen', 4: 'Josei' };
const formatMap = { 0: t('common.na', 'Không có'), 1: 'Adaptation', 2: 'WebComic', 3: 'OneShot', 4: 'Comic', 5: 'Book' };

async function loadLibraryState() {
  const item = currentUser && activeMangaId ? getLocalLibraryItem(activeMangaId) : null;
  const historyItem = activeMangaId && typeof readLocalReadingHistory === 'function'
    ? readLocalReadingHistory().find(entry => Number(entry.mangaId) === Number(activeMangaId))
    : null;
  libraryState = {
    isFollowing: Boolean(item),
    readingStatus: item?.readingStatus || null,
    lastChapterId: historyItem?.chapterId || item?.lastChapterId || null,
    lastChapterNumber: historyItem?.chapterNumber || item?.lastChapterNumber || null
  };
  updateBookmarkButton();
  updateLibraryStatusButton();
  updateContinueReadingButton();
}

function updateContinueReadingButton() {
  const button = document.getElementById('btn-continue-reading');
  const label = button?.querySelector('span');
  if (!label) return;
  const hasReadingHistory = Boolean(libraryState.lastChapterId);
  const key = hasReadingHistory ? 'detail.continueReading' : 'detail.startReading';
  label.dataset.i18n = key;
  label.textContent = hasReadingHistory
    ? t(key, 'Tiếp tục đọc')
    : t(key, 'Bắt đầu đọc');
}

function updateBookmarkButton() {
  const bookmarkBtn = document.getElementById('btn-bookmark-manga');
  if (!bookmarkBtn) return;

  if (!currentUser) {
    bookmarkBtn.innerHTML = `<i data-lucide="bookmark" style="width: 16px; height: 16px;"></i> ${t('detail.addShelf', 'Thêm tủ sách')}`;
    bookmarkBtn.onclick = () => openAuthModal('login');
  } else if (libraryState.isFollowing) {
    bookmarkBtn.innerHTML = `<i data-lucide="bookmark-minus" style="width: 16px; height: 16px;"></i> ${t('detail.unfollow', 'Bỏ theo dõi')}`;
    bookmarkBtn.onclick = toggleFollow;
  } else {
    bookmarkBtn.innerHTML = `<i data-lucide="bookmark" style="width: 16px; height: 16px;"></i> ${t('detail.follow', 'Theo dõi')}`;
    bookmarkBtn.onclick = toggleFollow;
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function toggleFollow() {
  openAddToLibraryModal();
}

// Fetch manga detail data (legacy)
async function fetchMangaDetail() {
  toggleDetailLoading(true);
  try {
    const res = await fetch(`${API_BASE}/manga/${activeMangaId}`);
    if (res.ok) {
      mangaDetail = await res.json();
      renderMangaDetails();
    } else {
      showToast(t('common.error', 'Lỗi tải thông tin chi tiết truyện từ máy chủ.'), 'error');
      window.location.href = '/';
    }
  } catch (e) {
    console.error("Error fetching manga details:", e);
  } finally {
    toggleDetailLoading(false);
  }
}

async function fetchRecommendations() {
  try {
    const res = await fetch(`${API_BASE}/manga/${activeMangaId}/recommendations?limit=6`);
    if (res.ok) {
      recommendations = await res.json();
      renderRecommendations();
    }
  } catch (e) {
    console.error("Error fetching recommendations:", e);
  }
}

function toggleDetailLoading(isLoading) {
  const spinner = document.getElementById('detail-loading-spinner');
  const mainContent = document.getElementById('detail-main-content');
  if (spinner && mainContent) {
    spinner.style.display = isLoading ? 'flex' : 'none';
    mainContent.style.display = isLoading ? 'none' : 'block';
  }
}

function getStatusText(status) {
  if (status === 'Ongoing' || status === 0) return t('status.ongoing', 'Đang tiến hành');
  if (status === 'Completed' || status === 1) return t('status.completed', 'Đã hoàn thành');
  return t('status.hiatus', 'Tạm ngưng');
}

function getTypeBadgeClass(type) {
  if (type === 'Manga' || type === 0) return 'badge badge-manga';
  if (type === 'Manhwa' || type === 1) return 'badge badge-manhwa';
  return 'badge badge-manhua';
}

function getTypeLabel(type) {
  if (type === 'Manga' || type === 0) return 'Manga';
  if (type === 'Manhwa' || type === 1) return 'Manhwa';
  return 'Manhua';
}

function renderMangaDetails() {
  if (!mangaDetail) return;

  document.getElementById('manga-detail-title').textContent = mangaDetail.title;
  document.title = `${mangaDetail.title} - MangaNPK`;

  const bannerBg = document.getElementById('banner-bg-container');
  if (bannerBg) {
    bannerBg.innerHTML = `<img src="${mangaDetail.coverUrl}" class="banner-bg-img" alt="${mangaDetail.title}" /><div class="banner-blur-overlay"></div><div class="banner-bg-overlay"></div>`;
  }

  const coverContainer = document.getElementById('manga-detail-cover-container');
  if (coverContainer) {
    coverContainer.innerHTML = `<img src="${mangaDetail.coverUrl}" alt="${mangaDetail.title}" />`;
  }

  const typeContainer = document.getElementById('manga-type-badge-container');
  if (typeContainer) {
    typeContainer.innerHTML = `
      <span class="${getTypeBadgeClass(mangaDetail.type)}">${getTypeLabel(mangaDetail.type)}</span>
      <span class="badge" style="background-color: rgba(255,69,82,0.15); color: #FF4552; border: 1px solid rgba(255,69,82,0.3);">${getStatusText(mangaDetail.status)}</span>
    `;
  }

  const authorsText = mangaDetail.authors && mangaDetail.authors.length > 0
    ? mangaDetail.authors.map(a => `${a.name} (${a.role})`).join(', ')
    : t('detail.updating', 'Đang cập nhật');
  document.getElementById('manga-detail-authors').textContent = `${t('detail.author', 'Tác giả')}: ${authorsText}`;

  const altTitle = document.getElementById('manga-detail-alt-title');
  if (altTitle) {
    altTitle.textContent = mangaDetail.alternativeTitle || '';
    altTitle.style.display = mangaDetail.alternativeTitle ? 'block' : 'none';
  }

  const descText = document.getElementById('manga-description-text');
  if (descText) descText.textContent = mangaDetail.description || t('common.noData', 'Chưa có tóm tắt chi tiết.');

  const tagsContainer = document.getElementById('manga-genres-tags');
  if (tagsContainer) {
    const tags = DetailTaxonomy.buildDetailTags(
      mangaDetail.contentWarnings,
      mangaDetail.genres || [],
      mangaDetail.themes || []
    );
    tagsContainer.innerHTML = tags.map(tag => {
      const warningClass = tag.kind === 'warning' ? `content-warning warning-${tag.tone || 'normal'}` : '';
      return `<span class="tag ${warningClass}">${escapeDetailHtml(tag.label)}</span>`;
    }).join('');
  }

  const viewCount = document.getElementById('detail-view-count');
  if (viewCount) viewCount.textContent = formatCompactNumber(mangaDetail.viewCount || 0);
  const chapterCount = document.getElementById('detail-chapter-count');
  if (chapterCount) chapterCount.textContent = mangaDetail.chapters?.length || 0;

  document.getElementById('manga-status-val').textContent = getStatusText(mangaDetail.status);
  document.getElementById('manga-release-year-val').textContent = mangaDetail.releaseYear || t('common.na', 'N/A');
  document.getElementById('manga-created-date-val').textContent = mangaDetail.createdAt ? new Date(mangaDetail.createdAt).toLocaleDateString('vi-VN') : t('common.na', 'N/A');

  const demoBadge = document.getElementById('manga-demographic-badge');
  if (demoBadge) {
    const demoVal = typeof mangaDetail.demographic === 'number' ? mangaDetail.demographic : 0;
    demoBadge.innerHTML = `<span class="value-tag">${demographicMap[demoVal] || t('common.na', 'Không có')}</span>`;
  }

  const formatBadge = document.getElementById('manga-format-badge');
  if (formatBadge) {
    const formatVal = typeof mangaDetail.format === 'number' ? mangaDetail.format : 0;
    formatBadge.innerHTML = `<span class="value-tag">${formatMap[formatVal] || t('common.na', 'Không có')}</span>`;
  }

  updateLibraryStatusButton();

  const continueBtn = document.getElementById('btn-continue-reading');
  if (continueBtn) {
    updateContinueReadingButton();
    continueBtn.onclick = () => {
      if (libraryState.lastChapterId) {
        window.location.href = `/chapter/${libraryState.lastChapterId}`;
        return;
      }
      openFirstChapter();
    };
  }

  document.getElementById('btn-report-manga')?.addEventListener('click', () => {
    openReportModal({ targetType: 'Manga', mangaId: activeMangaId, title: mangaDetail?.title, coverUrl: mangaDetail?.coverUrl, identifier: mangaDetail?.externalId });
  });

  const bookmarkBtn = document.getElementById('btn-bookmark-manga');
  if (bookmarkBtn && !bookmarkBtn.onclick) {
    bookmarkBtn.onclick = () => openAuthModal('login');
  }

  renderChaptersList();
}

window.addEventListener('manganpk:localechanged', updateContinueReadingButton);

async function incrementMangaViewCount() {
  if (!activeMangaId) return;
  try {
    const res = await apiFetch(`${API_BASE}/manga/${activeMangaId}/view`, { method: 'POST' });
    if (!res.ok) return;
    const data = await res.json();
    if (mangaDetail && Number.isFinite(Number(data.viewCount))) mangaDetail.viewCount = Number(data.viewCount);
    const viewCount = document.getElementById('detail-view-count');
    if (viewCount && Number.isFinite(Number(data.viewCount))) viewCount.textContent = formatCompactNumber(Number(data.viewCount));
  } catch (e) {
    console.error('View count update error:', e);
  }
}

function openFirstChapter() {
  if (mangaDetail?.chapters && mangaDetail.chapters.length > 0) {
    const sorted = [...mangaDetail.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
    window.location.href = `/chapter/${sorted[0].id}`;
  } else {
    showToast(t('detail.noChapters', 'Truyện chưa có chương nào được tải lên!'), 'warning');
  }
}

function renderChaptersList() {
  if (!mangaDetail || !mangaDetail.chapters) return;

  const countLabel = document.getElementById('chapters-count-label');
  if (countLabel) countLabel.textContent = t('detail.chapterList', 'Danh sách chương');

  const container = document.getElementById('chapters-list-container');
  if (!container) return;

  if (mangaDetail.chapters.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px 0;">${t('detail.noChapters', 'Truyện chưa có chương nào.')}</p>`;
    renderChapterPagination(0);
    return;
  }

  const sorted = [...mangaDetail.chapters].sort((a, b) =>
    chapterSort === 'desc' ? b.chapterNumber - a.chapterNumber : a.chapterNumber - b.chapterNumber
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / chapterPageSize));
  chapterPage = Math.min(Math.max(1, chapterPage), totalPages);
  const pageItems = sorted.slice((chapterPage - 1) * chapterPageSize, chapterPage * chapterPageSize);
  const readUpTo = libraryState.lastChapterNumber || 0;

  container.innerHTML = pageItems.map(c => {
    const isRead = readUpTo > 0 && c.chapterNumber <= readUpTo;
    const title = c.title && c.title !== `Chương ${c.chapterNumber}` ? c.title : t('detail.noChapterTitle', 'Chưa có tiêu đề');
    return `
    <div class="detail-chapter-row ${isRead ? 'is-read' : ''}">
      <div class="detail-chapter-left">
        <i data-lucide="${isRead ? 'check-circle' : 'eye'}" class="detail-chapter-state"></i>
        <div class="detail-chapter-text">
          <a href="/chapter/${c.id}" class="detail-chapter-title">${t('detail.chapter', 'Chương')} ${c.chapterNumber}</a>
          <span class="detail-chapter-subtitle">${escapeDetailHtml(title)}</span>
        </div>
      </div>
      <div class="detail-chapter-meta">
        <span><i data-lucide="clock"></i>${new Date(c.uploadedAt).toLocaleDateString('vi-VN')}</span>
        <span><i data-lucide="message-square"></i>0</span>
      </div>
    </div>
  `;
  }).join('');
  renderChapterPagination(totalPages);

  const sortBtn = document.getElementById('btn-sort-chapters');
  if (sortBtn) {
    sortBtn.onclick = () => {
      chapterSort = chapterSort === 'desc' ? 'asc' : 'desc';
      chapterPage = 1;
      sortBtn.innerHTML = `<i data-lucide="layers" style="width: 14px; height: 14px;"></i> ${chapterSort === 'desc' ? t('detail.newestFirst', 'Mới nhất trước') : t('detail.oldestFirst', 'Cũ nhất trước')}`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      renderChaptersList();
    };
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderChapterPagination(totalPages) {
  const pagination = document.getElementById('chapters-pagination');
  if (!pagination) return;

  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  const pages = Array.from({ length: totalPages }, (_, idx) => idx + 1);
  pagination.innerHTML = `
    <button class="chapter-page-btn" data-page="${chapterPage - 1}" ${chapterPage === 1 ? 'disabled' : ''}>
      <i data-lucide="chevron-left"></i>
    </button>
    <div class="chapter-page-numbers">
      ${pages.map(page => `<button class="chapter-page-number ${page === chapterPage ? 'active' : ''}" data-page="${page}">${page}</button>`).join('')}
    </div>
    <button class="chapter-page-btn" data-page="${chapterPage + 1}" ${chapterPage === totalPages ? 'disabled' : ''}>
      <i data-lucide="chevron-right"></i>
    </button>
  `;

  pagination.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextPage = Number(btn.dataset.page);
      if (!Number.isFinite(nextPage) || nextPage < 1 || nextPage > totalPages || nextPage === chapterPage) return;
      chapterPage = nextPage;
      renderChaptersList();
    });
  });
}

function formatCompactNumber(value) {
  const number = Number(value) || 0;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(number >= 10_000_000 ? 0 : 1)}m`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(number >= 10_000 ? 0 : 1)}k`;
  return String(number);
}

function escapeDetailHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function initAddToLibraryModal() {
  const button = document.getElementById('btn-library-status');
  if (button) button.onclick = openAddToLibraryModal;
  document.getElementById('add-library-close')?.addEventListener('click', closeAddToLibraryModal);
  document.getElementById('add-library-cancel')?.addEventListener('click', closeAddToLibraryModal);
  document.querySelector('#add-to-library-modal .add-library-backdrop')?.addEventListener('click', closeAddToLibraryModal);
  document.getElementById('add-library-status-select')?.addEventListener('click', () => {
    document.getElementById('add-library-status-menu')?.classList.toggle('open');
    document.getElementById('add-library-status-select')?.classList.toggle('open');
  });
  document.getElementById('add-library-submit')?.addEventListener('click', submitAddToLibrary);
  renderAddLibraryStatusMenu();
  updateLibraryStatusButton();
}

function openAddToLibraryModal() {
  if (!currentUser) {
    openAuthModal('login');
    return;
  }
  pendingLibraryStatus = libraryState.readingStatus || 'reading';
  const modal = document.getElementById('add-to-library-modal');
  const cover = document.getElementById('add-library-cover');
  const title = document.getElementById('add-library-title');
  if (cover) cover.src = mangaDetail.coverUrl || '';
  if (title) title.textContent = mangaDetail.title || '';
  modal?.classList.add('open');
  modal?.setAttribute('aria-hidden', 'false');
  updateAddLibrarySelectedStatus();
  updateAddLibrarySubmitLabel();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeAddToLibraryModal() {
  const modal = document.getElementById('add-to-library-modal');
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden', 'true');
  document.getElementById('add-library-status-menu')?.classList.remove('open');
  document.getElementById('add-library-status-select')?.classList.remove('open');
}

function renderAddLibraryStatusMenu() {
  const menu = document.getElementById('add-library-status-menu');
  if (!menu) return;
  const options = [{ value: 'none', label: 'None', i18n: 'library.status.none', icon: 'minus' }, ...LIBRARY_STATUSES];
  menu.innerHTML = options.map(option => `
    <button class="add-library-status-option" data-status="${option.value}" type="button">
      <span>${t(option.i18n, option.label)}</span>
    </button>
  `).join('');
  menu.querySelectorAll('[data-status]').forEach(option => {
    option.addEventListener('click', () => {
      pendingLibraryStatus = option.dataset.status;
      updateAddLibrarySelectedStatus();
      menu.classList.remove('open');
      document.getElementById('add-library-status-select')?.classList.remove('open');
    });
  });
}

function updateAddLibrarySelectedStatus() {
  const label = document.getElementById('add-library-selected-label');
  const iconButton = document.getElementById('add-library-status-icon');
  const meta = getLibraryStatusMeta(pendingLibraryStatus);
  if (label) label.textContent = pendingLibraryStatus === 'none' ? t('library.status.none', 'None') : getLibraryStatusLabel(pendingLibraryStatus);
  iconButton.innerHTML = `<i data-lucide="${meta?.icon || 'minus'}"></i>`;
  document.querySelectorAll('.add-library-status-option').forEach(option => {
    option.classList.toggle('active', option.dataset.status === pendingLibraryStatus);
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateAddLibrarySubmitLabel() {
  const submitButton = document.getElementById('add-library-submit');
  if (!submitButton) return;
  submitButton.textContent = libraryState.readingStatus ? t('common.update', 'Update') : t('common.add', 'Add');
}

function submitAddToLibrary() {
  if (!currentUser) {
    openAuthModal('login');
    return;
  }
  if (pendingLibraryStatus === 'none') {
    removeLocalLibraryItem(activeMangaId);
    libraryState = { isFollowing: false, readingStatus: null };
  } else {
    const saved = saveLocalLibraryItem(mangaDetail, pendingLibraryStatus);
    libraryState = { isFollowing: true, readingStatus: saved.readingStatus };
  }
  updateBookmarkButton();
  updateLibraryStatusButton();
  closeAddToLibraryModal();
}

function updateLibraryStatusButton() {
  const button = document.getElementById('btn-library-status');
  if (!button) return;
  const status = libraryState.readingStatus;
  const meta = getLibraryStatusMeta(status);
  const label = status ? getLibraryStatusLabel(status) : t('library.addToLibrary', 'Add To Library');
  button.innerHTML = `<i data-lucide="${meta?.icon || 'library'}" style="width: 16px; height: 16px;"></i><span>${label}</span>`;
  button.onclick = openAddToLibraryModal;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderRecommendations() {
  const container = document.getElementById('recommendations-grid-container');
  if (!container) return;

  if (!recommendations || recommendations.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px 0;">${t('detail.noRecommendations', 'Không có truyện gợi ý tương tự.')}</p>`;
    return;
  }

  container.innerHTML = recommendations.map(rec => `
    <div class="glass-card rec-card" style="display: flex; flex-direction: column; overflow: hidden; border-radius: var(--radius-md); padding: 0; background-color: var(--bg-card);" data-manga-id="${rec.id}">
      <div style="height: 180px; overflow: hidden; position: relative;">
        <img src="${rec.coverUrl}" alt="${rec.title}" style="width: 100%; height: 100%; object-fit: cover;" />
        <div style="position: absolute; top: 8px; left: 8px;">
          <span class="${getTypeBadgeClass(rec.type)}" style="font-size: 0.65rem; padding: 2px 6px;">${getTypeLabel(rec.type)}</span>
        </div>
      </div>
      <div style="padding: 10px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
        <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-main); margin: 0 0 4px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.2;">${rec.title}</h4>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${rec.releaseYear || t('common.na', 'N/A')} &bull; ${getStatusText(rec.status)}</span>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.rec-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const mId = e.currentTarget.dataset.mangaId;
      if (mId) window.location.href = `/manga/${mId}`;
    });
  });
}

function initTabs() {
  document.querySelectorAll('.detail-tabs .tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.detail-tabs .tab').forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      activeTab = e.currentTarget.dataset.tab;
      document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
      const pane = document.getElementById(`tab-content-${activeTab}`);
      if (pane) pane.style.display = 'block';
    });
  });
}
