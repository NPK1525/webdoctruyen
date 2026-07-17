const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const backendRoot = path.resolve(__dirname, '../../backend');
const css = fs.readFileSync(path.join(backendRoot, 'wwwroot/css/style.css'), 'utf8');

function ruleFor(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
}

function listRazorViews(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listRazorViews(fullPath) : entry.name.endsWith('.cshtml') ? [fullPath] : [];
  });
}

test('library-family pages use the shared theme surfaces', () => {
  assert.match(ruleFor('.library-page'), /background-color:\s*var\(--bg-main\)/);
  assert.match(ruleFor('.add-library-dialog'), /background-color:\s*var\(--bg-card\)/);
  assert.match(ruleFor('.library-status-tabs'), /background-color:\s*var\(--bg-input\)/);
  assert.match(ruleFor('.library-view-switcher'), /background-color:\s*var\(--bg-input\)/);
  assert.match(ruleFor('.library-list-item, .library-compact-item'), /background-color:\s*var\(--bg-card\)/);
  assert.match(ruleFor('.history-group'), /background-color:\s*var\(--bg-card\)/);
  assert.match(ruleFor('.library-page-btn, .library-page-number'), /background-color:\s*var\(--bg-input\)/);
  assert.match(ruleFor('.library-page-btn, .library-page-number'), /border:\s*1px solid var\(--border-subtle\)/);
});

test('library-family core surfaces do not restore the separate fixed palette', () => {
  const coreSelectors = [
    '.library-page', '.add-library-dialog', '.library-status-tabs',
    '.library-view-switcher', '.library-list-item, .library-compact-item',
    '.history-group', '.library-page-btn, .library-page-number'
  ];
  for (const selector of coreSelectors) {
    assert.doesNotMatch(ruleFor(selector), /#17191b|#2a2a2a|#595959|rgba\(255,\s*255,\s*255,\s*0\.08\)/i, selector);
  }
});

test('all MVC pages load the same shared stylesheet generation', () => {
  const consumers = listRazorViews(path.join(backendRoot, 'Views'))
    .map(file => ({ file, source: fs.readFileSync(file, 'utf8') }))
    .filter(({ source }) => source.includes('/css/style.css'));

  assert.ok(consumers.length > 0);
  for (const { file, source } of consumers) {
    assert.match(source, /\/css\/style\.css\?v=4\.9/, path.relative(backendRoot, file));
    assert.equal((source.match(/\/css\/style\.css\?v=/g) ?? []).length, 1, path.relative(backendRoot, file));
  }
});
