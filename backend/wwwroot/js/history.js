const expandedHistoryManga = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSession();
  renderHistoryPage();
  window.addEventListener('manganpk:historychanged', renderHistoryPage);
});

function renderHistoryPage() {
  const container = document.getElementById('history-items');
  const empty = document.getElementById('history-empty');
  const countLabel = document.getElementById('history-count-label');
  if (!container || !empty) return;

  const groups = groupHistoryByManga(readLocalReadingHistory());
  if (countLabel) countLabel.textContent = `${groups.length} ${groups.length === 1 ? 'Title' : 'Titles'}`;
  container.className = 'history-groups';

  if (groups.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
    empty.textContent = t('history.empty', 'No reading history yet.');
    return;
  }

  empty.style.display = 'none';
  container.innerHTML = groups.map(renderHistoryGroup).join('');
  bindHistoryItems();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function groupHistoryByManga(items) {
  const map = new Map();
  items
    .sort((a, b) => new Date(b.readAt || b.updatedAt || 0) - new Date(a.readAt || a.updatedAt || 0))
    .forEach(item => {
      const key = String(item.mangaId || item.title || item.mangaTitle || 'unknown');
      if (!map.has(key)) {
        map.set(key, {
          mangaId: item.mangaId,
          title: item.mangaTitle || item.title || t('common.noData', 'No data.'),
          coverUrl: item.coverUrl || MOCK_WHITE_IMAGE,
          latestAt: item.readAt || item.updatedAt,
          viewCount: item.viewCount,
          items: []
        });
      }
      const group = map.get(key);
      group.items.push(item);
      if (new Date(item.readAt || item.updatedAt || 0) > new Date(group.latestAt || 0)) {
        group.latestAt = item.readAt || item.updatedAt;
      }
    });

  return Array.from(map.values())
    .sort((a, b) => new Date(b.latestAt || 0) - new Date(a.latestAt || 0));
}

function renderHistoryGroup(group) {
  const expanded = expandedHistoryManga.has(String(group.mangaId));
  const visibleItems = expanded ? group.items : group.items.slice(0, 3);
  const hiddenCount = Math.max(0, group.items.length - visibleItems.length);
  return `
    <article class="history-group" data-manga-id="${group.mangaId}">
      <img class="history-cover" src="${group.coverUrl || MOCK_WHITE_IMAGE}" alt="${escapeHistoryHtml(group.title)}" />
      <div class="history-group-main">
        <div class="history-group-title">${escapeHistoryHtml(group.title)}</div>
        <div class="history-chapter-list">
          ${visibleItems.map(renderHistoryChapterRow).join('')}
        </div>
        ${hiddenCount > 0 || expanded ? `
          <button class="history-show-all" data-history-toggle="${group.mangaId}">
            ${expanded ? 'Show Less' : 'Show All'}
          </button>
        ` : ''}
      </div>
    </article>
  `;
}

function renderHistoryChapterRow(item) {
  return `
    <div class="history-chapter-row" data-chapter-id="${item.chapterId}" data-manga-id="${item.mangaId}">
      <div class="history-chapter-main">
        <div class="history-chapter-line">
          <i data-lucide="eye-off"></i>
          <span>${escapeHistoryHtml(formatHistoryChapter(item))}</span>
        </div>
        ${renderHistoryAuthor(item)}
      </div>
      <div class="history-row-meta">
        <span><i data-lucide="clock"></i>${formatHistoryRelativeTime(item.readAt || item.updatedAt)}</span>
        <span><i data-lucide="eye"></i>${formatHistoryNumber(item.viewCount)}</span>
        <span><i data-lucide="message-square"></i>0</span>
      </div>
    </div>
  `;
}

function renderHistoryAuthor(item) {
  const name = item.groupName || item.authorName;
  if (!name) return '';
  return `
    <div class="history-author-line">
      <i data-lucide="users"></i>
      <span>${escapeHistoryHtml(name)}</span>
    </div>
  `;
}

function formatHistoryChapter(item) {
  const number = item.chapterNumber ?? '';
  const title = item.chapterTitle ? ` - ${item.chapterTitle}` : '';
  return number !== '' && number !== null
    ? `${t('common.chapter', 'Chapter')} ${number}${title}`
    : t('reader.chapterSelect', 'Chapter');
}

function bindHistoryItems() {
  document.querySelectorAll('.history-chapter-row').forEach(row => {
    row.addEventListener('click', () => {
      const chapterId = row.dataset.chapterId;
      const mangaId = row.dataset.mangaId;
      window.location.href = chapterId ? `/chapter/${chapterId}` : `/manga/${mangaId}`;
    });
  });

  document.querySelectorAll('[data-history-toggle]').forEach(btn => {
    btn.addEventListener('click', event => {
      event.stopPropagation();
      const mangaId = String(btn.dataset.historyToggle);
      if (expandedHistoryManga.has(mangaId)) expandedHistoryManga.delete(mangaId);
      else expandedHistoryManga.add(mangaId);
      renderHistoryPage();
    });
  });
}

function formatHistoryNumber(value) {
  const number = Number(value) || 0;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}m`;
  if (number >= 1_000) return `${Math.round(number / 1000)}k`;
  return number > 0 ? String(number) : 'N/A';
}

function formatHistoryRelativeTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return t('notification.justNow', 'Just now');
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return t('notification.justNow', 'Just now');
  if (diff < hour) return `${Math.floor(diff / minute)} ${t('notification.minutesAgo', 'minutes ago')}`;
  if (diff < day) return `${Math.floor(diff / hour)} ${t('notification.hoursAgo', 'hours ago')}`;
  return `${Math.floor(diff / day)} ${t('notification.daysAgo', 'days ago')}`;
}

function escapeHistoryHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
