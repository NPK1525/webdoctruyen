// Home variables
let genresList = [];
let themesList = [];
let mangas = [];
let searchVal = '';
let selectedType = 'All';
let selectedGenreId = null;
let selectedThemeId = null;
let selectedStatus = '';
let selectedDemographic = '';
let selectedFormat = '';
let page = 1;
const pageSize = 12;
let totalCount = 0;
let loading = false;

// Featured Slider variables
let featuredMangas = [];
let currentSlideIndex = 0;
let sliderInterval = null;
let slideDirection = 'right';

// DOMContentLoaded triggers
document.addEventListener('DOMContentLoaded', async () => {
  // Read query parameters
  const params = new URLSearchParams(window.location.search);
  const q = params.get('search');
  if (q) {
    searchVal = q;
  }

  // Pre-load filters UI
  initFiltersUI();

  // Fetch initial data
  await fetchGenres();
  await fetchThemes();
  await fetchFeaturedMangas();
  await fetchMangas();
  initAdvancedFilters();
});

// Callback from common.js search trigger
function onHomeSearchTriggered(query) {
  searchVal = query;
  page = 1;
  fetchMangas();
}

// Genres fetching
async function fetchGenres() {
  try {
    const res = await fetch(`${API_BASE}/genre`);
    if (res.ok) {
      genresList = await res.json();
      renderGenresDropdown();
    }
  } catch (e) {
    console.error("Error fetching genres:", e);
  }
}

// Featured Mangas fetching
async function fetchFeaturedMangas() {
  try {
    const res = await fetch(`${API_BASE}/manga/featured`);
    if (res.ok) {
      const data = await res.json();
      featuredMangas = data;

      if (featuredMangas.length > 0) {
        renderFeaturedSlider();
        startFeaturedSlider();
      }
    }
  } catch (e) {
    console.error("Error fetching featured mangas:", e);
  }
}

// Themes fetching
async function fetchThemes() {
  try {
    const res = await fetch(`${API_BASE}/theme`);
    if (res.ok) {
      themesList = await res.json();
      renderThemesDropdown();
    }
  } catch (e) {
    console.error("Error fetching themes:", e);
  }
}

// Mangas fetching
async function fetchMangas() {
  loading = true;
  toggleLoadingState(true);

  try {
    // Tạo URL gọi API theo bộ lọc hiện tại của trang chủ.
    let url = `${API_BASE}/manga?page=${page}&pageSize=${pageSize}`;
    if (selectedType !== 'All') {
      const typeInt = selectedType === 'Manga' ? 0 : selectedType === 'Manhwa' ? 1 : 2;
      url += `&type=${typeInt}`;
    }
    if (selectedGenreId !== null) {
      url += `&genreId=${selectedGenreId}`;
    }
    if (selectedThemeId !== null) {
      url += `&themeId=${selectedThemeId}`;
    }
    if (selectedStatus !== '') {
      url += `&status=${selectedStatus}`;
    }
    if (selectedDemographic !== '') {
      url += `&demographic=${selectedDemographic}`;
    }
    if (selectedFormat !== '') {
      url += `&format=${selectedFormat}`;
    }
    if (searchVal.trim() !== '') {
      url += `&search=${encodeURIComponent(searchVal)}`;
    }

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      // Lưu dữ liệu trả về rồi render lại carousel và danh sách cập nhật mới nhất.
      mangas = data.items;
      totalCount = data.totalCount;
      renderMangaGrid();
    }
  } catch (e) {
    console.error("Error fetching mangas list:", e);
  } finally {
    loading = false;
    toggleLoadingState(false);
  }
}

function toggleLoadingState(isLoading) {
  const placeholder = document.getElementById('manga-loading-placeholder');
  const swiperView = document.getElementById('manga-swiper-view');
  if (placeholder) placeholder.style.display = isLoading ? 'flex' : 'none';
  if (swiperView) swiperView.style.display = isLoading ? 'none' : 'block';
}

// Render genres dropdown
function renderGenresDropdown() {
  const container = document.getElementById('genres-list-container');
  if (!container) return;

  container.innerHTML = genresList.map(g => `
    <div class="dropdown-item ${selectedGenreId === g.id ? 'active' : ''}" data-genre-id="${g.id}">
      ${g.name}
    </div>
  `).join('');

  // Attach click listener to dropdown items
  document.querySelectorAll('#genre-select-options .dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Toggle active states
      document.querySelectorAll('#genre-select-options .dropdown-item').forEach(i => i.classList.remove('active'));
      e.currentTarget.classList.add('active');

      const gIdStr = e.currentTarget.dataset.genreId;
      selectedGenreId = (gIdStr === 'null' || !gIdStr) ? null : Number(gIdStr);

      const label = document.getElementById('current-genre-label');
      if (label) {
        label.textContent = selectedGenreId
          ? (genresList.find(g => g.id === selectedGenreId)?.name || t('filter.genre', 'Thể loại'))
          : t('filter.genre', 'Thể loại');
      }

      page = 1;
      fetchMangas();
    });
  });
}

// Featured Slider logic
function startFeaturedSlider() {
  stopFeaturedSlider();
  if (featuredMangas.length === 0) return;
  sliderInterval = setInterval(() => {
    slideDirection = 'right';
    currentSlideIndex = (currentSlideIndex + 1) % featuredMangas.length;
    renderFeaturedSlider();
  }, 6000);
}

function stopFeaturedSlider() {
  if (sliderInterval) {
    clearInterval(sliderInterval);
    sliderInterval = null;
  }
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

function renderFeaturedSlider() {
  const container = document.getElementById('featured-slider-container');
  if (!container || featuredMangas.length === 0) return;

  const manga = featuredMangas[currentSlideIndex];

  const demographicMap = { 0: '', 1: 'Shounen', 2: 'Shoujo', 3: 'Seinen', 4: 'Josei' };
  const demographicText = manga.demographic ? (demographicMap[manga.demographic] || '') : '';

  const genresBadge = manga.genres ? manga.genres.slice(0, 3).map(g => `
    <span class="featured-slider-badge-genre">${g}</span>
  `).join(' ') : '';

  const authorNames = manga.authors && manga.authors.length > 0
    ? manga.authors.map(a => a.name).join(', ')
    : t('common.updating', 'Đang cập nhật');

  container.innerHTML = `
    <div class="featured-slider-card animate-fade-only">
      <!-- Background blurred cover -->
      <img class="featured-slider-bg" src="${manga.coverUrl}" alt="" />
      <div class="banner-blur-overlay"></div>
      <div class="featured-slider-overlay"></div>

      <!-- Centered Content Wrapper -->
      <div class="container" style="position: relative; z-index: 3; height: 100%; display: flex; flex-direction: column; justify-content: flex-start; padding-top: 85px; padding-bottom: 24px;">
        <h3 class="section-title" style="margin-bottom: 16px; margin-top: 0; color: white;">Popular New Titles</h3>

        <div class="featured-slider-content ${slideDirection === 'right' ? 'animate-slide-right' : 'animate-slide-left'}">
          <!-- Left: Cover Image -->
          <div class="featured-slider-cover-wrapper" id="slider-manga-cover">
            <img src="${manga.coverUrl}" alt="${manga.title}" />
          </div>

          <!-- Right: Manga Details -->
          <div class="featured-slider-info">
            <div class="featured-slider-info-top">
              <h2 class="featured-slider-title" id="slider-manga-title">${manga.title}</h2>

              <div class="featured-slider-badges">
                <span class="${getTypeBadgeClass(manga.type)}" style="padding: 2px 8px; font-size: 0.68rem; line-height: 1;">${manga.type}</span>
                ${demographicText ? `<span class="featured-slider-badge-genre" style="background-color: rgba(255, 140, 0, 0.15); border-color: rgba(255, 140, 0, 0.3); color: #FF8C00;">${demographicText}</span>` : ''}
                ${genresBadge}
              </div>

              <p class="featured-slider-desc">${manga.description || t('common.noDescription', 'Chưa có tóm tắt cho truyện này.')}</p>
            </div>

            <div class="featured-slider-info-bottom">
              <div class="featured-slider-author">${authorNames}</div>
              <div class="featured-slider-nav">
                <span class="featured-slider-nav-number">NO. ${currentSlideIndex + 1}</span>
                <button id="slider-prev-btn" class="featured-slider-nav-btn" title="${t('slider.prev', 'Trở lại')}">
                  <i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i>
                </button>
                <button id="slider-next-btn" class="featured-slider-nav-btn" title="${t('slider.next', 'Tiếp theo')}">
                  <i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Slider events
  document.getElementById('slider-manga-title')?.addEventListener('click', () => {
    window.location.href = `/manga/${manga.id}`;
  });

  document.getElementById('slider-manga-cover')?.addEventListener('click', () => {
    window.location.href = `/manga/${manga.id}`;
  });
  document.getElementById('slider-prev-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    slideDirection = 'left';
    currentSlideIndex = (currentSlideIndex - 1 + featuredMangas.length) % featuredMangas.length;
    renderFeaturedSlider();
    startFeaturedSlider();
  });

  document.getElementById('slider-next-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    slideDirection = 'right';
    currentSlideIndex = (currentSlideIndex + 1) % featuredMangas.length;
    renderFeaturedSlider();
    startFeaturedSlider();
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Render themes dropdown
function renderThemesDropdown() {
  const container = document.getElementById('themes-list-container');
  if (!container) return;

  container.innerHTML = themesList.map(theme => `
    <div class="dropdown-item ${selectedThemeId === theme.id ? 'active' : ''}" data-theme-id="${theme.id}">
      ${theme.name}
    </div>
  `).join('');

  document.querySelectorAll('#theme-select-options .dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      document.querySelectorAll('#theme-select-options .dropdown-item').forEach(i => i.classList.remove('active'));
      e.currentTarget.classList.add('active');

      const tIdStr = e.currentTarget.dataset.themeId;
      selectedThemeId = (tIdStr === 'null' || !tIdStr) ? null : Number(tIdStr);

      const label = document.getElementById('current-theme-label');
      if (label) {
        label.textContent = selectedThemeId
          ? (themesList.find(th => th.id === selectedThemeId)?.name || t('filter.theme', 'Chủ đề'))
          : t('filter.theme', 'Chủ đề');
      }

      page = 1;
      fetchMangas();
    });
  });
}

// Advanced filters initialization
function initAdvancedFilters() {
  // Status filter
  const statusEl = document.getElementById('filter-status');
  if (statusEl) {
    statusEl.addEventListener('change', () => {
      selectedStatus = statusEl.value;
      page = 1;
      fetchMangas();
    });
  }

  // Demographic filter
  const demoEl = document.getElementById('filter-demographic');
  if (demoEl) {
    demoEl.addEventListener('change', () => {
      selectedDemographic = demoEl.value;
      page = 1;
      fetchMangas();
    });
  }

  // Format filter
  const formatEl = document.getElementById('filter-format');
  if (formatEl) {
    formatEl.addEventListener('change', () => {
      selectedFormat = formatEl.value;
      page = 1;
      fetchMangas();
    });
  }

  // Theme dropdown toggle
  const themeTrigger = document.getElementById('theme-select-trigger');
  const themeOptions = document.getElementById('theme-select-options');
  const themeChevron = document.getElementById('theme-dropdown-chevron');

  if (themeTrigger && themeOptions) {
    themeTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = themeOptions.style.display === 'none';
      themeOptions.style.display = isHidden ? 'block' : 'none';
      if (themeChevron) themeChevron.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(-90deg)';
    });

    document.addEventListener('click', () => {
      themeOptions.style.display = 'none';
      if (themeChevron) themeChevron.style.transform = 'rotate(-90deg)';
    });
  }

  // Clear filters button
  const clearBtn = document.getElementById('clear-filters-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAllFilters);
  }
}

function clearAllFilters() {
  selectedType = 'All';
  selectedGenreId = null;
  selectedThemeId = null;
  selectedStatus = '';
  selectedDemographic = '';
  selectedFormat = '';
  searchVal = '';
  page = 1;

  // Reset type buttons
  document.querySelectorAll('.type-filter-btn').forEach(b => {
    b.classList.remove('active');
    b.style.backgroundColor = 'transparent';
    b.style.color = 'var(--text-muted)';
  });
  const allBtn = document.querySelector('.type-filter-btn[data-type="All"]');
  if (allBtn) {
    allBtn.classList.add('active');
    allBtn.style.backgroundColor = 'var(--accent-primary)';
    allBtn.style.color = 'white';
  }

  // Reset genre label
  const genreLabel = document.getElementById('current-genre-label');
  if (genreLabel) genreLabel.textContent = t('filter.genre', 'Thể loại');
  document.querySelectorAll('#genre-select-options .dropdown-item').forEach(i => i.classList.remove('active'));
  const allGenreItem = document.querySelector('#genre-select-options .dropdown-item[data-genre-id="null"]');
  if (allGenreItem) allGenreItem.classList.add('active');

  // Reset theme label
  const themeLabel = document.getElementById('current-theme-label');
  if (themeLabel) themeLabel.textContent = t('filter.theme', 'Chủ đề');
  document.querySelectorAll('#theme-select-options .dropdown-item').forEach(i => i.classList.remove('active'));
  const allThemeItem = document.querySelector('#theme-select-options .dropdown-item[data-theme-id="null"]');
  if (allThemeItem) allThemeItem.classList.add('active');

  // Reset selects
  document.getElementById('filter-status') && (document.getElementById('filter-status').value = '');
  document.getElementById('filter-demographic') && (document.getElementById('filter-demographic').value = '');
  document.getElementById('filter-format') && (document.getElementById('filter-format').value = '');
  document.getElementById('header-search-input') && (document.getElementById('header-search-input').value = '');

  fetchMangas();
}

// Filters triggers init
function initFiltersUI() {
  // Filters dropdown toggle
  const trigger = document.getElementById('genre-select-trigger');
  const options = document.getElementById('genre-select-options');
  const chevron = document.getElementById('genre-dropdown-chevron');

  if (trigger && options) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = options.style.display === 'none';
      options.style.display = isHidden ? 'block' : 'none';
      if (chevron) {
        chevron.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(-90deg)';
      }
    });

    document.addEventListener('click', () => {
      options.style.display = 'none';
      if (chevron) chevron.style.transform = 'rotate(-90deg)';
    });
  }

  // Type filter buttons tabs
  document.querySelectorAll('.type-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.type-filter-btn').forEach(b => {
        b.classList.remove('active');
        b.style.backgroundColor = 'transparent';
        b.style.color = 'var(--text-muted)';
      });

      const target = e.currentTarget;
      target.classList.add('active');
      target.style.backgroundColor = 'var(--accent-primary)';
      target.style.color = 'white';

      selectedType = target.dataset.type || 'All';
      page = 1;
      fetchMangas();
    });
  });
}

// Swiper instance
let mangaSwiperInstance = null;

function renderMangaGrid() {
  // Container này là swiper-wrapper ngoài trang chủ, nơi từng card truyện được đổ vào.
  const swiperWrapper = document.getElementById('manga-grid-container');
  if (!swiperWrapper) return;

  const cardHTML = (m) => `
    <div class="glass-card manga-card" style="display:flex;flex-direction:column;overflow:hidden;border-radius:var(--radius-md);cursor:pointer;" data-manga-id="${m.id}">
      <div style="position:relative;aspect-ratio:2/3;overflow:hidden;border-radius:var(--radius-md);">
        <img src="${m.coverUrl || ''}" alt="${m.title}" style="width:100%;height:100%;object-fit:cover;" loading="lazy" />
        <span class="${getTypeBadgeClass(m.type)}" style="position:absolute;top:8px;left:8px;font-size:0.65rem;">${getTypeLabel(m.type)}</span>
      </div>
      <div style="padding:8px 6px 6px;">
        <h4 style="font-size:0.85rem;font-weight:700;color:var(--text-main);margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.3;">${m.title}</h4>
      </div>
    </div>`;

  if (mangas.length === 0) {
    swiperWrapper.innerHTML = `<div class="swiper-slide" style="text-align:center;color:var(--text-muted);padding:40px 0;">Không tìm thấy truyện tranh phù hợp.</div>`;
  } else {
    swiperWrapper.innerHTML = mangas.map(m => `<div class="swiper-slide">${cardHTML(m)}</div>`).join('');
  }

  if (mangaSwiperInstance) { mangaSwiperInstance.destroy(true, true); mangaSwiperInstance = null; }

  if (typeof Swiper !== 'undefined') {
    mangaSwiperInstance = new Swiper('.manga-swiper', {
      slidesPerView: 2,
      spaceBetween: 12,
      loop: true,
      autoplay: { delay: 2500, disableOnInteraction: false, pauseOnMouseEnter: true },
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      grabCursor: true,
      breakpoints: {
        480:  { slidesPerView: 3, spaceBetween: 12 },
        768:  { slidesPerView: 4, spaceBetween: 16 },
        1024: { slidesPerView: 5, spaceBetween: 18 },
        1280: { slidesPerView: 6, spaceBetween: 20 },
      }
    });
  }

  document.querySelectorAll('.manga-card[data-manga-id]').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `/manga/${card.dataset.mangaId}`;
    });
  });

  // Render Latest Updates
  renderLatestUpdates();
}




// ========== LATEST UPDATES ==========
function renderLatestUpdates() {
  const container = document.getElementById('latest-updates-container');
  if (!container) return;

  if (!mangas || mangas.length === 0) {
    container.innerHTML = `<div class="latest-update-empty">${t('common.noData', 'Chưa có truyện để hiển thị.')}</div>`;
    return;
  }

  const items = [...mangas]
    .map(m => ({ ...m, latest: (m.latestChapters || [])[0] || null }))
    .sort((a, b) => {
      const aTime = a.latest?.uploadedAt ? new Date(a.latest.uploadedAt).getTime() : 0;
      const bTime = b.latest?.uploadedAt ? new Date(b.latest.uploadedAt).getTime() : 0;
      return bTime - aTime;
    });

  container.innerHTML = `<div class="latest-updates-list">${items.map(m => {
    const latest = m.latest;
    const dateText = latest?.uploadedAt ? new Date(latest.uploadedAt).toLocaleDateString('vi-VN') : '';
    return `
      <div class="latest-update-item" data-manga-id="${m.id}">
        <img class="latest-update-cover" src="${m.coverUrl || MOCK_WHITE_IMAGE}" alt="${m.title}" loading="lazy" />
        <div class="latest-update-info">
          <p class="latest-update-title">${m.title}</p>
          <div class="latest-update-meta">
            ${latest
              ? `<a class="latest-update-chapter" href="/chapter/${latest.id}" onclick="event.stopPropagation()">${t('common.chapter', 'Chương')} ${latest.chapterNumber}</a>
                 <span>${dateText}</span>`
              : `<span>${t('detail.noChapters', 'Chưa có chương')}</span>`
            }
          </div>
        </div>
        <span class="${getTypeBadgeClass(m.type)}" style="font-size:0.65rem;flex-shrink:0;">${getTypeLabel(m.type)}</span>
      </div>`;
  }).join('')}</div>`;

  container.querySelectorAll('.latest-update-item').forEach(item => {
    item.addEventListener('click', () => {
      window.location.href = `/manga/${item.dataset.mangaId}`;
    });
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
