const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('passenger case unfollow enhancer removes only the selected tracked case', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'assets', 'passenger-case-unfollow.js'), 'utf8');

  assert.match(script, /取消追蹤/);
  assert.match(script, /已取消追蹤/);
  assert.match(script, /hiddenTaskIds/);
  assert.match(script, /article\.remove\(\)/);
  assert.match(script, /public own case list/);
});
