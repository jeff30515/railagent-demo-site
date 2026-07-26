const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const plain = (value) => JSON.parse(JSON.stringify(value));

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
