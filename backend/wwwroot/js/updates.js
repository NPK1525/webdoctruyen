const expandedUpdateManga = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSession();
  renderUpdatesPage();
});

function renderUpdatesPage() {
  const container = document.getElementById('updates-items');
  const empty = document.getElementById('updates-empty');
  const countLabel = document.getElementById('updates-count-label');
  if (!container || !empty) return;

  // Nhóm các chương mới theo manga để một bộ có nhiều chương mới sẽ nằm chung một card.
  const groups = groupUpdatesByManga(Array.isArray(window.__LATEST_UPDATES__) ? window.__LATEST_UPDATES__ : []);
  if (countLabel) countLabel.textContent = `${groups.length} ${groups.length === 1 ? 'Title' : 'Titles'}`;

  if (groups.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
    empty.textContent = window.__UPDATES_EMPTY_MESSAGE__
      || t('updates.empty', 'No updated titles yet.');
    return;
  }

  empty.style.display = 'none';
  container.innerHTML = groups.map(renderUpdateGroup).join('');
  bindUpdateItems();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function groupUpdatesByManga(items) {
  const map = new Map();
  items
    .slice()
    .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
    .forEach(item => {
      const key = String(item.mangaId || item.mangaTitle || 'unknown');
      if (!map.has(key)) {
        map.set(key, {
          mangaId: item.mangaId,
          title: item.mangaTitle || t('common.noData', 'No data.'),
          coverUrl: item.coverUrl || MOCK_WHITE_IMAGE,
          viewCount: item.viewCount,
          latestAt: item.uploadedAt,
          authors: item.authors || [],
          items: []
        });
      }
      const group = map.get(key);
      group.items.push(item);
      if (new Date(item.uploadedAt || 0) > new Date(group.latestAt || 0)) {
        group.latestAt = item.uploadedAt;
      }
    });

  return Array.from(map.values())
    .sort((a, b) => new Date(b.latestAt || 0) - new Date(a.latestAt || 0));
}

function renderUpdateGroup(group) {
  const expanded = expandedUpdateManga.has(String(group.mangaId));
  const visibleItems = expanded ? group.items : group.items.slice(0, 3);
  const hiddenCount = Math.max(0, group.items.length - visibleItems.length);
  return `
    <article class="history-group updates-group" data-manga-id="${group.mangaId}">
      <img class="history-cover" src="${group.coverUrl || MOCK_WHITE_IMAGE}" alt="${escapeUpdateHtml(group.title)}" />
      <div class="history-group-main">
        <div class="history-group-title">${escapeUpdateHtml(group.title)}</div>
        <div class="history-chapter-list">
          ${visibleItems.map(renderUpdateChapterRow).join('')}
        </div>
        ${hiddenCount > 0 || expanded ? `
          <button class="history-show-all" data-update-toggle="${group.mangaId}">
            ${expanded ? 'Show Less' : 'Show All'}
          </button>
        ` : ''}
      </div>
    </article>
  `;
}

function renderUpdateChapterRow(item) {
  return `
    <div class="history-chapter-row updates-chapter-row" data-chapter-id="${item.chapterId}" data-manga-id="${item.mangaId}">
      <div class="history-chapter-main">
        <div class="history-chapter-line">
          <i data-lucide="book-open"></i>
          <span>${escapeUpdateHtml(formatUpdateChapter(item))}</span>
        </div>
        ${renderUpdateAuthors(item)}
      </div>
      <div class="history-row-meta updates-row-meta">
        <span><i data-lucide="clock"></i>${formatExactUpdateTime(item.uploadedAt)}</span>
        <span><i data-lucide="eye"></i>${formatUpdateNumber(item.viewCount)}</span>
        <span><i data-lucide="message-square"></i>${formatUpdateNumber(item.commentCount, true)}</span>
      </div>
    </div>
  `;
}

function renderUpdateAuthors(item) {
  const names = Array.isArray(item.authors) ? item.authors.filter(Boolean) : [];
  if (names.length === 0) return '';
  return `
    <div class="history-author-line">
      <i data-lucide="users"></i>
      <span>${escapeUpdateHtml(names.join(', '))}</span>
    </div>
  `;
}

function formatUpdateChapter(item) {
  const number = item.chapterNumber ?? '';
  const title = item.chapterTitle ? ` - ${item.chapterTitle}` : '';
  return number !== '' && number !== null
    ? `${t('common.chapter', 'Chapter')} ${number}${title}`
    : t('reader.chapterSelect', 'Chapter');
}

function bindUpdateItems() {
  document.querySelectorAll('.updates-chapter-row').forEach(row => {
    row.addEventListener('click', () => {
      const chapterId = row.dataset.chapterId;
      const mangaId = row.dataset.mangaId;
      window.location.href = chapterId ? `/chapter/${chapterId}` : `/manga/${mangaId}`;
    });
  });

  document.querySelectorAll('[data-update-toggle]').forEach(btn => {
    btn.addEventListener('click', event => {
      event.stopPropagation();
      const mangaId = String(btn.dataset.updateToggle);
      if (expandedUpdateManga.has(mangaId)) expandedUpdateManga.delete(mangaId);
      else expandedUpdateManga.add(mangaId);
      renderUpdatesPage();
    });
  });
}

function formatExactUpdateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '--:--, --/--/----';
  const locale = (typeof I18N !== 'undefined' && I18N.locale === 'en') ? 'en-US' : 'vi-VN';
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function formatUpdateNumber(value, zeroAsNumber = false) {
  const number = Number(value) || 0;
  if (number <= 0) return zeroAsNumber ? '0' : 'N/A';
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}m`;
  if (number >= 1_000) return `${Math.round(number / 1000)}k`;
  return String(number);
}

function escapeUpdateHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
