# Supervisor Bottom Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the supervisor bottom navigation own three independent pages—realtime home, history analytics, and account—while removing the redundant top tab switcher and old task page.

**Architecture:** Extend the existing supervisor enhancer instead of editing the compiled React bundle. Classify the active supervisor page from `.mobile-app-supervisor .mp-bottom-nav`, restore previously hidden React nodes on every pass, then apply a page-specific layer: realtime content on home, the existing history analytics layer inside the former task-page shell, and no content intervention on account.

**Tech Stack:** Browser JavaScript, existing static React bundle, existing DOM enhancer utilities, Node.js built-in test runner, browser smoke testing.

## Global Constraints

- Bottom navigation must read `首頁／歷史／帳戶` for the supervisor only.
- Supervisor home must show the title `即時營運監控`.
- The original `跨運具服務事件中樞` hero and the top realtime/history tab buttons must remain hidden.
- The former supervisor task page must be fully replaced by the existing four-section history analytics view.
- The account page must remain unchanged.
- Passenger and station-staff bottom navigation must remain unchanged.
- React-owned nodes may be hidden and restored but must never be removed or replaced.
- History analytics fallback must still show four cards, `—`, and `統計資料暫時無法讀取`.
- A 390px viewport must have no horizontal overflow.

---

### Task 1: Route supervisor bottom navigation to realtime and history layers

**Files:**
- Modify: `assets/supervisor-dashboard-enhancer.js`
- Modify: `tests/supervisor-dashboard-runtime.test.cjs`
- Modify: `tests/supervisor-history-analytics.test.cjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: `.mobile-app-supervisor`, `.mp-bottom-nav`, `[aria-label="主管營運駕駛艙"]`, `[aria-label="supervisor task queue"]`, and `window.RailAgentSupervisorHistory.snapshot()`.
- Produces: `supervisorApp()`, `supervisorNavigation(app)`, `activeSupervisorPage(app)`, `prepareRealtimeHome(root)`, and `renderHistoryPage(app, analytics)`.

- [ ] **Step 1: Write failing page-classification and copy tests**

Add assertions to `tests/supervisor-dashboard-runtime.test.cjs`:

```js
test('supervisor bottom navigation owns realtime home and history pages', () => {
  const source = read('assets/supervisor-dashboard-enhancer.js');

  assert.match(source, /function supervisorApp\(\)/);
  assert.match(source, /function supervisorNavigation\(app\)/);
  assert.match(source, /function activeSupervisorPage\(app\)/);
  assert.match(source, /button\.textContent = '歷史'/);
  assert.match(source, /data-supervisor-home-title/);
  assert.match(source, /data-supervisor-history-page/);
  assert.doesNotMatch(source, /function activeSupervisorTab\(root\)/);
});
```

Add a DOM regression test that creates a `.mobile-app-supervisor` container with:

```js
const navigation = new TestElement('nav');
navigation.className = 'mp-bottom-nav';
navigation.setAttribute('aria-label', 'RailAgent App 導覽');

const home = navButton('首頁', true);
const tasks = navButton('待辦', false);
const account = navButton('帳戶', false);
navigation.append(home, tasks, account);
```

The test must assert:

```js
assert.equal(tasks.textContent, '歷史');
assert.equal(activePageText, '即時營運監控');
assert.equal(topTabList.hidden, true);
assert.equal(originalHero.hidden, true);
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run:

```powershell
node --test tests\supervisor-dashboard-runtime.test.cjs
node --test tests\supervisor-history-analytics.test.cjs
```

Expected: FAIL because supervisor page classification still depends on the top tab buttons and the bottom navigation still says `待辦`.

- [ ] **Step 3: Implement supervisor-only bottom navigation classification**

Add:

```js
function supervisorApp() {
  return document.querySelector('.mobile-app-supervisor');
}

function supervisorNavigation(app) {
  return app?.querySelector(':scope > .mp-bottom-nav[aria-label="RailAgent App 導覽"]') || null;
}

function supervisorNavButtons(app) {
  return [...(supervisorNavigation(app)?.querySelectorAll('button') || [])];
}

function activeSupervisorPage(app) {
  const buttons = supervisorNavButtons(app);
  const active = buttons.find((button) => button.getAttribute('aria-pressed') === 'true');
  const label = text(active);
  if (/帳戶/.test(label)) return 'account';
  if (/待辦|歷史/.test(label)) return 'history';
  return 'realtime';
}

function renameHistoryNavigation(app) {
  const button = supervisorNavButtons(app).find((item) => /待辦|歷史/.test(text(item)));
  if (button) button.textContent = '歷史';
}
```

All selectors must remain scoped under `.mobile-app-supervisor` so passenger and station-staff navigation cannot be changed.

- [ ] **Step 4: Replace the home hero with one enhancer-owned title**

Add:

```js
function prepareRealtimeHome(root) {
  const originalHero = root.querySelector(':scope > .mp-hero-block');
  const topTabs = root.querySelector(':scope > [role="tablist"][aria-label="主管模組"]');
  hideNode(originalHero);
  hideNode(topTabs);

  let heading = root.querySelector(':scope > [data-supervisor-home-title]');
  if (!heading) {
    heading = document.createElement('div');
    heading.className = 'mp-hero-block';
    heading.dataset.supervisorHomeTitle = 'true';
    const title = document.createElement('h2');
    title.textContent = '即時營運監控';
    heading.append(title);
    root.insertBefore(heading, root.firstChild);
  }
  showNode(heading);
}
```

Update enhancer-owned node handling so `[data-supervisor-home-title]` is hidden when leaving home and never tagged as a React-owned node.

- [ ] **Step 5: Mount history analytics inside the former task-page shell**

Add:

```js
function supervisorShell(app) {
  return app?.querySelector(':scope > .mp-shell.mp-shell-workspace') || null;
}

function renderHistoryPage(app, analytics) {
  const shell = supervisorShell(app);
  if (!shell) return;

  [...shell.children]
    .filter((node) => !node.matches('.mp-workspace-actions,[data-supervisor-history-page]'))
    .forEach(hideNode);

  let page = shell.querySelector(':scope > [data-supervisor-history-page]');
  if (!page) {
    page = document.createElement('section');
    page.className = 'mp-stack';
    page.dataset.supervisorHistoryPage = 'true';
    page.setAttribute('aria-label', '歷史服務品質分析');
    shell.append(page);
  }
  showNode(page);
  renderHistory(page, analytics);
}
```

Refactor `renderHistory(root, analytics)` so its legacy-card hiding is optional and it can safely render into the enhancer-owned history page without hiding `.mp-workspace-actions`.

The history page must still render:

```text
本月事件量趨勢
RailAgent 使用次數統計
服務設施回報次數
服務回饋統計
```

- [ ] **Step 6: Make `enhance()` page-specific**

Replace the top-tab branch with:

```js
function enhance() {
  const app = supervisorApp();
  if (!app) return;

  restoreSupervisorNodes(app);
  renameHistoryNavigation(app);
  const page = activeSupervisorPage(app);

  if (page === 'realtime') {
    const root = dashboard();
    if (!root) return;
    prepareRealtimeHome(root);
    removeObsoletePanels(root);
    replaceKpis(root);
    replaceWorkforce(root);
    loadTrackedCount();
    return;
  }

  if (page === 'history') {
    historyAnalytics().then((analytics) => {
      if (activeSupervisorPage(app) === 'history') renderHistoryPage(app, analytics);
    });
  }
}
```

On `account`, only navigation renaming and restoration run; account content is untouched.

- [ ] **Step 7: Add redraw and page-isolation regressions**

Extend the DOM tests to switch active bottom buttons in this order:

```text
首頁 → 歷史 → 帳戶 → 首頁 → 歷史 → 首頁
```

Assert after every pass:

```js
assert.equal(app.querySelectorAll('[data-supervisor-home-title]').length, 1);
assert.equal(app.querySelectorAll('[data-supervisor-history-page]').length, 1);
assert.equal(app.querySelectorAll('[data-supervisor-history]').length, 1);
```

Also assert:

- Home shows realtime metrics and workforce but not history.
- History shows four analytics cards but not the old task queue, friendly-transfer card, realtime metrics, or workforce.
- Account content remains visible and unmodified.
- The original hero and top tablist never become visible after restoration.
- No `.remove()` or `.replaceChildren()` calls are introduced.

- [ ] **Step 8: Bump the public cache version**

Change both enhancer and CSS query strings in `index.html` to:

```html
supervisor-dashboard-enhancer.js?v=20260727-supervisor-bottom-navigation-1
index-lostitem-v1.css?v=20260727-supervisor-bottom-navigation-1
```

- [ ] **Step 9: Run focused and full tests**

Run:

```powershell
node --test tests\supervisor-dashboard-runtime.test.cjs
node --test tests\supervisor-history-analytics.test.cjs
node --test tests\*.test.cjs
node --check assets\supervisor-dashboard-enhancer.js
git diff --check
```

Expected: all tests PASS, syntax check exits 0, and `git diff --check` reports no whitespace errors.

- [ ] **Step 10: Commit**

Commit using the Lore protocol:

```text
Make supervisor bottom navigation reflect the two real operating views

Constraint: Preserve React-owned navigation handlers and existing analytics data.
Rejected: Editing the compiled React bundle | A scoped enhancer keeps the change reversible.
Confidence: high
Scope-risk: moderate
Directive: Keep passenger and station-staff navigation unchanged.
Tested: Focused supervisor tests, full Node test suite, node --check, git diff --check.
Not-tested: Public GitHub Pages behavior awaits deployment verification.
```

---

### Task 2: Verify deployment behavior and responsive layout

**Files:**
- Modify only if verification exposes a defect: `assets/supervisor-dashboard-enhancer.js`, `assets/index-lostitem-v1.css`, `tests/supervisor-dashboard-runtime.test.cjs`, `tests/supervisor-history-analytics.test.cjs`, `index.html`

**Interfaces:**
- Consumes: the Task 1 supervisor bottom navigation implementation.
- Produces: verified public behavior on `https://jeff30515.github.io/railagent-demo-site/`.

- [ ] **Step 1: Run pre-push verification**

Run:

```powershell
node --test tests\*.test.cjs
node --check assets\supervisor-dashboard-enhancer.js
git diff --check
git status --short
```

Expected: all tests PASS, checks exit 0, and the worktree contains only the intended committed changes.

- [ ] **Step 2: Push the reviewed commit**

Run:

```powershell
git push origin HEAD:main
```

Expected: remote `main` advances to the reviewed commit without force-push.

- [ ] **Step 3: Verify the public supervisor flow**

Open a cache-busted public URL and perform:

```text
繁中 → 站務 / 主管 → 主管 → 登入
```

Verify:

1. Bottom navigation reads `首頁／歷史／帳戶`.
2. Home heading is exactly `即時營運監控`.
3. `跨運具服務事件中樞` and the top two tab buttons are absent.
4. Home shows only approved realtime metrics and workforce.
5. History shows exactly four analytics cards and no old task content.
6. Account remains unchanged.

- [ ] **Step 4: Verify repeated navigation and responsive layout**

Switch:

```text
首頁 → 歷史 → 帳戶 → 首頁 → 歷史 → 首頁
```

At the history page assert:

```js
document.querySelectorAll('[data-supervisor-history-page]').length === 1
document.querySelectorAll('[data-supervisor-history]').length === 1
document.documentElement.scrollWidth === document.documentElement.clientWidth
```

Use a 390px viewport and confirm no horizontal overflow or clipped bottom navigation.

- [ ] **Step 5: Fix only verified defects with a regression test**

If public verification exposes a defect:

1. Reproduce it in a focused Node DOM test.
2. Run the test and confirm failure.
3. Apply the smallest enhancer or scoped CSS fix.
4. Run focused and full tests.
5. Commit with a Lore message describing the public failure and proof of correction.
6. Push and repeat Steps 3–4.

- [ ] **Step 6: Report completion**

Report:

- Final commit hash.
- Full test count.
- Public cache-busted URL.
- Verified bottom navigation labels and page contents.
- Any remaining public-backend dependency, without attributing static navigation behavior to the backend.
