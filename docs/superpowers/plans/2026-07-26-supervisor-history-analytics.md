# Supervisor History Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the supervisor history tab with a July 2023 lost-item calendar, RailAgent usage totals, facility-report totals, and satisfaction-score totals while preserving the approved realtime dashboard.

**Architecture:** Add a checked-in analytics snapshot generated from the existing TRA lost-item and event datasets, plus one focused browser analytics module that merges timestamped local activity. Extend the existing supervisor enhancer to detect the active React tab, restore React-owned nodes before each pass, render an isolated history layer only on the history tab, and render the existing realtime layers only on the realtime tab.

**Tech Stack:** Static JSON, browser JavaScript, localStorage, existing RailAgent DOM/CSS classes, Node.js built-in test runner.

## Global Constraints

- Historical analytics must remain visible on GitHub Pages without `apiBaseUrl`.
- The lost-item calendar uses the dataset's final month, currently July 2023.
- Dates after the dataset coverage end display `—`, not zero.
- RailAgent usage counts only user-submitted chat messages.
- Week, month, and year windows are anchored to each source's latest record; weeks start Monday.
- React-owned nodes may be hidden temporarily but must never be removed or replaced.
- The history tab must contain only the four approved analytics sections.
- The realtime tab must retain only its already-approved metrics and workforce content.

---

### Task 1: Checked-in analytics snapshot and merge utility

**Files:**
- Create: `data/supervisor-history-analytics.json`
- Create: `assets/supervisor-history-analytics.js`
- Create: `tests/supervisor-history-analytics.test.cjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: TRA `pickupDate` results already downloaded to the local backend dataset and `data/events-catalog.json`.
- Produces: `window.RailAgentSupervisorHistory` with `snapshot()`, `recordRailAgentUse(createdAt)`, and `recordFacilityReport(createdAt)`.

- [ ] **Step 1: Write the failing snapshot test**

```js
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
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test tests/supervisor-history-analytics.test.cjs`  
Expected: FAIL because the snapshot file does not exist.

- [ ] **Step 3: Add the exact snapshot**

Create JSON containing:

```json
{
  "lostItems": {
    "month": "2023-07",
    "coverageEnd": "2023-07-17",
    "total": 2083,
    "daily": {
      "2023-07-01": 110,
      "2023-07-02": 100,
      "2023-07-03": 106,
      "2023-07-04": 111,
      "2023-07-05": 107,
      "2023-07-06": 98,
      "2023-07-07": 130,
      "2023-07-08": 113,
      "2023-07-09": 136,
      "2023-07-10": 103,
      "2023-07-11": 107,
      "2023-07-12": 125,
      "2023-07-13": 126,
      "2023-07-14": 153,
      "2023-07-15": 133,
      "2023-07-16": 208,
      "2023-07-17": 117
    }
  },
  "railAgent": {
    "anchor": "2026-07-13T13:14:01+08:00",
    "seed": { "week": 119, "month": 144, "year": 261 }
  },
  "facilityReports": {
    "anchor": "2026-07-13T13:13:01+08:00",
    "seed": { "week": 24, "month": 34, "year": 75 }
  },
  "feedback": {
    "seed": { "1": 6, "2": 12, "3": 25, "4": 35, "5": 36 }
  }
}
```

- [ ] **Step 4: Write failing merge and corruption tests**

Assert that the browser module:

```js
assert.match(source, /railagent\\.analytics\\.chat-uses\\.v1/);
assert.match(source, /railagent\\.analytics\\.facility-reports\\.v1/);
assert.match(source, /railagent\\.feedback\\.v1/);
assert.match(source, /function countsForWindows/);
assert.match(source, /function safeRecords/);
```

- [ ] **Step 5: Implement the browser analytics module**

The module must:

```js
const CHAT_KEY = 'railagent.analytics.chat-uses.v1';
const FACILITY_KEY = 'railagent.analytics.facility-reports.v1';
const FEEDBACK_KEY = 'railagent.feedback.v1';
```

It fetches `/railagent-demo-site/data/supervisor-history-analytics.json`, ignores malformed local records, merges only records newer than the fixed anchor into seed totals, derives Monday-based week/month/year totals, and dispatches `railagent:analytics-updated` after recording new activity.

- [ ] **Step 6: Load the module before the chat and supervisor enhancers**

Add a deferred versioned script in `index.html` before `lost-found-local-api.js` and `supervisor-dashboard-enhancer.js`.

- [ ] **Step 7: Run the tests**

Run: `node --test tests/supervisor-history-analytics.test.cjs`  
Expected: PASS.

- [ ] **Step 8: Commit**

Commit with a Lore message explaining why the public snapshot is checked in and how malformed local records degrade safely.

---

### Task 2: Record real chat messages and facility reports

**Files:**
- Modify: `assets/lost-found-local-api.js`
- Modify: `assets/facility-report-feedback.js`
- Modify: `tests/supervisor-history-analytics.test.cjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: `window.RailAgentSupervisorHistory.recordRailAgentUse()` and `.recordFacilityReport()`.
- Produces: timestamped local activity records for later aggregation.

- [ ] **Step 1: Write failing instrumentation tests**

```js
assert.match(chatSource, /recordRailAgentUse\\(new Date\\(\\)\\.toISOString\\(\\)\\)/);
assert.match(facilitySource, /recordFacilityReport\\(new Date\\(\\)\\.toISOString\\(\\)\\)/);
```

Also assert that `recordRailAgentUse` appears after the empty-question guard and before the chat fetch, while `recordFacilityReport` appears only in the successful facility submission path.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `node --test tests/supervisor-history-analytics.test.cjs`  
Expected: FAIL because neither submission path records analytics yet.

- [ ] **Step 3: Instrument RailAgent message submission**

Immediately after a non-empty question is accepted:

```js
window.RailAgentSupervisorHistory?.recordRailAgentUse(new Date().toISOString());
```

Count once even when the backend request later fails, because the metric is message submissions, not successful answers.

- [ ] **Step 4: Instrument successful facility submission**

After the form reports a successful facility submission:

```js
window.RailAgentSupervisorHistory?.recordFacilityReport(new Date().toISOString());
```

Do not increment validation failures or failed submissions.

- [ ] **Step 5: Bump both script cache versions**

Change the corresponding `index.html` query strings so GitHub Pages clients do not reuse old instrumentation.

- [ ] **Step 6: Run focused and full tests**

Run:

```powershell
node --test tests\supervisor-history-analytics.test.cjs
node --test tests\*.test.cjs
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

Commit with a Lore message documenting the exact counting boundaries.

---

### Task 3: Render the four-section history dashboard and isolate tabs

**Files:**
- Modify: `assets/supervisor-dashboard-enhancer.js`
- Modify: `assets/index-lostitem-v1.css`
- Modify: `tests/supervisor-dashboard-runtime.test.cjs`
- Modify: `tests/supervisor-history-analytics.test.cjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: `window.RailAgentSupervisorHistory.snapshot()`.
- Produces: `[data-supervisor-history]` containing the calendar, RailAgent totals, facility totals, and feedback totals.

- [ ] **Step 1: Write failing tab-isolation and rendering tests**

Assert source contains:

```js
function activeSupervisorTab(root)
function restoreReactNodes(root)
function renderHistory(root, analytics)
data-supervisor-history
本月事件量趨勢
RailAgent 使用次數統計
服務設施回報次數
服務回饋統計
```

Assert the history renderer does not reuse `data-supervisor-metrics` or `data-supervisor-workforce`, and that the enhancer listens for `railagent:analytics-updated`.

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```powershell
node --test tests\supervisor-dashboard-runtime.test.cjs
node --test tests\supervisor-history-analytics.test.cjs
```

Expected: FAIL because the history layer and active-tab isolation do not exist.

- [ ] **Step 3: Restore React-owned nodes before applying a tab layout**

Tag every React-owned node hidden by the enhancer:

```js
node.dataset.supervisorHidden = 'true';
```

At the beginning of every pass:

```js
root.querySelectorAll('[data-supervisor-hidden="true"]').forEach(showNode);
root.querySelectorAll('[data-supervisor-metrics],[data-supervisor-workforce],[data-supervisor-history]')
  .forEach(hideNode);
```

Determine the active tab from the two tab buttons' `aria-pressed` values.

- [ ] **Step 4: Keep realtime behavior on the realtime tab only**

Run `removeObsoletePanels`, `replaceKpis`, and `replaceWorkforce` only when `activeSupervisorTab(root) === 'realtime'`. Re-show the existing injected realtime layers when returning from history.

- [ ] **Step 5: Render the history layer only on the history tab**

Hide the original React history fragment without deleting it. Append one enhancer-owned history container with four cards:

1. Calendar card with seven weekday headers, blank leading cells, July 1–17 counts, and July 18–31 `—`.
2. RailAgent card using three `mp-kpi` cells for 本週、本月、本年.
3. Facility card using three `mp-kpi` cells for 本週、本月、本年.
4. Feedback card using five score cells labeled 1 分 through 5 分.

The history container must include `2023 年 7 月`, `資料統計至 2023/07/17`, and `本月共 2,083 件`.

- [ ] **Step 6: Add scoped responsive calendar styles**

Add:

```css
.supervisor-calendar { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:6px; }
.supervisor-calendar-day { align-items:center; background:#fff; border:1px solid rgba(19,59,83,.1); border-radius:12px; display:flex; flex-direction:column; justify-content:center; min-height:58px; padding:6px 2px; text-align:center; }
.supervisor-calendar-day strong { color:var(--mp-navy-deep); display:block; font-size:1rem; margin-top:3px; }
.supervisor-calendar-day.is-unavailable { opacity:.55; }
```

Keep all selectors under `[data-supervisor-history]` and ensure the 390px phone viewport has no horizontal overflow.

- [ ] **Step 7: Refresh on new analytics activity**

Listen for `railagent:analytics-updated`, invalidate the cached snapshot, and rerender the history layer when it is active.

- [ ] **Step 8: Bump cache versions and run all automated tests**

Run:

```powershell
node --test tests\*.test.cjs
git diff --check
```

Expected: all tests PASS and no whitespace errors.

- [ ] **Step 9: Verify the public interaction path**

After pushing and GitHub Pages deployment:

1. Open a cache-busted public URL.
2. Select 繁中 → 站務／主管 → 主管 → 登入.
3. Click 歷史服務品質分析.
4. Verify the four approved cards and exact seed totals.
5. Verify July daily cells sum to 2,083 and July 18–31 display `—`.
6. Switch realtime → history three times and confirm neither tab is blank or mixed.
7. Submit one RailAgent message and confirm the applicable RailAgent period totals increase by one.
8. Capture a mobile viewport screenshot for visual review.

- [ ] **Step 10: Commit and push**

Commit with a Lore message listing automated and browser verification, push `HEAD:main`, and report the public cache-busted URL.
