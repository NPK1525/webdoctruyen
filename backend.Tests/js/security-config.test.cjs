const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'backend/appsettings.json'), 'utf8'));

test('smtp configuration is secret-free and documented with environment variables', () => {
  assert.equal(config.Smtp.Password, '');
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  for (const name of ['Smtp__Host', 'Smtp__Port', 'Smtp__EnableSsl', 'Smtp__Username', 'Smtp__Password', 'Smtp__FromAddress', 'Smtp__FromName']) {
    assert.match(readme, new RegExp(name));
  }
  assert.match(readme, /app password/i);
});
