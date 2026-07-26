# Task 1 Report: Supervisor Bottom Navigation

## Red Evidence

- `node --test tests\supervisor-dashboard-runtime.test.cjs` initially failed after adding the new source guards:
  - missing `function activeSupervisorPage(app)`
  - missing `function supervisorApp()`
  - old `function activeSupervisorTab(root)` still present
- `node --test tests\supervisor-history-analytics.test.cjs` initially failed after adding the DOM regression:
  - bottom navigation task button remained `敺齒` instead of `甇瑕`

## Green Evidence

- `node --test tests\supervisor-dashboard-runtime.test.cjs` -> 6 pass, 0 fail
- `node --test tests\supervisor-history-analytics.test.cjs` -> 14 pass, 0 fail
- `node --test tests\*.test.cjs` -> 52 pass, 0 fail
- `node --check assets\supervisor-dashboard-enhancer.js` -> exit 0
- `git diff --check` -> exit 0; Windows line-ending warnings only

## Modified Files

- `assets/supervisor-dashboard-enhancer.js`
  - Replaced top-tab page classification with supervisor bottom-navigation classification.
  - Added supervisor app/navigation/page helpers.
  - Renamed the supervisor history bottom-nav button to `甇瑕`.
  - Added enhancer-owned realtime home title and history page containers.
  - Kept React-owned nodes hidden/restored without removing or replacing them.
  - Mounted history analytics inside the supervisor workspace shell when present.
- `tests/supervisor-dashboard-runtime.test.cjs`
  - Added source guards for the new supervisor bottom-navigation contract.
- `tests/supervisor-history-analytics.test.cjs`
  - Extended the DOM test stub for scoped class/attribute selectors and `insertBefore`.
  - Added redraw and page-isolation regression coverage for realtime, history, and account.
  - Updated cache-version expectation.
- `index.html`
  - Bumped supervisor enhancer and CSS cache query strings to `20260727-supervisor-bottom-navigation-1`.

## Self Review

- No `.remove()` or `.replaceChildren()` calls were introduced.
- React-owned original hero, top tablist, old task content, and legacy cards are hidden with `hidden`, `display: none`, and `aria-hidden`, not removed.
- Enhancer-owned home/history nodes are reused and cleared through `removeChild` only inside enhancer-owned containers.
- Passenger and station-staff navigation are not selected because the new behavior starts from `.mobile-app-supervisor`.
- A legacy fallback remains for existing tests without `.mobile-app-supervisor`; production path still prefers the scoped supervisor app.

## Concerns

- Superseded in Fix Round 1: public bottom-nav/history/home output now uses real Chinese copy, while legacy mojibake recognition remains only for fallback compatibility.
- Public GitHub Pages behavior was not verified because deployment was outside this task.

## Fix Round 1

### Review Fix Scope

- Corrected public supervisor navigation copy to use real labels:
  - Input DOM fixture: `首頁／待辦／帳戶`
  - Output DOM: `首頁／歷史／帳戶`
  - Enhancer-owned home heading: `即時營運監控`
- Kept `.mobile-app-supervisor` as the primary app scope with shell/nav sibling structure.
- Preserved React-owned node hiding/restoration, four-card history rendering, and legacy fallback coverage.

### Red Evidence

- `node --test tests\supervisor-dashboard-runtime.test.cjs` failed because production still had `button.textContent = '甇瑕'` instead of `button.textContent = '歷史'`.
- `node --test tests\supervisor-history-analytics.test.cjs` failed because the bottom navigation stayed `首頁／待辦／帳戶` instead of becoming `首頁／歷史／帳戶`.

### Green Evidence

- `node --test tests\supervisor-dashboard-runtime.test.cjs` -> 6 pass, 0 fail
- `node --test tests\supervisor-history-analytics.test.cjs` -> 14 pass, 0 fail
- `node --check assets\supervisor-dashboard-enhancer.js` -> exit 0

### Remaining Notes

- Public deployment was still not exercised in this local fix round.

## Final Review Fix Round 1

### Review Fix Scope

- Preserved React-owned bottom navigation icon/child nodes by updating only the label node/text for `待辦` -> `歷史`.
- Added home cleanup for the original React `站點熱點` card.
- Extended DOM regression with icon + label nav structure and repeated `首頁 -> 歷史 -> 帳戶 -> 首頁 -> 歷史` switching.
- Kept `.mobile-app-supervisor` scoping, sibling shell/nav behavior, four-card history rendering, and fallback history behavior.

### Red Evidence

- `node --test tests\supervisor-history-analytics.test.cjs` failed because direct `button.textContent = '歷史'` removed the `.mp-nav-ico` child in the regression fixture.
- The same regression initially showed `站點熱點` remained visible on Home until the cleanup path was extended.

### Green Evidence

- `node --test tests\supervisor-dashboard-runtime.test.cjs` -> 6 pass, 0 fail
- `node --test tests\supervisor-history-analytics.test.cjs` -> 14 pass, 0 fail
- `node --check assets\supervisor-dashboard-enhancer.js` -> exit 0

### Remaining Notes

- Public deployment was still not exercised in this local fix round.
