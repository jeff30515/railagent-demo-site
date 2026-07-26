# Nine-Language Passenger Function Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all nine interface languages use the completed Traditional Chinese passenger workflow, with only the displayed language changing.

**Architecture:** Add one data-only locale module for text introduced by the canonical passenger runtime. Update the existing runtime enhancers to identify React pages by stable attributes and structure instead of Traditional Chinese labels, while retaining one shared set of event handlers, API endpoints, tracked-case storage, and page flows.

**Tech Stack:** Browser JavaScript, React-rendered DOM enhancement, Node.js built-in test runner, Node `vm`, local TypeScript API with Vitest.

## Global Constraints

- Supported languages are exactly `zh-TW`, `nan`, `hak`, `en`, `ja`, `ko`, `vi`, `id`, and `th`.
- Every locale uses the completed Traditional Chinese functionality; only copy changes.
- Existing role-selection images are not translated, replaced, or regenerated.
- Do not load `passenger-i18n.js`, `gate-i18n.js`, or `gate-i18n.css`.
- Do not add an online translation service, language download, or new dependency.
- Bare URLs continue to default the local API to `http://127.0.0.1:7071`.
- API failures keep the full UI visible and show a localized inline error.
- Unknown document languages fall back to `zh-TW`.
- Do not modify the minified React bundle `assets/index-lostitem-talkback.js`.

---

### Task 1: Canonical Runtime Locale Data

**Files:**
- Create: `assets/passenger-runtime-locales.js`
- Create: `tests/passenger-runtime-locales.test.cjs`

**Interfaces:**
- Produces: `window.RailAgentPassengerRuntimeLocales`
- Produces: `SUPPORTED_LANGUAGES: readonly string[]`
- Produces: `normalizeLanguage(documentLanguage: string): string`
- Produces: `getRuntimeCopy(documentLanguage: string): RuntimeCopy`
- Produces: `getPageLabels(documentLanguage: string): PageLabels`
- `RuntimeCopy` contains all text introduced by chat, transfer, lost-item results, facility feedback, case tracking, and connection errors.
- `PageLabels` contains the localized existing React labels needed to identify home and friendly-transfer controls.

- [ ] **Step 1: Write the failing locale-module test**

Create `tests/passenger-runtime-locales.test.cjs`:

```js
const assert = require('node:assert/strict');
const test = require('node:test');

const locales = require('../assets/passenger-runtime-locales.js');

const expectedLanguages = ['zh-TW', 'nan', 'hak', 'en', 'ja', 'ko', 'vi', 'id', 'th'];

test('canonical passenger runtime provides complete copy for all nine languages', () => {
  assert.deepEqual(locales.SUPPORTED_LANGUAGES, expectedLanguages);

  for (const language of expectedLanguages) {
    const copy = locales.getRuntimeCopy(language);
    const pageLabels = locales.getPageLabels(language);

    for (const key of [
      'askRailAgent',
      'chatSubtitle',
      'close',
      'send',
      'chatError',
      'transferHelp',
      'transferRoute',
      'routeOrigin',
      'routeDestination',
      'routeSubmit',
      'routeError',
      'trackItem',
      'tracked',
      'tracking',
      'facilityIssue',
      'facilityRequired',
      'facilityThanks',
      'caseUnfollow',
      'caseUnfollowStatus',
      'feedback',
    ]) {
      assert.equal(typeof copy[key], 'string', `${language}.${key}`);
      assert.ok(copy[key].trim(), `${language}.${key} must not be blank`);
    }

    for (const key of [
      'friendlyTitle',
      'lostTitle',
      'facilityTitle',
      'quickHelp',
      'moreServices',
    ]) {
      assert.equal(typeof pageLabels[key], 'string', `${language}.${key}`);
      assert.ok(pageLabels[key].trim(), `${language}.${key} must not be blank`);
    }
  }
});

test('language aliases normalize without downloading language resources', () => {
  assert.equal(locales.normalizeLanguage('zh-Hant-TW'), 'zh-TW');
  assert.equal(locales.normalizeLanguage('nan-TW'), 'nan');
  assert.equal(locales.normalizeLanguage('hak-TW'), 'hak');
  assert.equal(locales.normalizeLanguage('en-US'), 'en');
  assert.equal(locales.normalizeLanguage('ja-JP'), 'ja');
  assert.equal(locales.normalizeLanguage('ko-KR'), 'ko');
  assert.equal(locales.normalizeLanguage('vi-VN'), 'vi');
  assert.equal(locales.normalizeLanguage('id-ID'), 'id');
  assert.equal(locales.normalizeLanguage('th-TH'), 'th');
  assert.equal(locales.normalizeLanguage('unknown'), 'zh-TW');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test tests/passenger-runtime-locales.test.cjs
```

Expected: FAIL because `assets/passenger-runtime-locales.js` does not exist.

- [ ] **Step 3: Implement the data-only locale module**

Create `assets/passenger-runtime-locales.js` as a browser/CommonJS-compatible data module:

```js
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.RailAgentPassengerRuntimeLocales = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const SUPPORTED_LANGUAGES = ['zh-TW', 'nan', 'hak', 'en', 'ja', 'ko', 'vi', 'id', 'th'];

  const ALIASES = {
    'zh': 'zh-TW',
    'zh-tw': 'zh-TW',
    'zh-hant': 'zh-TW',
    'zh-hant-tw': 'zh-TW',
    'nan': 'nan',
    'nan-tw': 'nan',
    'hak': 'hak',
    'hak-tw': 'hak',
    'en': 'en',
    'en-us': 'en',
    'ja': 'ja',
    'ja-jp': 'ja',
    'ko': 'ko',
    'ko-kr': 'ko',
    'vi': 'vi',
    'vi-vn': 'vi',
    'id': 'id',
    'id-id': 'id',
    'th': 'th',
    'th-th': 'th',
  };

  function normalizeLanguage(value) {
    return ALIASES[String(value || '').trim().toLowerCase()] || 'zh-TW';
  }

  function getRuntimeCopy(value) {
    return RUNTIME_COPY[normalizeLanguage(value)];
  }

  function getPageLabels(value) {
    return PAGE_LABELS[normalizeLanguage(value)];
  }

  return { SUPPORTED_LANGUAGES, normalizeLanguage, getRuntimeCopy, getPageLabels };
});
```

Populate `RUNTIME_COPY` and `PAGE_LABELS` with complete static translations for all keys asserted by the test. Use the existing React text for `friendlyTitle`, `lostTitle`, `facilityTitle`, `quickHelp`, and `moreServices`, so structural matching stays aligned with the visible application. Do not call any network translation API.

- [ ] **Step 4: Run the locale test and verify GREEN**

Run:

```powershell
node --test tests/passenger-runtime-locales.test.cjs
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```powershell
git add -- assets/passenger-runtime-locales.js tests/passenger-runtime-locales.test.cjs
git commit -m "Give the canonical passenger runtime complete nine-language copy" -m "Constraint: Static built-in translations only; no downloads or online translation service." -m "Confidence: high" -m "Scope-risk: moderate" -m "Tested: node --test tests/passenger-runtime-locales.test.cjs"
```

---

### Task 2: Language-Independent Home, Transfer, and Lost-Item Functions

**Files:**
- Modify: `assets/lost-found-local-api.js`
- Modify: `tests/lost-found-tracking.test.cjs`

**Interfaces:**
- Consumes: `window.RailAgentPassengerRuntimeLocales.getRuntimeCopy(document.documentElement.lang)`
- Consumes: `window.RailAgentPassengerRuntimeLocales.getPageLabels(document.documentElement.lang)`
- Produces: the same chat, transfer, lost-item search, result tracking, and tracked-case rendering behavior for all locales.

- [ ] **Step 1: Add failing source-contract tests**

Extend `tests/lost-found-tracking.test.cjs`:

```js
assert.match(
  enhancer,
  /RailAgentPassengerRuntimeLocales/,
  'The canonical runtime should obtain copy from the shared nine-language locale module.',
);
assert.match(
  enhancer,
  /\[data-service-page="lost-item"\]/,
  'Lost-item search should be identified by its stable page marker.',
);
assert.match(
  enhancer,
  /sourceLink\.closest\('p'\)\?\.remove\(\)/,
  'The localized TRA source notice should be removed by structure.',
);
assert.doesNotMatch(
  enhancer,
  /text\.includes\('\\u793a\\u7bc4\\u8cc7\\u6599\\u4f9d\\u7167'\)/,
  'Source-notice removal must not depend on Traditional Chinese text.',
);
assert.match(
  enhancer,
  /pageLabels\.friendlyTitle/,
  'Friendly-transfer page discovery should use the current locale labels.',
);
assert.match(
  enhancer,
  /pageLabels\.quickHelp.*pageLabels\.moreServices/s,
  'Obsolete home actions should be removed for the current locale.',
);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests/lost-found-tracking.test.cjs
```

Expected: FAIL because the runtime still uses fixed Traditional Chinese labels and phrase matching.

- [ ] **Step 3: Replace fixed copy with locale data**

At the top of `assets/lost-found-local-api.js`, obtain the locale API and resolve copy on every synchronization pass:

```js
const localeApi = window.RailAgentPassengerRuntimeLocales;

function currentLocale() {
  const language = document.documentElement.lang;
  return {
    copy: localeApi.getRuntimeCopy(language),
    pageLabels: localeApi.getPageLabels(language),
  };
}
```

Remove the single hard-coded `copy` object. Functions that build UI receive the current `copy` and `pageLabels`, so switching identity or language cannot retain stale text.

- [ ] **Step 4: Make home and friendly-transfer discovery locale-aware**

Change `installChatLauncher()` to:

```js
function installChatLauncher(copy, pageLabels) {
  const serviceButtons = [...document.querySelectorAll('.mp-service-list button.mp-service')];
  const facilityButton = serviceButtons.find((button) =>
    button.textContent.trim().includes(pageLabels.facilityTitle)
  );
  if (!facilityButton) return;

  serviceButtons.forEach((button) => {
    const text = button.textContent.trim();
    if (text === pageLabels.quickHelp || text === pageLabels.moreServices) {
      button.dataset.railagentLocalHidden = 'true';
    }
  });

  // Keep the existing launcher construction and click behavior, using copy.
}
```

Change friendly-transfer discovery to validate both the current localized heading and the expected service-page structure:

```js
function friendlyTransferPanel(pageLabels) {
  const heading = [...document.querySelectorAll('.mp-hero-block h2')].find(
    (element) => element.textContent.trim() === pageLabels.friendlyTitle,
  );
  const page = heading?.closest('section.mp-stack');
  return page?.querySelector(':scope > section.mp-card.mp-stack') ? page : null;
}
```

Use this helper inside `installFriendlyTransferTools(copy, pageLabels)`.

- [ ] **Step 5: Remove localized yellow source notices structurally**

Replace phrase matching with:

```js
function removeLostItemSourceNotice() {
  const page = document.querySelector('[data-service-page="lost-item"]');
  if (!page) return;

  const sourceLink = [...page.querySelectorAll('a')].find((link) =>
    /railway\.gov\.tw\/tra-tip-web\/tip\/tip00E\/tipE11\/query/i.test(link.href)
  );
  sourceLink?.closest('p')?.remove();
}
```

Call this from `syncLocalModeUi()`. This removes Traditional Chinese, Taiwanese, Hakka, English, Japanese, Korean, Vietnamese, Indonesian, and Thai variants without reading their sentence text.

- [ ] **Step 6: Intercept lost-item search by page marker**

In the capture-phase click handler, replace localized `searchLabels` as the primary condition:

```js
const lostItemPage = button.closest('[data-service-page="lost-item"]');
const isLostItemSearch =
  lostItemPage &&
  button.matches('button.mp-primary') &&
  !button.matches('.railagent-track-lost-found');

if (!isLostItemSearch) return;
event.preventDefault();
event.stopImmediatePropagation();
void search(button, currentLocale().copy);
```

Pass the current copy through `search`, `render`, and `trackedCandidateCard`.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run:

```powershell
node --test tests/lost-found-tracking.test.cjs tests/passenger-runtime-locales.test.cjs
```

Expected: all focused tests pass.

- [ ] **Step 8: Commit**

```powershell
git add -- assets/lost-found-local-api.js tests/lost-found-tracking.test.cjs
git commit -m "Make home transfer and lost-item functions independent of display language" -m "Constraint: Nine languages share one handler set and page flow." -m "Rejected: Match every translated sentence | Structural markers are stable and avoid future translation drift." -m "Confidence: high" -m "Scope-risk: moderate" -m "Tested: focused passenger runtime tests"
```

---

### Task 3: Localized Facility Report and Case Functions

**Files:**
- Modify: `assets/facility-report-feedback.js`
- Modify: `assets/passenger-case-unfollow.js`
- Modify: `assets/lost-found-local-api.js`
- Modify: `tests/facility-report-feedback.test.cjs`
- Modify: `tests/passenger-case-unfollow.test.cjs`
- Modify: `tests/lost-found-tracking.test.cjs`

**Interfaces:**
- Consumes: shared locale module copy.
- Produces: one localized facility form for every locale.
- Produces: one localized case tracking, unfollow, and feedback behavior for every locale.

- [ ] **Step 1: Add failing facility and case tests**

Add these assertions:

```js
assert.match(
  enhancement,
  /RailAgentPassengerRuntimeLocales/,
  'Facility feedback should use the shared nine-language copy.',
);
assert.match(
  enhancement,
  /getRuntimeCopy\(document\.documentElement\.lang\)/,
  'Facility copy should follow the active document language.',
);
```

In `tests/passenger-case-unfollow.test.cjs`:

```js
assert.match(script, /RailAgentPassengerRuntimeLocales/);
assert.match(script, /copy\.caseUnfollow/);
assert.match(script, /copy\.caseUnfollowStatus/);
```

In `tests/lost-found-tracking.test.cjs`:

```js
assert.match(
  enhancer,
  /EVT-2026-BQ-0187/,
  'The obsolete fixed backpack case should be removed by its stable event ID.',
);
assert.match(
  enhancer,
  /feedbackArticle\.querySelector\('p'\)\?\.remove\(\)/,
  'The obsolete feedback lead should be removed structurally in every language.',
);
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
node --test tests/facility-report-feedback.test.cjs tests/passenger-case-unfollow.test.cjs tests/lost-found-tracking.test.cjs
```

Expected: FAIL because the facility and case scripts contain fixed Traditional Chinese copy.

- [ ] **Step 3: Localize the facility form without changing behavior**

Replace the three fixed constants in `assets/facility-report-feedback.js` with:

```js
function currentCopy() {
  return window.RailAgentPassengerRuntimeLocales.getRuntimeCopy(
    document.documentElement.lang,
  );
}
```

Inside `enhanceFacilityReport()`, resolve `const copy = currentCopy()` and use:

```js
const label = createElement('label', {
  htmlFor: 'facility-issue',
  textContent: copy.facilityIssue,
});
// Blank submission:
error.textContent = copy.facilityRequired;
// Successful submission:
textContent: copy.facilityThanks;
```

Continue locating the page exclusively through `[data-service-page="facility-report"]`. Do not add a RailAgent launcher to this page.

- [ ] **Step 4: Localize case unfollow**

In `assets/passenger-case-unfollow.js`, add:

```js
function currentCopy() {
  return window.RailAgentPassengerRuntimeLocales.getRuntimeCopy(
    document.documentElement.lang,
  );
}
```

Use `copy.caseUnfollow` for the button and `${copy.caseUnfollowStatus}${eventId}` for the status.

- [ ] **Step 5: Remove obsolete cases structurally**

In `assets/lost-found-local-api.js`, replace localized backpack-title matching with:

```js
const LEGACY_BACKPACK_EVENT_ID = 'EVT-2026-BQ-0187';

function removeLegacyBackpackCase() {
  const page = document.querySelector('[aria-label="public own case list"]');
  page?.querySelectorAll('article').forEach((article) => {
    if ((article.textContent || '').includes(LEGACY_BACKPACK_EVENT_ID)) {
      article.remove();
    }
  });
}
```

Locate the feedback article as the article in the public case page containing the satisfaction input and submit button. Remove its obsolete introductory paragraph structurally, keep its localized React heading, and use shared copy only for runtime-created acknowledgement text.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```powershell
node --test tests/facility-report-feedback.test.cjs tests/passenger-case-unfollow.test.cjs tests/lost-found-tracking.test.cjs tests/passenger-runtime-locales.test.cjs
```

Expected: all focused tests pass.

- [ ] **Step 7: Commit**

```powershell
git add -- assets/facility-report-feedback.js assets/passenger-case-unfollow.js assets/lost-found-local-api.js tests/facility-report-feedback.test.cjs tests/passenger-case-unfollow.test.cjs tests/lost-found-tracking.test.cjs
git commit -m "Keep facility and case functions identical across languages" -m "Constraint: Existing React copy remains localized while runtime-created controls use the shared locale table." -m "Confidence: high" -m "Scope-risk: moderate" -m "Tested: focused facility and case tests"
```

---

### Task 4: Load the Locale Data Before the Canonical Runtime

**Files:**
- Modify: `index.html`
- Modify: `tests/lost-found-tracking.test.cjs`

**Interfaces:**
- Produces: locale module loaded before all passenger runtime enhancers.
- Preserves: no legacy i18n overlays.

- [ ] **Step 1: Add a failing entry-order test**

Extend `tests/lost-found-tracking.test.cjs`:

```js
const localeScriptIndex = indexHtml.indexOf('passenger-runtime-locales.js');
const canonicalRuntimeIndex = indexHtml.indexOf('lost-found-local-api.js');
const facilityRuntimeIndex = indexHtml.indexOf('facility-report-feedback.js');

assert.ok(localeScriptIndex >= 0, 'The shared passenger locale module must be loaded.');
assert.ok(localeScriptIndex < canonicalRuntimeIndex);
assert.ok(localeScriptIndex < facilityRuntimeIndex);
assert.doesNotMatch(indexHtml, /passenger-i18n\.js|gate-i18n\.js|gate-i18n\.css/);
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test tests/lost-found-tracking.test.cjs
```

Expected: FAIL because `index.html` does not load the new locale module.

- [ ] **Step 3: Add the locale module and update cache keys**

Insert before the passenger enhancers:

```html
<script defer src="/railagent-demo-site/assets/passenger-runtime-locales.js?v=20260726-nine-language-parity-1"></script>
```

Update the cache keys of modified scripts to `v=20260726-nine-language-parity-1`.

- [ ] **Step 4: Run all repository checks**

Run:

```powershell
node --test tests/*.test.cjs
npm.cmd test --prefix local-api -- --run
npm.cmd run typecheck --prefix local-api
git diff --check
```

Expected:

- All Node tests pass.
- All 85 local API tests pass.
- TypeScript exits with code 0.
- `git diff --check` exits with code 0.

- [ ] **Step 5: Commit**

```powershell
git add -- index.html tests/lost-found-tracking.test.cjs
git commit -m "Deliver nine-language parity as one cache-safe passenger runtime" -m "Constraint: Locale data must load before every enhancer and legacy overlays must stay absent." -m "Confidence: high" -m "Scope-risk: narrow" -m "Tested: complete Node and API suites; TypeScript typecheck; git diff --check"
```

---

### Task 5: Deploy and Verify the Full Nine-Language Matrix

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: the merged GitHub Pages deployment.
- Produces: verification evidence for all nine languages and all required passenger pages.

- [ ] **Step 1: Push and create a PR against `main`**

```powershell
git push -u origin codex/passenger-content-parity
gh pr create --base main --head codex/passenger-content-parity --title "Align every passenger language with the completed workflow"
```

- [ ] **Step 2: Merge and wait for Pages**

Merge the PR after confirming its diff contains only the planned locale module, enhancer changes, tests, cache keys, and documentation. Wait for the `pages-build-deployment` run associated with the merge commit to conclude `success`.

- [ ] **Step 3: Verify every language on the bare production URL**

For each of `zh-TW`, `nan`, `hak`, `en`, `ja`, `ko`, `vi`, `id`, and `th`:

1. Select the language at the gate.
2. Enter the passenger role.
3. Confirm the home contains three service buttons and the localized RailAgent launcher.
4. Confirm quick-help and more-services actions are absent.
5. Open friendly transfer and confirm the assistance button, origin, destination, and route-submit controls.
6. Open lost-item search and confirm seven inputs, the search action, and no TRA yellow source notice.
7. Open facility report and confirm one textarea and submit button, with no RailAgent launcher inside the page.
8. Open cases and confirm the feedback form, no fixed `EVT-2026-BQ-0187` case, and localized tracked-case actions.
9. Confirm none of the four pages is blank.

- [ ] **Step 4: Verify API-off behavior**

With no local API response available, confirm the home and all four pages still render. Trigger one API action and confirm it displays a localized inline connection error without clearing the page.

- [ ] **Step 5: Record final evidence**

Report:

- Node test pass count.
- API test pass count.
- TypeScript result.
- Pages deployment run URL.
- PR URL.
- Nine-language browser matrix result.
