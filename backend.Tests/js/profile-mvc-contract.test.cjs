const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const backend = path.resolve(__dirname, '../../backend');
const controllerPath = path.join(backend, 'Controllers/ProfileViewController.cs');
const viewPath = path.join(backend, 'Views/ProfileView/Index.cshtml');
const profileScript = fs.readFileSync(path.join(backend, 'wwwroot/js/profile.js'), 'utf8');
const common = fs.readFileSync(path.join(backend, 'wwwroot/js/common.js'), 'utf8');

test('profile uses the shared MVC shell at the canonical route', () => {
  assert.equal(fs.existsSync(controllerPath), true);
  assert.equal(fs.existsSync(viewPath), true);

  const controller = fs.readFileSync(controllerPath, 'utf8');
  const view = fs.readFileSync(viewPath, 'utf8');
  assert.match(controller, /HttpGet\(\"\/profile\"\)/);
  for (const partial of ['_Header', '_Sidebar', '_AuthModal']) {
    assert.match(view, new RegExp(`PartialAsync\\(\"${partial}\"\\)`));
  }
  assert.match(view, /\/js\/profile\.js\?v=/);
  assert.match(profileScript, /API_BASE.*userprofile/s);
});

test('legacy static profile is removed and shared links use the canonical URL', () => {
  assert.equal(fs.existsSync(path.join(backend, 'wwwroot/profile.html')), false);
  assert.doesNotMatch(common, /\/profile\.html/);
  assert.match(common, /href="\/profile"/);
});
