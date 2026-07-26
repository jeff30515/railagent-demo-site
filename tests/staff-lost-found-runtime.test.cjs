const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('the primary station workspace keeps ownership of the application root', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.doesNotMatch(index, /staff-lost-found-runtime\.js/);
  assert.doesNotMatch(index, /staff-lost-found-workspace\.js/);
});

test('the original staff screens use a live-data enhancer instead of a replacement page', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const workspacePath = path.join(__dirname, '..', 'assets', 'staff-lost-found-enhancer.js');

  assert.ok(fs.existsSync(workspacePath), 'expected the staff screen enhancer script');
  const source = fs.readFileSync(workspacePath, 'utf8');
  assert.match(index, /staff-lost-found-enhancer\.js/);
  assert.match(source, /站務首頁/);
  assert.match(source, /staff task pool/);
  assert.doesNotMatch(source, /root\.append\(/);
  assert.doesNotMatch(source, /root\.innerHTML/);
  assert.match(source, /ntmetro-staff-banqiao/);
  assert.match(source, /tymetro-staff-qingpu/);
  assert.match(source, /優先任務/);
  assert.match(source, /task\.caseId && task\.lostItem/);
  assert.match(source, /removeFriendlyTransfer/);
  for (const field of ['itemType', 'color', 'brand', 'features', 'foundLocation', 'foundAt', 'trainNumber']) {
    assert.match(source, new RegExp(`${field}: fieldValue`));
  }
});

test('the original staff found-item form is aligned to the live lost-item fields', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'staff-lost-found-enhancer.js'), 'utf8');

  assert.match(source, /拾獲日期/);
  assert.match(source, /拾獲車次/);
  assert.match(source, /api\('\/api\/lost-found\/items'/);
});

test('the enhancer removes only the two obsolete staff-home actions', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'staff-lost-found-enhancer.js'), 'utf8');

  assert.match(source, /開啟完整任務池/);
  assert.match(source, /登記拾獲遺失物/);
  assert.match(source, /button\.remove\(\)/);
});

test('the staff found-item screen uses the requested fields and its unit’s newest three items', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'staff-lost-found-enhancer.js'), 'utf8');

  for (const label of ['物品類型', '顏色', '品牌', '特徵', '拾獲日期', '拾獲地點', '拾獲車次']) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /\/api\/lost-found\/items\?unitId=/);
  assert.match(source, /recentFoundItems\.slice\(0, 3\)/);
});

test('the staff found-item screen pins the three newest records from the available dataset', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'staff-lost-found-enhancer.js'), 'utf8');

  assert.match(source, /fixedRecentFoundItems/);
  assert.match(source, /TRA-20230717-2217/);
  assert.match(source, /TRA-20230717-2040/);
  assert.match(source, /TRA-20230717-1925/);
  assert.match(source, /let recentFoundItems = fixedRecentFoundItems/);
  assert.match(source, /recentFoundItems = fixedRecentFoundItems/);
  assert.doesNotMatch(source, /recentFoundItems = \(foundItems\.items \|\| \[\]\)\.slice\(0, 3\)/);
});

test('the found-item enhancer does not clone React-controlled fields', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'staff-lost-found-enhancer.js'), 'utf8');

  assert.doesNotMatch(source, /cloneNode\(true\)/);
  assert.doesNotMatch(source, /data-staff-train-field/);
});

test('the staff enhancer updates after user clicks instead of observing its own DOM mutations', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'staff-lost-found-enhancer.js'), 'utf8');

  assert.doesNotMatch(source, /new MutationObserver/);
  assert.match(source, /function scheduleEnhance\(\)/);
  assert.match(source, /document\.addEventListener\('click', scheduleEnhance\)/);
});

test('the staff found-item screen removes the unrelated friendly-transfer controls', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'staff-lost-found-enhancer.js'), 'utf8');
  const passengerRuntime = fs.readFileSync(path.join(__dirname, '..', 'assets', 'lost-found-local-api.js'), 'utf8');

  assert.match(source, /友善轉乘協助/);
  assert.match(source, /轉乘路線/);
  assert.match(source, /railagent-friendly-transfer-tools/);
  assert.match(source, /railagent-transfer-route/);
  assert.match(passengerRuntime, /ntmetro-staff-banqiao/);
  assert.match(passengerRuntime, /tymetro-staff-qingpu/);
  assert.match(passengerRuntime, /function friendlyTransferPanel\(\) \{\s+const accountId = typeof localStorage/);
  assert.match(passengerRuntime, /const isStaffPage = Boolean\(document\.querySelector/);
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
