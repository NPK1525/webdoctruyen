(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DetailTaxonomy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function getWarningTone(label) {
    const normalized = String(label || '').trim().toLowerCase().replace(/[-_]+/g, ' ');
    if (normalized === 'suggestive') return 'suggestive';
    if (normalized === 'gore') return 'gore';
    return 'normal';
  }

  function buildDetailTags(contentWarnings, genres, themes) {
    const warnings = String(contentWarnings || '').split(',').map(value => value.trim()).filter(Boolean);
    return [
      ...warnings.map(label => ({ label: label.toUpperCase(), kind: 'warning', tone: getWarningTone(label) })),
      ...(genres || []).map(item => ({ label: item.name, kind: 'normal' })),
      ...(themes || []).map(item => ({ label: item.name, kind: 'normal' }))
    ];
  }

  return { buildDetailTags };
});
