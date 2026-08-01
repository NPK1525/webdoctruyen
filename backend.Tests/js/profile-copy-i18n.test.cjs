const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../backend');
const profileHtml = fs.readFileSync(path.join(root, 'Views/ProfileView/Index.cshtml'), 'utf8');
const vi = JSON.parse(fs.readFileSync(path.join(root, 'wwwroot/locales/vi.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(root, 'wwwroot/locales/en.json'), 'utf8'));

test('profile form omits redundant helper copy', () => {
  assert.doesNotMatch(profileHtml, /Email chỉ có thể được thay đổi bởi quản trị viên/);
  assert.doesNotMatch(profileHtml, /Chỉ hỗ trợ URL ảnh HTTPS, tối đa 2\.048 ký tự/);
  assert.doesNotMatch(profileHtml, /Badge hiển thị trên hồ sơ/);
});

test('regular profile hides administrator-managed badge controls', () => {
  assert.doesNotMatch(profileHtml, /id="profile-badge(?:-container|-input)?"/);
  assert.doesNotMatch(profileHtml, /data-i18n="profile\.badge"/);
});

test('profile home-return label follows the selected locale without replacing its icon', () => {
  const backLink = profileHtml.match(/<a href="\/" class="btn btn-secondary"[\s\S]*?<\/a>/)?.[0] || '';

  assert.match(backLink, /data-lucide="arrow-left"/);
  assert.match(backLink, /<span data-i18n="profile\.backHome">Quay lại trang chủ<\/span>/);
  assert.equal(vi['profile.backHome'], 'Quay lại trang chủ');
  assert.equal(en['profile.backHome'], 'Back to home');
});

test('profile password fields and messages match the server password policy', () => {
  for (const id of ['new-password', 'confirm-password']) {
    const input = profileHtml.match(new RegExp(`<input[^>]+id="${id}"[^>]*>`))?.[0] || '';
    assert.match(input, /minlength="8"/);
    assert.match(input, /maxlength="128"/);
  }

  assert.equal(vi['profile.passwordTooShort'], 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số.');
  assert.equal(en['profile.passwordTooShort'], 'Password must be at least 8 characters and include a letter and a number.');
});
