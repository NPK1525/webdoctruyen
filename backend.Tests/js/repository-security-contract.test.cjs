const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');

test('local secrets and generated data are ignored', () => {
  const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  for (const pattern of ['.codex/', '/App_Data/', '/backend/App_Data/', '*.mdf', '*.ldf', '*.bak', 'bin/', 'obj/']) {
    assert.ok(gitignore.includes(pattern), `missing ignore rule ${pattern}`);
  }
});

test('tracked appsettings contains no database credential', () => {
  const appsettings = JSON.parse(fs.readFileSync(path.join(root, 'backend/appsettings.json'), 'utf8'));
  const connection = appsettings.ConnectionStrings?.DefaultConnection ?? '';
  assert.doesNotMatch(connection, /Password\s*=|User Id\s*=|AccountKey\s*=/i);
});

test('seed users require external configuration instead of literal passwords', () => {
  const seeder = fs.readFileSync(path.join(root, 'backend/Data/MangaDbSeeder.cs'), 'utf8');
  const program = fs.readFileSync(path.join(root, 'backend/Program.cs'), 'utf8');

  assert.doesNotMatch(seeder, /HashPassword\s*\(\s*"[^"]+"\s*\)/);
  assert.match(seeder, /Seed\(MangaDbContext context, IConfiguration configuration\)/);
  assert.match(seeder, /configuration\["SeedUsers:AdminPassword"\]/);
  assert.match(seeder, /configuration\["SeedUsers:DemoPassword"\]/);
  assert.match(program, /MangaDbSeeder\.Seed\(context, builder\.Configuration\)/);
});
