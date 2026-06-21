// Home variables
let genresList = [];
let mangas = [];
let searchVal = '';
let selectedType = 'All';
let selectedGenreId = null;
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
  await fetchFeaturedMangas();
  await fetchMangas();
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

// Mangas fetching
async function fetchMangas() {
  loading = true;
  toggleLoadingState(true);
  
  try {
    let url = `${API_BASE}/manga?page=${page}&pageSize=${pageSize}`;
    if (selectedType !== 'All') {
      const typeInt = selectedType === 'Manga' ? 0 : selectedType === 'Manhwa' ? 1 : 2;
      url += `&type=${typeInt}`;
    }
    if (selectedGenreId !== null) {
      url += `&genreId=${selectedGenreId}`;
    }
    if (searchVal.trim() !== '') {
      url += `&search=${encodeURIComponent(searchVal)}`;
    }

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      mangas = data.items;
      totalCount = data.totalCount;
      renderMangaGrid();
      renderPagination();
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
  const grid = document.getElementById('manga-grid-container');
  const pagination = document.getElementById('pagination-container');

  if (placeholder && grid && pagination) {
    if (isLoading) {
      placeholder.style.display = 'flex';
      grid.style.display = 'none';
      pagination.style.display = 'none';
    } else {
      placeholder.style.display = 'none';
      grid.style.display = 'grid';
      pagination.style.display = 'flex';
    }
  }
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
          ? (genresList.find(g => g.id === selectedGenreId)?.name || 'Thể loại') 
          : 'Thể loại';
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
  if (type === 'Manga') return 'badge badge-manga';
  if (type === 'Manhwa') return 'badge badge-manhwa';
  return 'badge badge-manhua';
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
    : 'Đang cập nhật';

  container.innerHTML = `
    <div class="featured-slider-card animate-fade-only">
      <!-- Background blurred cover -->
      <img class="featured-slider-bg" src="${manga.coverUrl}" alt="" />
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

              <p class="featured-slider-desc">${manga.description || 'Chưa có tóm tắt cho truyện này.'}</p>
            </div>

            <div class="featured-slider-info-bottom">
              <div class="featured-slider-author">${authorNames}</div>
              <div class="featured-slider-nav">
                <span class="featured-slider-nav-number">NO. ${currentSlideIndex + 1}</span>
                <button id="slider-prev-btn" class="featured-slider-nav-btn" title="Trở lại">
                  <i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i>
                </button>
                <button id="slider-next-btn" class="featured-slider-nav-btn" title="Tiếp theo">
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
      target.style.backgroundColor = '#FF4552';
      target.style.color = 'white';

      selectedType = target.dataset.type || 'All';
      page = 1;
      fetchMangas();
    });
  });
}

// Render Manga List Grid
function renderMangaGrid() {
  const container = document.getElementById('manga-grid-container');
  if (!container) return;

  if (mangas.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px 0;">
        Không tìm thấy truyện tranh phù hợp.
      </div>
    `;
    return;
  }

  container.innerHTML = mangas.map(m => {
    const chaptersMarkup = m.latestChapters.slice(0, 2).map(c => `
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 8px; margin-top: 6px;">
        <a href="/chapter/${c.id}" class="chapter-link" style="color: white; font-weight: 600; cursor: pointer; transition: color 0.15s;">Chương ${c.chapterNumber}</a>
        <span style="color: var(--text-muted); font-size: 0.75rem;">${new Date(c.uploadedAt).toLocaleDateString('vi-VN')}</span>
      </div>
    `).join('');

    return `
      <div class="glass-card manga-card" style="display: flex; flex-direction: column; overflow: hidden; border-radius: var(--radius-md); padding: 12px;">
        <div style="position: relative; height: 220px; overflow: hidden; border-radius: var(--radius-sm); cursor: pointer;" class="card-cover" data-manga-id="${m.id}">
          <img src="${m.coverUrl}" alt="${m.title}" style="width: 100%; height: 100%; object-fit: cover;" />
          <span class="${getTypeBadgeClass(m.type)}" style="position: absolute; top: 10px; left: 10px;">${m.type}</span>
        </div>
        
        <div style="padding: 12px 4px 4px 4px; display: flex; flex-direction: column; flex: 1;">
          <h4 class="manga-title" data-manga-id="${m.id}" style="font-size: 1rem; font-weight: 700; color: white; margin: 0 0 6px 0; cursor: pointer; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; transition: color 0.15s;">
            ${m.title}
          </h4>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 36px;">
            ${m.description || 'Chưa có mô tả.'}
          </p>
          <div style="margin-top: auto;">${chaptersMarkup}</div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card navigation
  document.querySelectorAll('.card-cover, .manga-title').forEach(el => {
    el.addEventListener('click', (e) => {
      const mId = e.currentTarget.dataset.mangaId;
      if (mId) {
        window.location.href = `/manga/${mId}`;
      }
    });
  });

  // Adding hover style fixes
  document.querySelectorAll('.chapter-link').forEach(el => {
    el.addEventListener('mouseover', (e) => e.target.style.color = '#FF8C00');
    el.addEventListener('mouseout', (e) => e.target.style.color = 'white');
  });
  
  document.querySelectorAll('.manga-title').forEach(el => {
    el.addEventListener('mouseover', (e) => e.target.style.color = '#FF8C00');
    el.addEventListener('mouseout', (e) => e.target.style.color = 'white');
  });
}

// Render Pagination
function renderPagination() {
  const pageLabel = document.getElementById('page-number-label');
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  if (pageLabel) pageLabel.textContent = `Trang ${page} / ${totalPages}`;

  if (prevBtn) {
    if (page === 1) {
      prevBtn.disabled = true;
      prevBtn.style.opacity = '0.5';
      prevBtn.style.cursor = 'not-allowed';
    } else {
      prevBtn.disabled = false;
      prevBtn.style.opacity = '1';
      prevBtn.style.cursor = 'pointer';
    }
  }

  if (nextBtn) {
    if (page >= totalPages) {
      nextBtn.disabled = true;
      nextBtn.style.opacity = '0.5';
      nextBtn.style.cursor = 'not-allowed';
    } else {
      nextBtn.disabled = false;
      nextBtn.style.opacity = '1';
      nextBtn.style.cursor = 'pointer';
    }
  }
}

// Attach Pagination clicks
document.getElementById('prev-page-btn')?.addEventListener('click', () => {
  if (page > 1) {
    page--;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchMangas();
  }
});

document.getElementById('next-page-btn')?.addEventListener('click', () => {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (page < totalPages) {
    page++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchMangas();
  }
});

