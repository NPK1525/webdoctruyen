const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDetailTags } = require('../../backend/wwwroot/js/detail-taxonomy.js');

test('does not create red warning tags when warnings are empty', () => {
  const tags = buildDetailTags('', [{ name: 'Drama' }], [{ name: 'School Life' }]);
  assert.equal(tags.filter(tag => tag.kind === 'warning').length, 0);
});

test('creates red tags only for stored content warnings', () => {
  const tags = buildDetailTags('Gore,Sexual Violence', [{ name: 'Drama' }], []);
  assert.deepEqual(tags.filter(tag => tag.kind === 'warning').map(tag => tag.label), ['GORE', 'SEXUAL VIOLENCE']);
});

test('assigns accent tones only to suggestive and gore warnings', () => {
  const warnings = buildDetailTags('Suggestive,Gore,Sexual Violence,Child Labor', [], []);
  assert.deepEqual(
    warnings.map(tag => ({ label: tag.label, tone: tag.tone })),
    [
      { label: 'SUGGESTIVE', tone: 'suggestive' },
      { label: 'GORE', tone: 'gore' },
      { label: 'SEXUAL VIOLENCE', tone: 'normal' },
      { label: 'CHILD LABOR', tone: 'normal' }
    ]
  );
});
