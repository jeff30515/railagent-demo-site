const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const plain = (value) => JSON.parse(JSON.stringify(value));
const functionBody = (source, name) => {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} exists`);
  const next = source.indexOf('\n  function ', start + 1);
  return source.slice(start, next >= 0 ? next : source.length);
};

test('history snapshot contains the approved dataset totals', () => {
  const snapshot = JSON.parse(read('data/supervisor-history-analytics.json'));
  assert.equal(snapshot.lostItems.month, '2023-07');
  assert.equal(snapshot.lostItems.coverageEnd, '2023-07-17');
  assert.equal(snapshot.lostItems.total, 2083);
  assert.equal(Object.values(snapshot.lostItems.daily).reduce((a, b) => a + b, 0), 2083);
  assert.deepEqual(snapshot.railAgent.seed, { week: 119, month: 144, year: 261 });
  assert.deepEqual(snapshot.facilityReports.seed, { week: 24, month: 34, year: 75 });
  assert.deepEqual(snapshot.feedback.seed, { 1: 6, 2: 12, 3: 25, 4: 35, 5: 36 });
});

test('browser analytics module declares the required storage keys and safe merge helpers', () => {
  const source = read('assets/supervisor-history-analytics.js');

  assert.match(source, /railagent\.analytics\.chat-uses\.v1/);
  assert.match(source, /railagent\.analytics\.facility-reports\.v1/);
  assert.match(source, /railagent\.feedback\.v1/);
  assert.match(source, /function countsForWindows/);
  assert.match(source, /function safeRecords/);
});

test('browser analytics module is loaded before chat and supervisor enhancers', () => {
  const html = read('index.html');
  const analytics = html.indexOf('supervisor-history-analytics.js?v=20260726-supervisor-history-analytics-1');
  const chat = html.indexOf('lost-found-local-api.js');
  const supervisor = html.indexOf('supervisor-dashboard-enhancer.js');

  assert.ok(analytics >= 0);
  assert.ok(chat > analytics);
  assert.ok(supervisor > analytics);
});

test('real chat and successful facility submissions record supervisor history activity', () => {
  const chatSource = read('assets/lost-found-local-api.js');
  const facilitySource = read('assets/facility-report-feedback.js');

  assert.match(chatSource, /recordRailAgentUse\(new Date\(\)\.toISOString\(\)\)/);
  assert.match(facilitySource, /recordFacilityReport\(new Date\(\)\.toISOString\(\)\)/);

  const emptyQuestionGuard = chatSource.indexOf('if (!question || send.disabled) return;');
  const chatRecord = chatSource.indexOf('recordRailAgentUse(new Date().toISOString())');
  const chatFetch = chatSource.indexOf('await fetch(chatEndpoint');
  assert.ok(emptyQuestionGuard >= 0);
  assert.ok(chatRecord > emptyQuestionGuard);
  assert.ok(chatFetch > chatRecord);

  const facilityValidationGuard = facilitySource.indexOf('if (!input.value.trim()) {');
  const facilityRecord = facilitySource.indexOf('recordFacilityReport(new Date().toISOString())');
  const facilitySuccess = facilitySource.indexOf("className: 'facility-report-feedback__success'");
  assert.ok(facilityValidationGuard >= 0);
  assert.ok(facilityRecord > facilityValidationGuard);
  assert.ok(facilitySuccess > facilityRecord);
});

test('browser analytics module merges only valid local records newer than anchors', async () => {
  const source = read('assets/supervisor-history-analytics.js');
  const snapshot = JSON.parse(read('data/supervisor-history-analytics.json'));
  const stored = new Map([
    [
      'railagent.analytics.chat-uses.v1',
      JSON.stringify([
        { createdAt: '2026-07-13T13:14:01+08:00' },
        { createdAt: '2026-07-20T09:00:00+08:00' },
        { createdAt: 'bad-date' },
        null,
      ]),
    ],
    [
      'railagent.analytics.facility-reports.v1',
      JSON.stringify([
        { createdAt: '2026-07-13T13:13:01+08:00' },
        { createdAt: '2026-07-25T09:00:00+08:00' },
      ]),
    ],
    ['railagent.feedback.v1', '{not json'],
  ]);
  const events = [];
  const FixedDate = class extends Date {
    constructor(...args) {
      super(...(args.length ? args : ['2026-07-26T12:00:00+08:00']));
    }

    static now() {
      return new Date('2026-07-26T12:00:00+08:00').getTime();
    }
  };
  const context = {
    console,
    setTimeout,
    clearTimeout,
    Promise,
    Date: FixedDate,
    CustomEvent: class {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
  };
  context.window = {
    localStorage: {
      getItem: (key) => (stored.has(key) ? stored.get(key) : null),
      setItem: (key, value) => stored.set(key, value),
    },
    dispatchEvent: (event) => events.push(event),
  };
  context.globalThis = context.window;
  context.fetch = async (url) => {
    assert.equal(url, '/railagent-demo-site/data/supervisor-history-analytics.json');
    return {
      ok: true,
      json: async () => snapshot,
    };
  };

  vm.runInNewContext(source, context);

  const initial = await context.window.RailAgentSupervisorHistory.snapshot();
  assert.deepEqual(plain(initial.railAgent.totals), { week: 120, month: 145, year: 262 });
  assert.deepEqual(plain(initial.facilityReports.totals), { week: 25, month: 35, year: 76 });
  assert.deepEqual(plain(initial.feedback.totals), { 1: 6, 2: 12, 3: 25, 4: 35, 5: 36 });

  context.window.RailAgentSupervisorHistory.recordRailAgentUse('2026-07-26T10:00:00+08:00');
  context.window.RailAgentSupervisorHistory.recordFacilityReport('2026-07-26T11:00:00+08:00');
  const updated = await context.window.RailAgentSupervisorHistory.snapshot();

  assert.deepEqual(plain(updated.railAgent.totals), { week: 121, month: 146, year: 263 });
  assert.deepEqual(plain(updated.facilityReports.totals), { week: 26, month: 36, year: 77 });
  assert.equal(events.filter((event) => event.type === 'railagent:analytics-updated').length, 2);
});

test('browser analytics module uses newest valid record date instead of browser now for windows', async () => {
  const source = read('assets/supervisor-history-analytics.js');
  const snapshot = JSON.parse(read('data/supervisor-history-analytics.json'));
  const stored = new Map([
    [
      'railagent.analytics.chat-uses.v1',
      JSON.stringify([
        { createdAt: '2026-07-25T09:00:00+08:00' },
        { createdAt: '2026-07-20T09:00:00+08:00' },
      ]),
    ],
    ['railagent.analytics.facility-reports.v1', '[]'],
  ]);
  const FixedDate = class extends Date {
    constructor(...args) {
      super(...(args.length ? args : ['2026-08-15T12:00:00+08:00']));
    }

    static now() {
      return new Date('2026-08-15T12:00:00+08:00').getTime();
    }
  };
  const context = {
    console,
    setTimeout,
    clearTimeout,
    Promise,
    Date: FixedDate,
    CustomEvent: class {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
  };
  context.window = {
    localStorage: {
      getItem: (key) => (stored.has(key) ? stored.get(key) : null),
      setItem: (key, value) => stored.set(key, value),
    },
    dispatchEvent() {},
  };
  context.globalThis = context.window;
  context.fetch = async () => ({
    ok: true,
    json: async () => snapshot,
  });

  vm.runInNewContext(source, context);

  const current = await context.window.RailAgentSupervisorHistory.snapshot();

  assert.deepEqual(plain(current.railAgent.totals), { week: 121, month: 146, year: 263 });
  assert.deepEqual(plain(current.facilityReports.totals), { week: 24, month: 34, year: 75 });
});

test('supervisor history renderer declares the approved four card dataset output', () => {
  const source = read('assets/supervisor-dashboard-enhancer.js');
  const renderHistory = functionBody(source, 'renderHistory');

  assert.match(source, /data-supervisor-history/);
  assert.match(source, /本月事件量趨勢/);
  assert.match(source, /資料範圍至/);
  assert.match(source, /總計/);
  assert.match(source, /RailAgent 使用次數統計/);
  assert.match(source, /服務設施回報次數/);
  assert.match(source, /服務回饋統計/);
  assert.match(source, /metric\('本週', summaryText\(totals\?\.week\), false\)/);
  assert.match(source, /metric\('本月', summaryText\(totals\?\.month\), false\)/);
  assert.match(source, /metric\('本年', summaryText\(totals\?\.year\), false\)/);
  assert.doesNotMatch(source, /card\('2023 年 7 月拾獲日曆'/);
  assert.doesNotMatch(source, /RailAgent 使用次數趨勢/);
  assert.doesNotMatch(source, /設施回報累計次數/);
  assert.doesNotMatch(source, /服務回饋分數/);
  assert.doesNotMatch(source, /metric\('近 7 日'/);
  assert.match(source, /function cardByText\(root, matcher\)/);
  assert.match(source, /function clearEnhancerNode\(node\)/);
  assert.match(renderHistory, /cardByText\(root, \/歷史服務品質分析\/\)/);
  assert.match(renderHistory, /clearEnhancerNode\(container\)/);
  assert.match(source, /const unavailable = day >= 18/);
  assert.match(source, /dayValue\.textContent = unavailable \? '—'/);
  assert.doesNotMatch(renderHistory, /data-supervisor-metrics|dataset\.supervisorMetrics/);
  assert.doesNotMatch(renderHistory, /data-supervisor-workforce|dataset\.supervisorWorkforce/);
});

test('supervisor history calendar styles are scoped and phone-width safe', () => {
  const css = read('assets/index-lostitem-v1.css');

  assert.match(css, /\[data-supervisor-history\] \.supervisor-calendar\{display:grid;grid-template-columns:repeat\(7,minmax\(0,1fr\)\);gap:6px\}/);
  assert.match(css, /\[data-supervisor-history\] \.supervisor-calendar-day\{/);
  assert.match(css, /min-width:0/);
  assert.match(css, /overflow-wrap:anywhere/);
  assert.match(css, /@media\(max-width:390px\)/);
});

test('cache versions are bumped for the supervisor history rendering layer', () => {
  const html = read('index.html');

  assert.match(html, /supervisor-dashboard-enhancer\.js\?v=20260726-supervisor-history-render-1/);
  assert.match(html, /index-lostitem-v1\.css\?v=20260726-supervisor-history-render-1/);
});
