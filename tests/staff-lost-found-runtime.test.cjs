const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('staff runtime uses the real case and found-item APIs for both requested units', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'staff-lost-found-runtime.js'), 'utf8');
  assert.match(source, /ntmetro-staff-banqiao/);
  assert.match(source, /tymetro-staff-qingpu/);
  assert.match(source, /caseId/);
  assert.match(source, /api\/lost-found\/items/);
  assert.match(source, /固定繁體中文/);
  assert.doesNotMatch(source, /friendly-transfer|Demo/);
});
