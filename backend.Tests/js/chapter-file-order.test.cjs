const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeChapterFiles } = require('../../backend/wwwroot/js/chapter-file-order.js');

const file = name => ({ name });

test('sorts the initial selection naturally', () => {
  const result = mergeChapterFiles([], [file('10.jpg'), file('2.jpg'), file('1.jpg')]);
  assert.deepEqual(result.map(item => item.name), ['1.jpg', '2.jpg', '10.jpg']);
});

test('keeps manual order and appends later selection naturally', () => {
  const current = [file('10.jpg'), file('1.jpg'), file('2.jpg')];
  const result = mergeChapterFiles(current, [file('12.jpg'), file('11.jpg')]);
  assert.deepEqual(result.map(item => item.name), ['10.jpg', '1.jpg', '2.jpg', '11.jpg', '12.jpg']);
});
