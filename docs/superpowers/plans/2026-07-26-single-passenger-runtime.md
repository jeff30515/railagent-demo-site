# RailAgent Single Passenger Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the completed passenger workflow the only runtime shown by both the bare GitHub Pages URL and URLs that explicitly provide `apiBaseUrl`.

**Architecture:** Keep the known-good compiled React bundle and its verified enhancement script. Resolve a canonical local API base URL inside `assets/lost-found-local-api.js`, remove the early-return branch that exposes the old home, and update the script cache key in `index.html`; do not mutate the compiled bundle or reintroduce multilingual DOM overlays.

**Tech Stack:** Static HTML, browser JavaScript, Node.js built-in test runner, Vitest, TypeScript, GitHub Pages.

## Global Constraints

- Default API base URL is exactly `http://127.0.0.1:7071`.
- Bare and parameterized URLs expose the same completed passenger workflow.
- Do not edit `assets/index-lostitem-talkback.js`.
- Do not directly delete or append React-owned children through recurring observers or timers.
- Do not reintroduce `assets/passenger-i18n.js`, `assets/gate-i18n.js`, or `assets/gate-i18n.css`.
- Preserve the completed behavior from commit `7b5c47f`.

---

### Task 1: Canonical API URL Resolution

**Files:**
- Modify: `assets/lost-found-local-api.js:1-20`
- Test: `tests/lost-found-tracking.test.cjs`

**Interfaces:**
- Consumes: `window.location.search`
- Produces: `resolveApiBaseUrl(search: string): string`
- Produces: endpoint URLs for lost-found matching, passenger chat, station lookup, and route advice

- [ ] **Step 1: Write failing source-contract tests**

Add assertions to `tests/lost-found-tracking.test.cjs`:

```js
assert.match(
  enhancer,
  /const DEFAULT_API_BASE_URL = 'http:\/\/127\.0\.0\.1:7071'/,
  'The completed passenger runtime must use the local API by default.',
);
assert.match(
  enhancer,
  /function resolveApiBaseUrl\(search\)/,
  'API URL selection must have one testable resolver.',
);
assert.doesNotMatch(
  enhancer,
  /if \(!apiBaseUrl\) return/,
  'The bare URL must not fall back to the old passenger home.',
);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```powershell
node --test tests/lost-found-tracking.test.cjs
```

Expected: FAIL because the restored script still contains `if (!apiBaseUrl) return`.

- [ ] **Step 3: Implement the canonical resolver**

Replace the early initialization block in `assets/lost-found-local-api.js` with:

```js
const DEFAULT_API_BASE_URL = 'http://127.0.0.1:7071';

function resolveApiBaseUrl(search) {
  const configured = new URLSearchParams(search).get('apiBaseUrl');
  try {
    return new URL(configured || DEFAULT_API_BASE_URL).toString();
  } catch {
    return new URL(DEFAULT_API_BASE_URL).toString();
  }
}

const apiBaseUrl = resolveApiBaseUrl(window.location.search);
const lostFoundEndpoint = new URL('/api/lost-found/match', apiBaseUrl).toString();
const chatEndpoint = new URL('/api/passenger-chat', apiBaseUrl).toString();
const stationEndpoint = new URL('/api/friendly-transfer/station', apiBaseUrl).toString();
const routeEndpoint = new URL('/api/friendly-transfer/route', apiBaseUrl).toString();
```

Remove the previous `if (!apiBaseUrl) return`, mutable endpoint declarations, and `try/catch` that returned from the entire enhancement.

- [ ] **Step 4: Run focused tests**

Run:

```powershell
node --test tests/lost-found-tracking.test.cjs
```

Expected: PASS with no failures.

- [ ] **Step 5: Commit canonical runtime selection**

Stage `assets/lost-found-local-api.js` and `tests/lost-found-tracking.test.cjs`, then commit using the repository Lore trailers. The intent line must state that bare and configured URLs now share one passenger runtime.

---

### Task 2: Deliver the Unique Runtime to Existing Browsers

**Files:**
- Modify: `index.html:10-16`
- Test: `tests/lost-found-tracking.test.cjs`

**Interfaces:**
- Consumes: `assets/lost-found-local-api.js`
- Produces: one cache-versioned enhancement script reference

- [ ] **Step 1: Write a failing HTML delivery test**

Add:

```js
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(
  indexHtml,
  /lost-found-local-api\.js\?v=20260726-single-passenger-runtime-1/,
);
assert.doesNotMatch(indexHtml, /passenger-i18n\.js|gate-i18n\.js|gate-i18n\.css/);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```powershell
node --test tests/lost-found-tracking.test.cjs
```

Expected: FAIL because `index.html` still uses the previous cache key.

- [ ] **Step 3: Update the cache key**

Set the script reference in `index.html` to:

```html
<script defer src="/railagent-demo-site/assets/lost-found-local-api.js?v=20260726-single-passenger-runtime-1"></script>
```

Keep the known-good facility report, accessibility, member, case, bundle, and stylesheet references unchanged.

- [ ] **Step 4: Run focused and static checks**

Run:

```powershell
node --test tests/lost-found-tracking.test.cjs
git diff --check
```

Expected: both commands exit successfully.

- [ ] **Step 5: Commit delivery change**

Stage `index.html` and the test update, then commit with Lore trailers recording the cache invalidation constraint and focused test evidence.

---

### Task 3: Full Regression and Production Verification

**Files:**
- Verify: `assets/lost-found-local-api.js`
- Verify: `assets/facility-report-feedback.js`
- Verify: `assets/passenger-member-auth.js`
- Verify: `assets/passenger-case-unfollow.js`
- Verify: `index.html`

**Interfaces:**
- Consumes: deployed GitHub Pages site and local API at `http://127.0.0.1:7071`
- Produces: browser evidence that both URL forms expose the same passenger runtime

- [ ] **Step 1: Run all repository verification**

Run:

```powershell
node --test tests/*.test.cjs
npm.cmd test --prefix local-api -- --run
npm.cmd run typecheck --prefix local-api
git diff --check
```

Expected:

- Node tests: zero failures.
- Vitest: 16 test files and 85 tests pass.
- TypeScript: exit code 0.
- Diff check: exit code 0.

- [ ] **Step 2: Push, merge, and wait for Pages deployment**

Push the implementation branch, create a PR against `main`, merge it, and wait for the `pages-build-deployment` workflow to finish successfully.

- [ ] **Step 3: Verify the bare URL**

Open:

```text
https://jeff30515.github.io/railagent-demo-site/
```

Select `我是旅客` and verify:

- `問 RailAgent` is present.
- `快速求助` and `更多服務` are absent.
- Friendly transfer opens and contains the route form.
- Lost item opens and contains seven search fields with no yellow demo notice.
- Facility report opens and contains its textarea and submit button.
- Cases and member pages open without a white screen.

- [ ] **Step 4: Verify the explicit API URL**

Open:

```text
https://jeff30515.github.io/railagent-demo-site/?apiBaseUrl=http%3A%2F%2F127.0.0.1%3A7071
```

Repeat the home and service checks. Compare the visible service entry set with the bare URL; they must be identical.

- [ ] **Step 5: Record final evidence**

Report the merge commit, Pages workflow conclusion, test counts, and browser-verified pages. If the local API is not running, report only the connection limitation; the full UI must still be present.
