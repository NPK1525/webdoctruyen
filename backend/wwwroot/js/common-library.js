// Local manga library and reading-history persistence shared by all pages.

const LIBRARY_STATUSES = [
  { value: 'reading', label: 'Reading', i18n: 'library.status.reading', icon: 'bell' },
  { value: 'plan', label: 'Plan To Read', i18n: 'library.status.plan', icon: 'bookmark' },
  { value: 'completed', label: 'Completed', i18n: 'library.status.completed', icon: 'check-circle' },
  { value: 'on_hold', label: 'On Hold', i18n: 'library.status.onHold', icon: 'pause-circle' },
  { value: 'rereading', label: 'Re-reading', i18n: 'library.status.rereading', icon: 'refresh-cw' },
  { value: 'dropped', label: 'Dropped', i18n: 'library.status.dropped', icon: 'x-circle' }
];

function getLibraryUserKey() {
  const id = currentUser?.id || currentUser?.username || 'guest';
  return `manganpk_library_${id}`;
}

function readLocalLibrary() {
  try {
    return JSON.parse(localStorage.getItem(getLibraryUserKey()) || '[]');
  } catch {
    return [];
  }
}

function writeLocalLibrary(items) {
  try {
    localStorage.setItem(getLibraryUserKey(), JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('manganpk:librarychanged'));
  } catch (error) {
    console.error('Library storage error:', error);
  }
}

function getLibraryStatusMeta(status) {
  return LIBRARY_STATUSES.find(s => s.value === status) || null;
}

function getLibraryStatusLabel(status) {
  const meta = getLibraryStatusMeta(status);
  return meta ? t(meta.i18n, meta.label) : t('library.addToLibrary', 'Add To Library');
}

function getLocalLibraryItem(mangaId) {
  const id = Number(mangaId);
  return readLocalLibrary().find(item => Number(item.mangaId) === id) || null;
}

function saveLocalLibraryItem(manga, status) {
  if (!manga || !status || status === 'none') return null;
  const items = readLocalLibrary();
  const id = Number(manga.id || manga.mangaId);
  const now = new Date().toISOString();
  const snapshot = {
    mangaId: id,
    title: manga.title || '',
    alternativeTitle: manga.alternativeTitle || '',
    description: manga.description || '',
    coverUrl: manga.coverUrl || '',
    type: manga.type || 'Manga',
    status: manga.status || 'Ongoing',
    viewCount: manga.viewCount || 0,
    genres: manga.genres || [],
    themes: manga.themes || [],
    rating: manga.ratingAverage ?? manga.rating ?? null,
    ratingAverage: manga.ratingAverage ?? manga.rating ?? null,
    ratingCount: manga.ratingCount ?? 0,
    followCount: manga.followCount ?? 0,
    comments: manga.commentCount ?? manga.comments ?? 0,
    commentCount: manga.commentCount ?? manga.comments ?? 0,
    readingStatus: status,
    updatedAt: now,
    addedAt: now
  };
  const index = items.findIndex(item => Number(item.mangaId) === id);
  if (index >= 0) items[index] = { ...items[index], ...snapshot, addedAt: items[index].addedAt || now };
  else items.push(snapshot);
  writeLocalLibrary(items);
  return snapshot;
}

function removeLocalLibraryItem(mangaId) {
  const id = Number(mangaId);
  writeLocalLibrary(readLocalLibrary().filter(item => Number(item.mangaId) !== id));
}

function getReadingHistoryUserKey() {
  const id = currentUser?.id || currentUser?.username || 'guest';
  return `manganpk_reading_history_${id}`;
}

function readLocalReadingHistory() {
  try {
    return JSON.parse(localStorage.getItem(getReadingHistoryUserKey()) || '[]');
  } catch {
    return [];
  }
}

function writeLocalReadingHistory(items) {
  try {
    localStorage.setItem(getReadingHistoryUserKey(), JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('manganpk:historychanged'));
  } catch (error) {
    console.error('Reading history storage error:', error);
  }
}

function saveLocalReadingHistoryItem(entry) {
  if (!entry || !entry.mangaId || !entry.chapterId) return null;
  const mangaId = Number(entry.mangaId);
  const chapterId = Number(entry.chapterId);
  if (!Number.isFinite(mangaId) || !Number.isFinite(chapterId)) return null;

  const now = new Date().toISOString();
  const items = readLocalReadingHistory();
  const snapshot = {
    mangaId,
    chapterId,
    title: entry.title || entry.mangaTitle || '',
    mangaTitle: entry.mangaTitle || entry.title || '',
    chapterNumber: entry.chapterNumber ?? null,
    chapterTitle: entry.chapterTitle || '',
    coverUrl: entry.coverUrl || '',
    description: entry.description || '',
    type: entry.type || 'Manga',
    status: entry.status || 'Ongoing',
    viewCount: entry.viewCount || 0,
    genres: entry.genres || [],
    themes: entry.themes || [],
    authorName: entry.authorName || '',
    groupName: entry.groupName || '',
    pageNumber: entry.pageNumber || 1,
    pageCount: entry.pageCount || 0,
    readAt: now,
    updatedAt: now
  };
  const nextItems = items.filter(item => !(Number(item.mangaId) === mangaId && Number(item.chapterId) === chapterId));
  nextItems.unshift(snapshot);
  writeLocalReadingHistory(nextItems.slice(0, 200));
  return snapshot;
}
