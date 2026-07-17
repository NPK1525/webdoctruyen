let recentViewMode = localStorage.getItem('manganpk_recent_view') || 'list';

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSession();
  initRecentlyAddedPage();
  renderRecentlyAddedPage();
});

function initRecentlyAddedPage() {
  document.querySelectorAll('[data-recent-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (recentViewMode === btn.dataset.recentView) return;

      // Làm mềm cảm giác đổi layout giữa 3 chế độ xem.
      document.getElementById('recently-added-items')?.classList.add('is-switching');
      recentViewMode = btn.dataset.recentView;
      localStorage.setItem('manganpk_recent_view', recentViewMode);
      renderRecentlyAddedPage();
    });
  });
}

function renderRecentlyAddedPage() {
  const container = document.getElementById('recently-added-items');
  const empty = document.getElementById('recently-added-empty');
  const countLabel = document.getElementById('recently-added-count-label');
  if (!container || !empty) return;

  // Dữ liệu này là danh sách bộ truyện mới thêm, đã được server nhúng sẵn vào window.__RECENTLY_ADDED__.
  const items = Array.isArray(window.__RECENTLY_ADDED__) ? window.__RECENTLY_ADDED__ : [];
  if (countLabel) countLabel.textContent = `${items.length} ${items.length === 1 ? 'Title' : 'Titles'}`;

  document.querySelectorAll('[data-recent-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.recentView === recentViewMode);
  });

  const isSwitching = container.classList.contains('is-switching');
  container.className = `library-items ${recentViewMode}${isSwitching ? ' is-switching' : ''}`;

  if (items.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
    empty.textContent = t('recentlyAdded.empty', 'No newly added titles yet.');
    return;
  }

  empty.style.display = 'none';
  container.innerHTML = items.map(item => renderRecentItem(item, recentViewMode)).join('');
  requestAnimationFrame(() => container.classList.remove('is-switching'));
  bindRecentItems();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderRecentItem(item, view) {
  if (view === 'grid') return renderRecentGridItem(item);
  if (view === 'compact') return renderRecentCompactItem(item);
  return renderRecentListItem(item);
}

function renderRecentListItem(item) {
  return `
    <article class="library-list-item" data-manga-id="${item.id}">
      <img src="${item.coverUrl || MOCK_WHITE_IMAGE}" alt="${escapeRecentHtml(item.title)}" />
      <div class="library-list-main">
        <div class="library-item-title">${escapeRecentHtml(item.title)}</div>
        <div class="library-tags">${renderRecentTags(item)}</div>
        <p>${escapeRecentHtml(item.description || t('common.noDescription', 'No description.'))}</p>
      </div>
      <div class="library-item-stats">${renderRecentStats(item)}</div>
    </article>
  `;
}

function renderRecentCompactItem(item) {
  return `
    <article class="library-compact-item" data-manga-id="${item.id}">
      <img src="${item.coverUrl || MOCK_WHITE_IMAGE}" alt="${escapeRecentHtml(item.title)}" />
      <div class="library-compact-main">
        <div class="library-item-title">${escapeRecentHtml(item.title)}</div>
        <div class="library-compact-stats">${renderRecentStats(item)}</div>
        <div class="library-tags">${renderRecentTags(item, 7)}</div>
        <p>${escapeRecentHtml(item.description || t('common.noDescription', 'No description.'))}</p>
      </div>
    </article>
  `;
}

function renderRecentGridItem(item) {
  return `
    <article class="library-grid-item" data-manga-id="${item.id}">
      <img src="${item.coverUrl || MOCK_WHITE_IMAGE}" alt="${escapeRecentHtml(item.title)}" />
      <div class="library-grid-title"><span>${escapeRecentHtml(item.title)}</span></div>
    </article>
  `;
}

function renderRecentStats(item) {
  const rating = Number(item.ratingAverage) > 0 ? Number(item.ratingAverage).toFixed(2) : 'N/A';
  return `
    <span><i data-lucide="star"></i>${rating}</span>
    <span><i data-lucide="bookmark"></i>${formatRecentNumber(item.followCount)}</span>
    <span><i data-lucide="eye"></i>${formatRecentNumber(item.viewCount, true)}</span>
    <span><i data-lucide="message-square"></i>${formatRecentNumber(item.commentCount)}</span>
    <span class="library-ongoing"><b></b>${getRecentStatusLabel(item.status)}</span>
  `;
}

function renderRecentTags(item, limit = 12) {
  const tags = [...(item.genres || []), ...(item.themes || [])].filter(Boolean).slice(0, limit);
  return tags.map((tag, idx) => `<span class="${idx === 0 ? 'hot' : ''}">${escapeRecentHtml(String(tag))}</span>`).join('');
}

function bindRecentItems() {
  document.querySelectorAll('#recently-added-items [data-manga-id]').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `/manga/${card.dataset.mangaId}`;
    });
  });
}

function getRecentStatusLabel(status) {
  if (status === 'Completed' || status === 1) return t('status.completed', 'Completed');
  if (status === 'Hiatus' || status === 2) return t('status.hiatus', 'Hiatus');
  return t('status.ongoing', 'Ongoing');
}

function formatRecentNumber(value, zeroAsNa = false) {
  const number = Number(value) || 0;
  if (number <= 0) return zeroAsNa ? 'N/A' : '0';
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}m`;
  if (number >= 1_000) return `${Math.round(number / 1000)}k`;
  return String(number);
}

function escapeRecentHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
