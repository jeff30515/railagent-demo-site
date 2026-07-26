const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const functionBody = (source, name) => {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} exists`);
  const next = source.indexOf('\n  function ', start + 1);
  return source.slice(start, next >= 0 ? next : source.length);
};

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

test('supervisor enhancer isolates realtime and history tab ownership', () => {
  const source = read('assets/supervisor-dashboard-enhancer.js');
  const renderHistory = functionBody(source, 'renderHistory');

  assert.match(source, /function activeSupervisorPage\(app\)/);
  assert.match(source, /function restoreReactNodes\(root\)/);
  assert.match(source, /function renderHistory\(root, analytics\)/);
  assert.match(source, /data-supervisor-history/);
  assert.match(source, /dataset\.supervisorHidden\s*=\s*'true'/);
  assert.match(source, /querySelectorAll\('\[data-supervisor-hidden="true"\]'\)\.forEach\(showNode\)/);
  assert.match(source, /const page = activeSupervisorPage\(app\)/);
  assert.match(source, /page === 'realtime'/);
  assert.match(source, /page === 'history'/);
  assert.match(source, /railagent:analytics-updated/);
  assert.doesNotMatch(renderHistory, /data-supervisor-metrics|dataset\.supervisorMetrics/);
  assert.doesNotMatch(renderHistory, /data-supervisor-workforce|dataset\.supervisorWorkforce/);
});

test('supervisor bottom navigation owns realtime home and history pages', () => {
  const source = read('assets/supervisor-dashboard-enhancer.js');

  assert.match(source, /function supervisorApp\(\)/);
  assert.match(source, /function supervisorNavigation\(app\)/);
  assert.match(source, /function activeSupervisorPage\(app\)/);
  assert.match(source, /function setNavigationButtonLabel\(button, label\)/);
  assert.match(source, /setNavigationButtonLabel\(button, '歷史'\)/);
  assert.doesNotMatch(source, /button\.textContent = '歷史'/);
  assert.match(source, /title\.textContent = '即時營運監控'/);
  assert.match(source, /description\.textContent = '掌握拾獲物品、旅客追蹤與各站點即時營運概況'/);
  assert.match(source, /historyTitle\.textContent = '歷史服務品質分析'/);
  assert.match(source, /historyDescription\.textContent = '透過事件趨勢、使用次數與服務回饋檢視營運品質'/);
  assert.match(source, /data-supervisor-home-title/);
  assert.match(source, /data-supervisor-history-page/);
  assert.doesNotMatch(source, /function activeSupervisorTab\(root\)/);
});
