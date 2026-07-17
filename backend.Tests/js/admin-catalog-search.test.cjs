const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../../backend');
const authorsView = fs.readFileSync(path.join(root, 'Views/AdminView/Authors.cshtml'), 'utf8');
const genresView = fs.readFileSync(path.join(root, 'Views/AdminView/Genres.cshtml'), 'utf8');

test('admin author and genre tables expose quick filtering', () => {
  assert.match(authorsView, /id="author-search"/);
  assert.match(authorsView, /textContent/);
  assert.match(genresView, /id="genre-search"/);
  assert.match(genresView, /textContent/);
});
