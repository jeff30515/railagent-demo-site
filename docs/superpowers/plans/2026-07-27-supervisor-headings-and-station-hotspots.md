# Supervisor Headings and Station Hotspots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the supervisor home station-hotspot table and add approved headings plus descriptions to the Home and History pages.

**Architecture:** Keep the React-owned station-hotspot card and stop hiding it in the supervisor enhancer. Add only enhancer-owned heading/description nodes to the already isolated Home and History containers. The current bottom-navigation ownership and React-node hide/restore contract remains unchanged.

**Tech Stack:** Static HTML loading a browser JavaScript enhancer, CSS, Node.js built-in test runner.

## Global Constraints

- Home copy is exactly `即時營運監控` and `掌握拾獲物品、旅客追蹤與各站點即時營運概況`.
- History copy is exactly `歷史服務品質分析` and `透過事件趨勢、使用次數與服務回饋檢視營運品質`.
- Restore only the React-owned `站點熱點` card.
- Keep `時段熱點`, `狀態佇列`, `優先佇列`, and the old task/drill-down content hidden.
- Preserve React ownership: do not remove or replace React-owned DOM nodes.
- Keep bottom navigation `首頁／歷史／帳戶`, all icon children, and 390px no-horizontal-overflow behavior.

---

### Task 1: Restore the station-hotspot card and page headings

**Files:**
- Modify: `assets/supervisor-dashboard-enhancer.js`
- Modify: `tests/supervisor-dashboard-runtime.test.cjs`
- Modify: `tests/supervisor-history-analytics.test.cjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: `.mobile-app-supervisor`, its React-owned `[aria-label="主管營運駕駛艙"]`, and the sibling bottom navigation.
- Produces: one visible `[data-supervisor-home-title]` including the approved Home heading and description; one History heading/description before `[data-supervisor-history]`; a visible React-owned `站點熱點` card on Home only.

- [ ] **Step 1: Write failing regression tests**

Add assertions to the supervisor DOM test that the Home tree contains the exact approved heading and description, that `站點熱點` is not hidden on Home, and that `時段熱點` remains hidden. Add assertions that History includes the exact approved heading and description before the four-card history container and does not display the Home station-hotspot card.

```js
assert.match(homeText, /掌握拾獲物品、旅客追蹤與各站點即時營運概況/);
assert.equal(stationHotspot.hidden, false);
assert.equal(timeHotspot.hidden, true);
assert.match(historyText, /歷史服務品質分析/);
assert.match(historyText, /透過事件趨勢、使用次數與服務回饋檢視營運品質/);
assert.equal(stationHotspot.hidden, true);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests\\supervisor-history-analytics.test.cjs`

Expected: FAIL because the current enhancer hides `站點熱點` and creates neither approved description.

- [ ] **Step 3: Implement the minimum behavior**

Remove only the `站點熱點` hide path from `removeObsoletePanels`. Update the Home heading helper to create/reuse an enhancer-owned `p.mp-footnote` description after the `h2`. Add a History heading block containing the approved `h2` and `p.mp-footnote` before the history four-card container; reuse the block on rerenders.

```js
title.textContent = '即時營運監控';
description.textContent = '掌握拾獲物品、旅客追蹤與各站點即時營運概況';
historyTitle.textContent = '歷史服務品質分析';
historyDescription.textContent = '透過事件趨勢、使用次數與服務回饋檢視營運品質';
```

- [ ] **Step 4: Run focused tests and verify them pass**

Run: `node --test tests\\supervisor-dashboard-runtime.test.cjs; node --test tests\\supervisor-history-analytics.test.cjs`

Expected: both focused suites pass with the station-hotspot and page-copy regressions covered.

- [ ] **Step 5: Bump only the supervisor cache key**

Update the query string for `supervisor-dashboard-enhancer.js` and its CSS in `index.html` so GitHub Pages clients load this revised behavior.

- [ ] **Step 6: Run all verification and commit**

Run: `node --test tests\\*.test.cjs; node --check assets\\supervisor-dashboard-enhancer.js; git diff --check`

Expected: all tests pass, syntax is valid, and no whitespace errors are reported.

Commit with Lore trailers explaining that the station-hotspot table is restored while the previously removed operational queues remain hidden.
