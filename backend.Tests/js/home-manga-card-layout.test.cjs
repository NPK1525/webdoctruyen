const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../backend');
const script = fs.readFileSync(path.join(root, 'wwwroot/js/index.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'wwwroot/css/style.css'), 'utf8');

test('home manga card keeps the title outside the cover frame', () => {
  assert.match(
    script,
    /class="home-manga-item manga-card"[\s\S]*?class="home-manga-cover-frame"[\s\S]*?<\/div>\s*<h4 class="home-manga-card-title">/
  );
});

test('home manga card reserves two title lines while keeping a uniform cover', () => {
  assert.match(css, /\.home-manga-cover-frame\s*\{[^}]*aspect-ratio:\s*2\s*\/\s*3[^}]*\}/s);
  assert.match(css, /\.home-manga-card-title\s*\{[^}]*height:\s*2\.6em[^}]*-webkit-line-clamp:\s*2[^}]*\}/s);
});

test('home manga card does not add a hover tooltip for the full title', () => {
  const cardTemplate = script.match(/const cardHTML = \(m\) => `([\s\S]*?)`;/);
  assert.ok(cardTemplate, 'home manga card template');
  assert.doesNotMatch(cardTemplate[1], /\stitle=/);
});
