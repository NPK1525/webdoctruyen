let advancedItems = [];
let advancedPage = 1;
let advancedTotalCount = 0;
let advancedFiltersOpen = false;
let advancedView = localStorage.getItem('manganpk_advanced_view') || 'list';
const advancedPageSize = 20;

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSession();
  initAdvancedSearchPage();
  fetchAdvancedManga();
});

function initAdvancedSearchPage() {
  const params = new URLSearchParams(window.location.search);
  const search = params.get('search') || params.get('q') || '';
  const searchInput = document.getElementById('advanced-search-input');
  if (searchInput) searchInput.value = search;

  document.getElementById('advanced-toggle-filters')?.addEventListener('click', toggleAdvancedFilters);
  document.getElementById('advanced-search-btn')?.addEventListener('click', () => {
    advancedPage = 1;
    fetchAdvancedManga();
  });
  document.getElementById('advanced-reset')?.addEventListener('click', resetAdvancedFilters);
  document.getElementById('advanced-lucky')?.addEventListener('click', goToRandomManga);
  searchInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      advancedPage = 1;
      fetchAdvancedManga();
    }
  });

  ['advanced-sort', 'advanced-type', 'advanced-demographic', 'advanced-status', 'advanced-year', 'advanced-rating'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      updateAdvancedResetState();
      advancedPage = 1;
      fetchAdvancedManga();
    });
  });

  searchInput?.addEventListener('input', updateAdvancedResetState);

  document.querySelectorAll('[data-advanced-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (advancedView === btn.dataset.advancedView) return;
      document.getElementById('advanced-results')?.classList.add('is-switching');
      advancedView = btn.dataset.advancedView;
      localStorage.setItem('manganpk_advanced_view', advancedView);
      renderAdvancedResults();
    });
  });

  syncAdvancedViewButtons();
  updateAdvancedResetState();
  updateAdvancedFiltersVisibility();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function buildAdvancedQuery(includePage = true) {
  const params = new URLSearchParams();
  const search = document.getElementById('advanced-search-input')?.value.trim() || '';
  const sort = document.getElementById('advanced-sort')?.value || '';
  const type = document.getElementById('advanced-type')?.value || '';
  const demographic = document.getElementById('advanced-demographic')?.value || '';
  const status = document.getElementById('advanced-status')?.value || '';
  const year = document.getElementById('advanced-year')?.value || '';

  if (includePage) {
    params.set('page', String(advancedPage));
    params.set('pageSize', String(advancedPageSize));
  }
  if (search) params.set('search', search);
  if (sort) params.set('sort', sort);
  if (type) params.set('type', type);
  if (demographic) params.set('demographic', demographic);
  if (status) params.set('status', status);
  if (year) params.set('releaseYear', year);
  return params;
}

async function fetchAdvancedManga() {
  const loading = document.getElementById('advanced-loading');
  const empty = document.getElementById('advanced-empty');
  if (loading) loading.style.display = 'block';
  if (empty) empty.style.display = 'none';

  try {
    const res = await fetch(`${API_BASE}/manga?${buildAdvancedQuery(true).toString()}`);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    advancedItems = data.items || [];
    advancedTotalCount = data.totalCount || 0;
    renderAdvancedResults();
    renderAdvancedPagination();
  } catch (error) {
    console.error('Advanced search error:', error);
    advancedItems = [];
    advancedTotalCount = 0;
    renderAdvancedResults();
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

function renderAdvancedResults() {
  const container = document.getElementById('advanced-results');
  const empty = document.getElementById('advanced-empty');
  const countLabel = document.getElementById('advanced-count-label');
  if (!container || !empty) return;

  if (countLabel) {
    countLabel.textContent = `${advancedTotalCount} ${advancedTotalCount === 1 ? 'Title' : 'Titles'}`;
  }

  syncAdvancedViewButtons();
  const isSwitching = container.classList.contains('is-switching');
  container.className = `library-items ${advancedView}${isSwitching ? ' is-switching' : ''}`;

  if (advancedItems.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
    empty.textContent = t('search.noResults', 'No manga found.');
    return;
  }

  empty.style.display = 'none';
  container.innerHTML = advancedItems.map(item => renderAdvancedItem(item, advancedView)).join('');
  requestAnimationFrame(() => container.classList.remove('is-switching'));
  bindAdvancedItems();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderAdvancedItem(item, view) {
  if (view === 'grid') return renderAdvancedGridItem(item);
  if (view === 'compact') return renderAdvancedCompactItem(item);
  return renderAdvancedListItem(item);
}

function renderAdvancedListItem(item) {
  return `
    <article class="library-list-item" data-manga-id="${item.id}">
      <img src="${item.coverUrl || MOCK_WHITE_IMAGE}" alt="${escapeAdvancedHtml(item.title)}" />
      <div class="library-list-main">
        <div class="library-item-title">${escapeAdvancedHtml(item.title)}</div>
        <div class="library-tags">${renderAdvancedTags(item)}</div>
        <p>${escapeAdvancedHtml(item.description || t('common.noDescription', 'No description.'))}</p>
      </div>
      <div class="library-item-stats">${renderAdvancedStats(item)}</div>
    </article>
  `;
}

function renderAdvancedCompactItem(item) {
  return `
    <article class="library-compact-item" data-manga-id="${item.id}">
      <img src="${item.coverUrl || MOCK_WHITE_IMAGE}" alt="${escapeAdvancedHtml(item.title)}" />
      <div class="library-compact-main">
        <div class="library-item-title">${escapeAdvancedHtml(item.title)}</div>
        <div class="library-compact-stats">${renderAdvancedStats(item)}</div>
        <div class="library-tags">${renderAdvancedTags(item, 7)}</div>
        <p>${escapeAdvancedHtml(item.description || t('common.noDescription', 'No description.'))}</p>
      </div>
    </article>
  `;
}

function renderAdvancedGridItem(item) {
  return `
    <article class="library-grid-item" data-manga-id="${item.id}">
      <img src="${item.coverUrl || MOCK_WHITE_IMAGE}" alt="${escapeAdvancedHtml(item.title)}" />
      <div class="library-grid-title"><span>${escapeAdvancedHtml(item.title)}</span></div>
    </article>
  `;
}

function renderAdvancedStats(item) {
  const rating = Number(item.ratingAverage) > 0 ? Number(item.ratingAverage).toFixed(2) : 'N/A';
  return `
    <span><i data-lucide="star"></i>${rating}</span>
    <span><i data-lucide="bookmark"></i>${formatAdvancedNumber(item.followCount)}</span>
    <span><i data-lucide="eye"></i>${formatAdvancedNumber(item.viewCount)}</span>
    <span><i data-lucide="message-square"></i>${formatAdvancedNumber(item.commentCount)}</span>
    <span class="library-ongoing"><b></b>${getAdvancedStatusLabel(item.status)}</span>
  `;
}

function renderAdvancedTags(item, limit = 12) {
  const tags = [...(item.genres || []), ...(item.themes || [])].filter(Boolean).slice(0, limit);
  return tags.map((tag, idx) => `<span class="${idx === 0 ? 'hot' : ''}">${escapeAdvancedHtml(String(tag))}</span>`).join('');
}

function renderAdvancedPagination() {
  const pagination = document.getElementById('advanced-pagination');
  if (!pagination) return;
  const totalPages = Math.ceil(advancedTotalCount / advancedPageSize);
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  const pages = Array.from({ length: totalPages }, (_, idx) => idx + 1);
  pagination.innerHTML = `
    <button class="library-page-btn" data-page="${advancedPage - 1}" ${advancedPage === 1 ? 'disabled' : ''}>
      <i data-lucide="chevron-left"></i>
    </button>
    ${pages.map(page => `<button class="library-page-number ${page === advancedPage ? 'active' : ''}" data-page="${page}">${page}</button>`).join('')}
    <button class="library-page-btn" data-page="${advancedPage + 1}" ${advancedPage === totalPages ? 'disabled' : ''}>
      <i data-lucide="chevron-right"></i>
    </button>
  `;

  pagination.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextPage = Number(btn.dataset.page);
      if (!Number.isFinite(nextPage) || nextPage < 1 || nextPage > totalPages || nextPage === advancedPage) return;
      advancedPage = nextPage;
      fetchAdvancedManga();
    });
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function goToRandomManga() {
  try {
    const res = await fetch(`${API_BASE}/manga/random?${buildAdvancedQuery(false).toString()}`);
    if (!res.ok) {
      showToast(t('search.noResults', 'No manga found.'), 'warning');
      return;
    }
    const data = await res.json();
    if (data.id) window.location.href = `/manga/${data.id}`;
  } catch (error) {
    console.error('Random manga error:', error);
    showToast(t('common.error', 'Something went wrong.'), 'error');
  }
}

function toggleAdvancedFilters() {
  advancedFiltersOpen = !advancedFiltersOpen;
  updateAdvancedFiltersVisibility();
}

function updateAdvancedFiltersVisibility() {
  const filters = document.getElementById('advanced-filters');
  const button = document.getElementById('advanced-toggle-filters');
  if (!filters || !button) return;
  filters.hidden = !advancedFiltersOpen;
  button.classList.toggle('active', advancedFiltersOpen);
  const label = button.querySelector('span');
  if (label) label.textContent = advancedFiltersOpen ? 'Hide filters' : 'Show filters';
  const icon = button.querySelector('i');
  if (icon) icon.setAttribute('data-lucide', advancedFiltersOpen ? 'chevron-up' : 'chevron-down');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function resetAdvancedFilters() {
  ['advanced-search-input', 'advanced-sort', 'advanced-type', 'advanced-demographic', 'advanced-status', 'advanced-year', 'advanced-rating'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  updateAdvancedResetState();
  advancedPage = 1;
  fetchAdvancedManga();
}

function updateAdvancedResetState() {
  const hasFilters = ['advanced-search-input', 'advanced-sort', 'advanced-type', 'advanced-demographic', 'advanced-status', 'advanced-year', 'advanced-rating']
    .some(id => (document.getElementById(id)?.value || '').trim() !== '');
  document.getElementById('advanced-reset')?.classList.toggle('has-filters', hasFilters);
}

function syncAdvancedViewButtons() {
  document.querySelectorAll('[data-advanced-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.advancedView === advancedView);
  });
}

function bindAdvancedItems() {
  document.querySelectorAll('#advanced-results [data-manga-id]').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `/manga/${card.dataset.mangaId}`;
    });
  });
}

function getAdvancedStatusLabel(status) {
  if (status === 'Completed' || status === 1) return t('status.completed', 'Completed');
  if (status === 'Hiatus' || status === 2) return t('status.hiatus', 'Hiatus');
  return t('status.ongoing', 'Ongoing');
}

function formatAdvancedNumber(value) {
  const number = Number(value) || 0;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}m`;
  if (number >= 1_000) return `${Math.round(number / 1000)}k`;
  return String(number);
}

function escapeAdvancedHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function onLocaleChanged() {
  renderAdvancedResults();
}
