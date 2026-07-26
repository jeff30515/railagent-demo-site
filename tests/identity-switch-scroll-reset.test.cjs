const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('identity switching resets the mobile shell scroll position', () => {
  const enhancer = fs.readFileSync(
    path.join(__dirname, '..', 'assets', 'identity-switch-scroll-reset.js'),
    'utf8',
  );

  assert.match(enhancer, /MutationObserver/);
  assert.match(enhancer, /scrollTop = 0/);
  assert.match(enhancer, /scrollLeft = 0/);

  const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(page, /identity-switch-scroll-reset\.js/);
});
