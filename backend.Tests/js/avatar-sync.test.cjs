const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../../backend/wwwroot/js');
const common = fs.readFileSync(path.join(root, 'common.js'), 'utf8');
const comments = fs.readFileSync(path.join(root, 'detail-comments.js'), 'utf8');
const profile = fs.readFileSync(path.join(root, 'profile.js'), 'utf8');

function functionSource(source, name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert.ok(match, `${name} source`);
  return match[0];
}

test('avatar URL sanitizer accepts local, HTTPS and safe base64 images but rejects executable URLs', () => {
  const context = {};
  vm.runInNewContext(`${functionSource(common, 'sanitizeAvatarUrl')}
    result = [
      sanitizeAvatarUrl('/uploads/avatars/me.png'),
      sanitizeAvatarUrl('https://cdn.example.test/me.png'),
      sanitizeAvatarUrl('data:image/png;base64,iVBORw0KGgo='),
      sanitizeAvatarUrl('javascript:alert(1)'),
      sanitizeAvatarUrl('//evil.example/avatar.png'),
      sanitizeAvatarUrl('data:image/svg+xml;base64,PHN2Zz4=')
    ];`, context);

  assert.deepEqual(Array.from(context.result), [
    '/uploads/avatars/me.png',
    'https://cdn.example.test/me.png',
    'data:image/png;base64,iVBORw0KGgo=',
    '',
    '',
    ''
  ]);
});

test('shared header and account dropdown render the saved avatar with fallback support', () => {
  assert.match(common, /renderUserAvatarContent\(currentUser\.avatarUrl,\s*18\)/);
  assert.match(common, /renderUserAvatarContent\(currentUser\.avatarUrl,\s*24\)/);
  assert.match(common, /activateAvatarFallbacks\(area\)/);
  assert.match(common, /user-avatar-fallback/);
});

test('comments render each comment author avatar with fallback support', () => {
  assert.match(comments, /renderUserAvatarContent\(comment\.avatarUrl,\s*20\)/);
  assert.match(comments, /activateAvatarFallbacks\(list\)/);
});

test('new comment form shows the signed-in user avatar', () => {
  const detailView = fs.readFileSync(path.resolve(root, '../../Views/MangaView/Detail.cshtml'), 'utf8');
  assert.match(detailView, /id="comment-current-user-avatar"/);
  assert.match(comments, /renderUserAvatarContent\(currentUser\.avatarUrl,\s*20\)/);
  assert.match(comments, /activateAvatarFallbacks\(formAvatar\)/);
});

test('saving a profile synchronizes the shared session avatar immediately', () => {
  assert.match(profile, /synchronizeCurrentUserAvatar\(updated\.avatarUrl\)/);
  const sync = functionSource(common, 'synchronizeCurrentUserAvatar');
  assert.match(sync, /currentUser\s*=\s*\{\s*\.\.\.currentUser,\s*avatarUrl:/s);
  assert.match(sync, /localStorage\.setItem\('user',\s*JSON\.stringify\(currentUser\)\)/);
  assert.match(sync, /renderHeaderUserArea\(\)/);
});

test('profile sends an empty avatar string as an explicit clear command', () => {
  assert.match(profile, /\bavatarUrl,\s*\n\s*bio:/);
  assert.doesNotMatch(profile, /avatarUrl:\s*avatarUrl\s*\|\|\s*null/);
});

test('profile script neither renders nor submits badge values', () => {
  assert.doesNotMatch(profile, /profile-badge/);
  assert.doesNotMatch(profile, /\bbadge\s*:/);
  assert.match(profile, /JSON\.stringify\(\{[\s\S]*?avatarUrl,[\s\S]*?bio:\s*bio\s*\|\|\s*null[\s\S]*?\}\)/);
});

test('avatar consumers request fresh script versions', () => {
  const detailView = fs.readFileSync(path.resolve(root, '../../Views/MangaView/Detail.cshtml'), 'utf8');
  const profilePage = fs.readFileSync(path.resolve(root, '../../Views/ProfileView/Index.cshtml'), 'utf8');

  assert.match(detailView, /common\.js\?v=5\.9/);
  assert.match(detailView, /detail-comments\.js\?v=3\.2/);
  assert.match(profilePage, /common\.js\?v=5\.9/);
  assert.match(profilePage, /profile\.js\?v=1\.5/);
});
