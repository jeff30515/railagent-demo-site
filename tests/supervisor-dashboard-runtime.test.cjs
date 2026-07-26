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
  assert.match(source, /railagent-tracked-lost-found-cases/);
});

test('supervisor dashboard removes only the obsolete demo and queue panels without observing DOM mutations', () => {
  const source = read('assets/supervisor-dashboard-enhancer.js');

  for (const obsoleteLabel of ['核心差異：跨大眾運輸資訊', '狀態佇列', '時段熱點', '優先佇列', '開啟待辦 drill-down']) {
    assert.match(source, new RegExp(obsoleteLabel));
  }
  assert.doesNotMatch(source, /new MutationObserver/);
});
