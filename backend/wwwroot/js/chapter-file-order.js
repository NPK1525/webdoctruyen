(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ChapterFileOrder = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function naturalSort(left, right) {
    return left.name.localeCompare(right.name, undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  }

  function mergeChapterFiles(currentFiles, incomingFiles) {
    const incoming = Array.from(incomingFiles).sort(naturalSort);
    return currentFiles.length === 0
      ? incoming
      : Array.from(currentFiles).concat(incoming);
  }

  return { mergeChapterFiles };
});
