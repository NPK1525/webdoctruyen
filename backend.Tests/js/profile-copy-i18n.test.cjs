const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../backend/wwwroot');
const profileHtml = fs.readFileSync(path.join(root, 'profile.html'), 'utf8');
const vi = JSON.parse(fs.readFileSync(path.join(root, 'locales/vi.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(root, 'locales/en.json'), 'utf8'));

test('profile form omits redundant helper copy', () => {
  assert.doesNotMatch(profileHtml, /Email chỉ có thể được thay đổi bởi quản trị viên/);
  assert.doesNotMatch(profileHtml, /Chỉ hỗ trợ URL ảnh HTTPS, tối đa 2\.048 ký tự/);
  assert.doesNotMatch(profileHtml, /Badge hiển thị trên hồ sơ/);
});

test('profile home-return label follows the selected locale without replacing its icon', () => {
  const backLink = profileHtml.match(/<a href="\/" class="btn btn-secondary"[\s\S]*?<\/a>/)?.[0] || '';

  assert.match(backLink, /data-lucide="arrow-left"/);
  assert.match(backLink, /<span data-i18n="profile\.backHome">Quay lại trang chủ<\/span>/);
  assert.equal(vi['profile.backHome'], 'Quay lại trang chủ');
  assert.equal(en['profile.backHome'], 'Back to home');
});
