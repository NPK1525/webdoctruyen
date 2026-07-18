const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const view = fs.readFileSync(path.join(root, 'backend', 'Views', 'AdminView', 'Index.cshtml'), 'utf8');
const script = fs.readFileSync(path.join(root, 'backend', 'wwwroot', 'js', 'admin-title-drafts.js'), 'utf8');
const sections = ['basic', 'publish', 'authors', 'tags', 'images', 'links', 'translation', 'review'];

test('all title draft sections remain in one continuous form', () => {
  for (const section of sections) {
    assert.match(view, new RegExp(`data-section-panel="${section}"`));
  }
  assert.doesNotMatch(view, /\.title-draft-section\s*\{[^}]*display:\s*none/s);
  assert.match(view, /\.title-draft-section\s*\{[^}]*scroll-margin-top:/s);
});

test('title draft navigation scrolls to sections and tracks the visible section', () => {
  assert.match(script, /function setActiveTitleDraftSection\(section\)/);
  assert.match(script, /function scrollToTitleDraftSection\(section, behavior = 'smooth'\)/);
  assert.match(script, /scrollIntoView\(\{ behavior, block: 'start' \}\)/);
  assert.match(script, /function initTitleDraftSectionObserver\(\)/);
  assert.match(script, /new IntersectionObserver\(/);
  assert.match(script, /function disconnectTitleDraftSectionObserver\(\)/);
});

test('title draft navigation has a mobile horizontal layout', () => {
  assert.match(view, /@@media \(max-width: 900px\)/);
  assert.match(view, /\.title-draft-nav\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(view, /\.title-draft-section-btn\s*\{[^}]*white-space:\s*nowrap/s);
});
