let activeLibraryStatus = 'reading';
let activeLibraryView = localStorage.getItem('manganpk_library_view') || 'compact';
let activeLibraryPage = 1;
const libraryPageSize = 20;

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSession();
  initLibraryPage();
  renderLibraryPage();
  window.addEventListener('manganpk:librarychanged', renderLibraryPage);
});

function initLibraryPage() {
  document.getElementById('library-login-btn')?.addEventListener('click', () => openAuthModal('login'));
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  if (LIBRARY_STATUSES.some(s => s.value === status)) activeLibraryStatus = status;

  const tabs = document.getElementById('library-status-tabs');
  if (tabs) {
    tabs.innerHTML = LIBRARY_STATUSES.map(statusMeta => `
      <button class="library-status-tab" data-status="${statusMeta.value}">
        ${t(statusMeta.i18n, statusMeta.label)}
      </button>
    `).join('');
    tabs.querySelectorAll('[data-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeLibraryStatus = btn.dataset.status;
      activeLibraryPage = 1;
      renderLibraryPage();
    });
    });
  }

  document.querySelectorAll('[data-library-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (activeLibraryView === btn.dataset.libraryView) return;
      document.getElementById('library-items')?.classList.add('is-switching');
      activeLibraryView = btn.dataset.libraryView;
      localStorage.setItem('manganpk_library_view', activeLibraryView);
      activeLibraryPage = 1;
      renderLibraryPage();
    });
  });
}

async function renderLibraryPage() {
  const loginPrompt = document.getElementById('library-login-prompt');
  const content = document.getElementById('library-content');
  if (!currentUser) {
    if (loginPrompt) loginPrompt.style.display = 'grid';
    if (content) content.style.display = 'none';
    return;
  }
  if (loginPrompt) loginPrompt.style.display = 'none';
  if (content) content.style.display = 'block';

  document.querySelectorAll('.library-status-tab').forEach(btn => {
    const isActive = btn.dataset.status === activeLibraryStatus;
    btn.classList.toggle('active', isActive);
    const meta = getLibraryStatusMeta(btn.dataset.status);
    btn.textContent = t(meta.i18n, meta.label);
  });
  document.querySelectorAll('[data-library-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.libraryView === activeLibraryView);
  });

  const allItems = readLocalLibrary().sort((a, b) => new Date(b.updatedAt || b.addedAt || 0) - new Date(a.updatedAt || a.addedAt || 0));
  const items = allItems.filter(item => item.readingStatus === activeLibraryStatus);
  const countLabel = document.getElementById('library-count-label');
  if (countLabel) countLabel.textContent = `${items.length} ${items.length === 1 ? 'Title' : 'Titles'}`;

  const container = document.getElementById('library-items');
  const empty = document.getElementById('library-empty');
  const pagination = document.getElementById('library-pagination');
  if (!container || !empty) return;

  const isSwitching = container.classList.contains('is-switching');
  container.className = `library-items ${activeLibraryView}${isSwitching ? ' is-switching' : ''}`;
  if (items.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
    empty.textContent = t('library.emptyStatus', 'No titles in this status yet.');
    if (pagination) pagination.innerHTML = '';
    return;
  }
  empty.style.display = 'none';
  const totalPages = Math.max(1, Math.ceil(items.length / libraryPageSize));
  activeLibraryPage = Math.min(Math.max(1, activeLibraryPage), totalPages);
  const pageItems = items.slice((activeLibraryPage - 1) * libraryPageSize, activeLibraryPage * libraryPageSize);
  const hydratedItems = await hydrateLibraryItems(pageItems);
  container.innerHTML = hydratedItems.map(item => renderLibraryItem(item, activeLibraryView)).join('');
  requestAnimationFrame(() => container.classList.remove('is-switching'));
  bindLibraryItemEvents();
  renderLibraryPagination(totalPages);
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function hydrateLibraryItems(items) {
  const hydrated = await Promise.all(items.map(async item => {
    try {
      const res = await apiFetch(`${API_BASE}/manga/${item.mangaId}`);
      if (!res.ok) return item;
      const data = await res.json();
      return {
        ...item,
        title: data.title ?? item.title,
        alternativeTitle: data.alternativeTitle ?? item.alternativeTitle,
        description: data.description ?? item.description,
        coverUrl: data.coverUrl ?? item.coverUrl,
        type: data.type ?? item.type,
        status: data.status ?? item.status,
        viewCount: data.viewCount ?? item.viewCount,
        genres: data.genres ?? item.genres,
        themes: data.themes ?? item.themes,
        ratingAverage: data.ratingAverage ?? item.ratingAverage ?? item.rating,
        ratingCount: data.ratingCount ?? item.ratingCount,
        commentCount: data.commentCount ?? item.commentCount ?? item.comments,
        followCount: data.followCount ?? item.followCount
      };
    } catch {
      return item;
    }
  }));
  return hydrated;
}

function renderLibraryItem(item, view) {
  if (view === 'grid') return renderLibraryGridItem(item);
  if (view === 'list') return renderLibraryListItem(item);
  return renderLibraryCompactItem(item);
}

function renderLibraryListItem(item) {
  return `
    <article class="library-list-item" data-manga-id="${item.mangaId}">
      <img src="${item.coverUrl}" alt="${escapeLibraryHtml(item.title)}" />
      <div class="library-list-main">
        <div class="library-item-title">${escapeLibraryHtml(item.title)}</div>
        <div class="library-tags">${renderLibraryTags(item)}</div>
        <p>${escapeLibraryHtml(item.description || t('common.noDescription', 'No description.'))}</p>
      </div>
      <div class="library-item-stats">${renderLibraryStats(item)}</div>
    </article>
  `;
}

function renderLibraryCompactItem(item) {
  return `
    <article class="library-compact-item" data-manga-id="${item.mangaId}">
      <img src="${item.coverUrl}" alt="${escapeLibraryHtml(item.title)}" />
      <div class="library-compact-main">
        <div class="library-item-title">${escapeLibraryHtml(item.title)}</div>
        <div class="library-compact-stats">${renderLibraryStats(item)}</div>
        <div class="library-tags">${renderLibraryTags(item, 7)}</div>
        <p>${escapeLibraryHtml(item.description || t('common.noDescription', 'No description.'))}</p>
      </div>
    </article>
  `;
}

function renderLibraryGridItem(item) {
  return `
    <article class="library-grid-item" data-manga-id="${item.mangaId}">
      <img src="${item.coverUrl}" alt="${escapeLibraryHtml(item.title)}" />
      <div class="library-grid-title"><span>${escapeLibraryHtml(item.title)}</span></div>
    </article>
  `;
}

function renderLibraryStats(item) {
  const ratingValue = firstNumber(item.ratingAverage, item.rating);
  const rating = ratingValue > 0 ? ratingValue.toFixed(2) : 'N/A';
  const follows = formatLibraryNumber(firstNumber(item.followCount, item.follows, 0));
  const views = formatLibraryNumber(firstNumber(item.viewCount, 0));
  const comments = formatLibraryNumber(firstNumber(item.commentCount, item.comments, 0));
  return `
    <span><i data-lucide="star"></i>${rating}</span>
    <span><i data-lucide="bookmark"></i>${follows}</span>
    <span><i data-lucide="eye"></i>${views}</span>
    <span><i data-lucide="message-square"></i>${comments}</span>
    <span class="library-ongoing"><b></b>${getMangaStatusLabel(item.status)}</span>
  `;
}

function renderLibraryTags(item, limit = 12) {
  const tags = [...(item.genres || []), ...(item.themes || [])].map(tag => tag.name || tag).filter(Boolean).slice(0, limit);
  if (tags.length === 0) return '';
  return tags.map((tag, idx) => `<span class="${idx === 0 ? 'hot' : ''}">${escapeLibraryHtml(String(tag))}</span>`).join('');
}

function bindLibraryItemEvents() {
  document.querySelectorAll('[data-manga-id]').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `/manga/${card.dataset.mangaId}`;
    });
  });
}

function getMangaStatusLabel(status) {
  if (status === 'Completed' || status === 1) return t('status.completed', 'Completed');
  return t('status.ongoing', 'Ongoing');
}

function formatLibraryNumber(value) {
  const number = Number(value) || 0;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}m`;
  if (number >= 1_000) return `${Math.round(number / 1000)}k`;
  return String(number);
}

function firstNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function renderLibraryPagination(totalPages) {
  const pagination = document.getElementById('library-pagination');
  if (!pagination) return;
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  const pages = Array.from({ length: totalPages }, (_, idx) => idx + 1);
  pagination.innerHTML = `
    <button class="library-page-btn" data-page="${activeLibraryPage - 1}" ${activeLibraryPage === 1 ? 'disabled' : ''}>
      <i data-lucide="chevron-left"></i>
    </button>
    ${pages.map(page => `<button class="library-page-number ${page === activeLibraryPage ? 'active' : ''}" data-page="${page}">${page}</button>`).join('')}
    <button class="library-page-btn" data-page="${activeLibraryPage + 1}" ${activeLibraryPage === totalPages ? 'disabled' : ''}>
      <i data-lucide="chevron-right"></i>
    </button>
  `;

  pagination.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextPage = Number(btn.dataset.page);
      if (!Number.isFinite(nextPage) || nextPage < 1 || nextPage > totalPages || nextPage === activeLibraryPage) return;
      activeLibraryPage = nextPage;
      renderLibraryPage();
    });
  });
}

function escapeLibraryHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function onLocaleChanged() {
  initLibraryPage();
  renderLibraryPage();
}
