(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MDListsCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const SORT_KEYS = [
    'best', 'latest', 'oldest-upload', 'title-asc', 'title-desc', 'rating-desc',
    'rating-asc', 'follows-desc', 'follows-asc', 'recent', 'oldest-added',
    'year-asc', 'year-desc'
  ];

  function buildSavePayload(editor) {
    return {
      name: String(editor.name || '').trim(),
      description: String(editor.description || '').trim(),
      isPublic: !!editor.isPublic,
      mangaIds: (editor.selected || []).map(item => Number(item.mangaId || item.id)).filter(Number.isInteger)
    };
  }

  function buildSearchUrl({ query = '', sort = 'best', page = 1, pageSize = 20 } = {}) {
    const params = new URLSearchParams({
      search: String(query).trim(), fuzzy: 'true', sort: SORT_KEYS.includes(sort) ? sort : 'best',
      page: String(Math.max(1, page)), pageSize: String(pageSize)
    });
    return `/api/manga?${params}`;
  }

  function createSearchSequence() {
    let current = 0;
    return { next: () => ++current, isCurrent: value => value === current };
  }

  function safeImageUrl(value) {
    const url = String(value || '').trim();
    if (!url) return '';
    if (url.startsWith('/')) return url.startsWith('//') ? '' : url;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : '';
    } catch { return ''; }
  }

  return { SORT_KEYS, buildSavePayload, buildSearchUrl, createSearchSequence, safeImageUrl };
});
