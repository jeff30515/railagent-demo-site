const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('the public URL resets a remembered station identity before the app module loads', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const publicRoleGuard = source.indexOf("get('role') === 'public'");
  const appModule = source.indexOf('assets/index-lostitem-talkback.js');

  assert.ok(publicRoleGuard >= 0, 'expected a public-role URL guard');
  assert.ok(publicRoleGuard < appModule, 'the guard must run before the app module');
  assert.match(source, /railagent\.mobile\.account', 'ntmetro-public'/);
});
