(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AdminChapterEdit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function buildChapterPayload(source, chapterNumber, title, pageUrls) {
    const payload = { chapterNumber, title };
    if (source === 'Local') payload.pageUrls = Array.from(pageUrls);
    return payload;
  }

  return { buildChapterPayload };
});
