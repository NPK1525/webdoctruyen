const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const view = fs.readFileSync(path.join(root, 'backend/Views/Shared/_AuthModal.cshtml'), 'utf8');
const js = fs.readFileSync(path.join(root, 'backend/wwwroot/js/common-auth.js'), 'utf8');

test('shared auth modal exposes the complete password reset flow', () => {
  for (const id of [
    'switch-to-forgot', 'auth-modal-forgot-request-view', 'forgot-email',
    'auth-modal-forgot-otp-view', 'forgot-otp', 'auth-modal-forgot-reset-view',
    'forgot-new-password', 'forgot-confirm-password'
  ]) {
    assert.match(view, new RegExp(`id="${id}"`));
  }

  assert.match(js, /\/auth\/forgot-password/);
  assert.match(js, /\/auth\/verify-reset-otp/);
  assert.match(js, /\/auth\/reset-password/);
});

test('password reset keeps reset token in memory and returns to login after success', () => {
  assert.match(js, /let\s+passwordResetToken\s*=\s*['"]['"]/);
  assert.doesNotMatch(js, /localStorage\.setItem\([^\n]*reset/i);
  assert.match(js, /switchAuthView\(['"]login['"]\)/);
  assert.match(js, /forgot-confirm-password/);
});

test('auth modal provides password visibility toggles for login and registration fields', () => {
  for (const id of [
    'toggle-login-password',
    'toggle-register-password',
    'toggle-register-confirm-password',
    'toggle-forgot-new-password',
    'toggle-forgot-confirm-password'
  ]) {
    assert.match(view, new RegExp(`id="${id}"`));
  }
  assert.match(js, /togglePasswordVisibility/);
});

test('static page auth shells receive the shared password reset controls', () => {
  for (const page of ['index.html', 'detail.html', 'profile.html', 'reader.html']) {
    const html = fs.readFileSync(path.join(root, 'backend/wwwroot', page), 'utf8');
    assert.match(html, /common-auth\.js/);
  }
  assert.match(js, /ensurePasswordVisibilityControls/);
  assert.match(js, /ensurePasswordResetViews/);
});
