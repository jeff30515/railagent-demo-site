const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('supervisor dashboard enhancer is loaded after the mobile application', () => {
  const html = read('index.html');
  const app = html.indexOf('index-lostitem-talkback.js');
  const enhancer = html.indexOf('supervisor-dashboard-enhancer.js');

  assert.ok(app >= 0);
  assert.ok(enhancer > app);
});

test('supervisor dashboard shows the requested live metrics and only the two station teams', () => {
  const source = read('assets/supervisor-dashboard-enhancer.js');

  assert.match(source, /拾獲物品/);
  assert.match(source, /旅客追蹤/);
  assert.match(source, /TOTAL_FOUND_ITEMS\s*=\s*23919/);
  assert.match(source, /板橋站務/);
  assert.match(source, /桃園青埔站務/);
  assert.match(source, /workforceItem\('板橋站務', '板橋站', 36\)/);
  assert.match(source, /workforceItem\('桃園青埔站務', 'A18 高鐵桃園站', 12\)/);
  assert.match(source, /railagent-tracked-lost-found-cases/);
});

test('supervisor dashboard hides every legacy KPI row and the whole realtime queue', () => {
  const source = read('assets/supervisor-dashboard-enhancer.js');

  for (const obsoleteLabel of ['核心差異：跨大眾運輸資訊', '狀態佇列', '時段熱點', '優先佇列', '開啟待辦 drill-down']) {
    assert.match(source, new RegExp(obsoleteLabel));
  }
  assert.match(source, /querySelectorAll\('\.mp-kpi-row'\)/);
  assert.match(source, /section\[aria-label="即時佇列"\]/);
  assert.match(source, /hideNode\(queue\)/);
});

test('supervisor enhancer does not remove React-owned nodes and retries after initial mount', () => {
  const source = read('assets/supervisor-dashboard-enhancer.js');

  assert.doesNotMatch(source, /\.replaceChildren\(/);
  assert.doesNotMatch(source, /\.remove\(\)/);
  assert.doesNotMatch(source, /new MutationObserver/);
  assert.match(source, /STARTUP_DELAYS\s*=\s*\[0,\s*100,\s*300,\s*800\]/);
  assert.match(source, /STARTUP_DELAYS\.forEach/);
  assert.match(source, /CLICK_DELAYS\s*=\s*\[0,\s*50,\s*150,\s*400,\s*1000,\s*2000\]/);
  assert.match(source, /CLICK_DELAYS\.forEach/);
  assert.match(source, /showNode\(existing\)/);
  assert.match(source, /!child\.matches\('\[data-supervisor-metrics\]'\)/);
  assert.match(source, /!child\.matches\('\[data-supervisor-workforce\]'\)/);
});
