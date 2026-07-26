## Status

Completed Task 1 in `force-public`.

## Changes

- Restored the React-owned Home `站點熱點` card instead of rebuilding it.
- Kept `時段熱點`, `狀態佇列`, `優先佇列`, and the old drill-down action hidden.
- Added the approved Home heading description: `掌握拾獲物品、旅客追蹤與各站點即時營運概況`.
- Added a reusable History heading block before `[data-supervisor-history]` with:
  - `歷史服務品質分析`
  - `透過事件趨勢、使用次數與服務回饋檢視營運品質`
- Bumped only the supervisor enhancer and shared CSS cache keys in `index.html`.

## TDD Evidence

- Red test run: `node --test tests\supervisor-history-analytics.test.cjs` failed on the new Home station-hotspot assertion before production changes.
- Focused green run: `node --test tests\supervisor-dashboard-runtime.test.cjs; node --test tests\supervisor-history-analytics.test.cjs` passed with 6/6 and 14/14 tests.

## Verification

- `node --test tests\*.test.cjs` passed: 52/52 tests.
- `node --check assets\supervisor-dashboard-enhancer.js` passed.
- `git diff --check` passed with only CRLF conversion warnings for touched files.

## Concerns

- No functional blockers found.
- `git diff --check` reports existing line-ending normalization warnings on touched files; no whitespace errors were reported.
