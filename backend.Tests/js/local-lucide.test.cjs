const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const backend = path.resolve(__dirname, '../../backend');
const views = path.join(backend, 'Views');
const bundle = path.join(backend, 'wwwroot/vendor/lucide/lucide.min.js');
const license = path.join(backend, 'wwwroot/vendor/lucide/LICENSE');

function filesUnder(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(folder, entry.name);
    return entry.isDirectory() ? filesUnder(target) : [target];
  });
}

test('every MVC icon consumer uses the vendored Lucide version', () => {
  assert.equal(fs.existsSync(bundle), true);
  assert.equal(fs.existsSync(license), true);
  const pages = filesUnder(views).filter(file => file.endsWith('.cshtml'));
  const sources = pages.map(file => fs.readFileSync(file, 'utf8'));
  assert.equal(sources.some(source => /unpkg\.com\/lucide|lucide@latest/.test(source)), false);
  const consumers = sources.filter(source => /<!DOCTYPE html>/i.test(source) && /data-lucide=/.test(source));
  assert.ok(consumers.length > 0);
  for (const source of consumers) {
    assert.match(source, /\/vendor\/lucide\/lucide\.min\.js\?v=1\.27\.0/);
  }
});

test('user uploads are ignored by Git', () => {
  const ignore = fs.readFileSync(path.resolve(backend, '../.gitignore'), 'utf8');
  assert.match(ignore, /^\/backend\/wwwroot\/uploads\/$/m);
});
