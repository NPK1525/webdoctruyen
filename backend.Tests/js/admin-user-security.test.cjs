const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../backend');
const adminView = fs.readFileSync(path.join(root, 'Views/AdminView/UserDetail.cshtml'), 'utf8');
const adminScript = fs.readFileSync(path.join(root, 'wwwroot/js/admin-user-detail.js'), 'utf8');
const profileView = fs.readFileSync(path.join(root, 'Views/ProfileView/Index.cshtml'), 'utf8');
const profileScript = fs.readFileSync(path.join(root, 'wwwroot/js/profile.js'), 'utf8');

test('admin avatar editor accepts only HTTPS URLs up to 2048 characters', () => {
  const input = adminView.match(/<input[^>]+id="admin-user-detail-avatar"[^>]*>/)?.[0] || '';
  assert.match(input, /type="url"/);
  assert.match(input, /maxlength="2048"/);
  assert.match(input, /pattern="https:\/\/\.\*"/);
  assert.match(adminScript, /URL\(\s*value\s*\)/);
  assert.match(adminScript, /url\.protocol\s*===\s*['"]https:['"]/);
});

test('admin user detail has a separate password reset form', () => {
  for (const id of [
    'admin-user-password-form',
    'admin-user-new-password',
    'admin-user-confirm-password',
    'admin-user-password-save'
  ]) {
    assert.match(adminView, new RegExp(`id="${id}"`));
  }
  assert.match(adminScript, /\/admin\/users\/\$\{userId\}\/password/);
  assert.match(adminScript, /newPassword/);
  assert.match(adminScript, /confirmPassword/);
  assert.match(adminScript, /admin-user-password-form'\)\.reset\(\)/);
});

test('self-service profile shows email as readonly and never submits it', () => {
  const emailInput = profileView.match(/<input[^>]+id="profile-email"[^>]*>/)?.[0] || '';
  assert.match(emailInput, /\breadonly\b/);
  assert.doesNotMatch(profileScript, /const email\s*=\s*document\.getElementById\('profile-email'\)/);
  const updateBody = profileScript.match(/body:\s*JSON\.stringify\(\{([\s\S]*?)\}\)/)?.[1] || '';
  assert.doesNotMatch(updateBody, /\bemail\s*:/);
});

test('profile avatar editor documents the HTTPS and 2048-character rule', () => {
  const avatarInput = profileView.match(/<input[^>]+id="profile-avatar-url"[^>]*>/)?.[0] || '';
  assert.match(avatarInput, /type="url"/);
  assert.match(avatarInput, /maxlength="2048"/);
  assert.match(avatarInput, /pattern="https:\/\/\.\*"/);
});

test('changed admin and profile scripts use fresh cache versions', () => {
  assert.match(adminView, /admin-user-detail\.js\?v=1\.2/);
  assert.match(profileView, /profile\.js\?v=1\.5/);
});
