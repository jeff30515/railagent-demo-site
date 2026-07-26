# Task 3 Report: Supervisor History Rendering

## Status
- Complete locally; not pushed.
- Implemented history tab rendering in `assets/supervisor-dashboard-enhancer.js`.
- Preserved React-owned nodes by tagging hidden nodes with `data-supervisor-hidden="true"` and restoring them at the start of every enhancement pass.

## Modified Files
- `assets/supervisor-dashboard-enhancer.js`
- `assets/index-lostitem-v1.css`
- `tests/supervisor-dashboard-runtime.test.cjs`
- `tests/supervisor-history-analytics.test.cjs`
- `index.html`

## Tab State Machine
- `activeSupervisorTab(root)` reads the two supervisor tab buttons by `aria-pressed`.
- Every `enhance()` pass first calls `restoreReactNodes(root)`, then hides enhancer-owned realtime/history layers.
- Realtime tab only runs `removeObsoletePanels`, `replaceKpis`, and `replaceWorkforce`.
- History tab only shows `[data-supervisor-history]`; realtime metrics/workforce remain hidden.
- Legacy React history cards are hidden with `hidden/display:none/aria-hidden`, not removed.
- Existing history containers are enhancer-owned and are cleared/rebuilt on analytics refresh.

## Calendar Generation
- Calendar renders weekday headers plus July 1-31.
- July 1-17 are read from `window.RailAgentSupervisorHistory.snapshot().lostItems.daily`.
- July 18-31 are marked unavailable and display `—`.
- Browser smoke confirmed July 1-17 sum to `2,083`.

## Red/Green Evidence
- RED: `node --test tests\supervisor-dashboard-runtime.test.cjs` failed on missing `activeSupervisorTab(root)`.
- RED: `node --test tests\supervisor-history-analytics.test.cjs` failed on missing `[data-supervisor-history]`, calendar CSS, and cache bust.
- RED: browser smoke found the React history summary card still visible; regression then failed until `cardByText(root, /歷史服務品質分析/)` was added.
- RED: regression for analytics refresh failed until `clearEnhancerNode(node)` rebuilt the enhancer-owned history container.
- GREEN: focused tests pass after implementation.

## Tests And Visual Checks
- `node --test tests\supervisor-dashboard-runtime.test.cjs` -> 5/5 pass.
- `node --test tests\supervisor-history-analytics.test.cjs` -> 9/9 pass.
- `node --test tests\*.test.cjs` -> 46/46 pass.
- `node --check assets\supervisor-dashboard-enhancer.js` -> exit 0.
- `git diff --check` -> exit 0; Git reported CRLF normalization warnings only.
- Playwright Chrome smoke at 390x844 with routed local assets:
  - staff -> supervisor login -> history/realtime toggled three times.
  - History tab visible cards: `2023 年 7 月拾獲日曆`, `RailAgent 使用次數趨勢`, `設施回報累計次數`, `服務回饋分數`.
  - Legacy history cards visible: none.
  - Realtime metrics/workforce visible on history tab: false/false.
  - July day count: 31; July 18-31 values: all `—`.
  - July 1-17 sum: `2,083`.
  - `documentElement.scrollWidth - clientWidth`: 0.
  - Console errors: 0.
  - Analytics refresh smoke: RailAgent 近 7 日 updated from `119` to `120`.

## Commit
- `0e538e4` before report hash correction; amended final hash is reported in the task handoff.

## Self Review
- Checked for `.remove()` and `.replaceChildren()` regressions through existing tests.
- Confirmed history renderer does not touch `[data-supervisor-metrics]` or `[data-supervisor-workforce]`.
- Confirmed `railagent:analytics-updated` invalidates cache and active history rerenders.
- Confirmed cache versions changed for enhancer and CSS.

## Concerns
- Public GitHub Pages verification was not run because this task explicitly must not push.
- Visual smoke used local Playwright route mapping for `/railagent-demo-site/*`, not the public deployed URL.

## Fix Round 1
- Review severity: Important.
- Fixed visible history card titles to the approved exact strings:
  - `本月事件量趨勢`
  - `RailAgent 使用次數統計`
  - `服務設施回報次數`
  - `服務回饋統計`
- Updated period labels from `近 7 日` to `本週`; kept `本月` and `本年`.
- First card still preserves `2023 年 7 月` in the calendar aria label and keeps the data coverage/total metadata.
- Updated `tests/supervisor-history-analytics.test.cjs` to require the approved strings and reject the previous visible labels.
- Focused verification after fix:
  - `node --test tests\supervisor-history-analytics.test.cjs` -> 9/9 pass.
  - `node --test tests\supervisor-dashboard-runtime.test.cjs` -> 5/5 pass.

## Fix Round 2
- Review severity: Important.
- Added regression coverage for fixed snapshot `undefined` and rejected snapshot paths.
- History fallback now still renders the exact four history cards when analytics cannot load:
  - `本月事件量趨勢`
  - `RailAgent 使用次數統計`
  - `服務設施回報次數`
  - `服務回饋統計`
- Fallback values render as `—`, and the history tab shows `統計資料暫時無法讀取`.
- History fallback hides root-level legacy React history Demo cards before appending enhancer-owned cards, preventing mixed display.
- `assets/supervisor-history-analytics.js` clears a rejected fixed snapshot request from `snapshotPromise`, so a later snapshot call can retry fetch.
- TDD evidence:
  - RED: `node --test tests\supervisor-history-analytics.test.cjs` failed on permanent rejected snapshot cache and missing fallback history container.
  - GREEN: `node --test tests\supervisor-history-analytics.test.cjs` -> 12/12 pass after implementation.

## Fix Round 3
- Review severity: Important.
- Public GitHub Pages verification found the legacy orange core-difference notice visible on the history tab:
  `核心差異：跨大眾運輸資訊 × 服務事件（捷運／臺鐵／高鐵交接），不是單一運具票務 App。`
- Root cause: `enhance()` restored React-owned hidden nodes on every pass, but obsolete panel hiding only ran in the realtime branch.
- Added regression coverage for the realtime -> history tab transition so the core-difference notice remains hidden after restore.
- Minimal fix: `removeObsoletePanels(root)` now runs immediately after restore for both realtime and history; tab-specific enhancer content still stays isolated.
- Preserved React node ownership: no `.remove()`, `.replaceChildren()`, or mutation observer was introduced.
- Bumped supervisor history render cache query from `20260726-supervisor-history-render-1` to `20260726-supervisor-history-render-2`.
- TDD evidence:
  - RED: `node --test tests\supervisor-history-analytics.test.cjs` failed because the core-difference notice became visible after switching to history.
  - GREEN: `node --test tests\supervisor-history-analytics.test.cjs` -> 13/13 pass after implementation.
