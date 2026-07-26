const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('the primary station workspace keeps ownership of the application root', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.doesNotMatch(index, /staff-lost-found-runtime\.js/);
});

test('the isolated staff workspace uses live cases, found items, and repository-aligned fields', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const workspacePath = path.join(__dirname, '..', 'assets', 'staff-lost-found-workspace.js');

  assert.ok(fs.existsSync(workspacePath), 'expected the isolated staff workspace script');
  const source = fs.readFileSync(workspacePath, 'utf8');
  assert.match(index, /staff-lost-found-workspace\.js/);
  assert.match(source, /staff-lost-found-workspace/);
  assert.match(source, /originalApplication\.hidden = true/);
  assert.match(source, /root\.append\(host\)/);
  assert.match(source, /ntmetro-staff-banqiao/);
  assert.match(source, /tymetro-staff-qingpu/);
  assert.match(source, /優先任務/);
  assert.match(source, /本單位近期拾獲/);
  assert.match(source, /task\.caseId && task\.lostItem/);
  assert.doesNotMatch(source, /友善轉乘/);
  for (const field of ['itemType', 'color', 'brand', 'features', 'foundLocation', 'foundAt', 'trainNumber']) {
    assert.match(source, new RegExp(`field\\([^)]*['\"]${field}['\"]`));
  }
});

test('staff runtime uses the real case and found-item APIs for both requested units', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'staff-lost-found-runtime.js'), 'utf8');
  assert.match(source, /ntmetro-staff-banqiao/);
  assert.match(source, /tymetro-staff-qingpu/);
  assert.match(source, /caseId/);
  assert.match(source, /api\/lost-found\/items/);
  assert.match(source, /固定繁體中文/);
  assert.doesNotMatch(source, /friendly-transfer|Demo/);
});

test('staff runtime shares the passenger API configuration and never falls back to the demo staff page', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'staff-lost-found-runtime.js'), 'utf8');
  assert.match(source, /get\('apiBaseUrl'\)/);
  assert.match(source, /railagent\.api-base-url/);
  assert.match(source, /localStorage\.setItem\(apiBaseStorageKey, queryBase\)/);
  assert.match(source, /尚未連接遺失物系統/);
  assert.doesNotMatch(source, /fallbackMarkup/);
  assert.doesNotMatch(source, /\|\| 'http:\/\/127\.0\.0\.1:7071'/);
});
