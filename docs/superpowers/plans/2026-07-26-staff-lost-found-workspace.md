# Station Lost-Found Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the live, Traditional-Chinese-only lost-found workspace for Banqiao and Qingpu station staff.

**Architecture:** Add a staff-only enhancement that hides the primary React root only after the station account is confirmed, and renders a separate styled workspace backed by the existing local API. The enhancement owns its own host element and never writes to `#root`.

**Tech Stack:** Browser JavaScript, existing mobile CSS classes, Node static tests, local Node API.

## Global Constraints

- Do not mutate or replace `#root`.
- Render only for `ntmetro-staff-banqiao` and `tymetro-staff-qingpu`.
- All staff workspace copy is Traditional Chinese.
- Use no Demo task or found-item seed data in the workspace.

---

### Task 1: Mount an isolated station workspace host

**Files:**
- Modify: `index.html`
- Modify: `assets/staff-lost-found-runtime.js`
- Test: `tests/staff-lost-found-runtime.test.cjs`

**Interfaces:**
- Consumes: `railagent.mobile.account`, `railagent.api-base-url`, `apiBaseUrl`.
- Produces: `#staff-lost-found-workspace` as a sibling of `#root`.

- [ ] **Step 1: Write the failing static test**

```js
assert.match(source, /staff-lost-found-workspace/);
assert.match(source, /root\.hidden = true/);
assert.match(source, /ntmetro-staff-banqiao/);
assert.match(source, /tymetro-staff-qingpu/);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/staff-lost-found-runtime.test.cjs`

Expected: the isolated host assertion fails.

- [ ] **Step 3: Implement the host and staff account guard**

```js
const host = document.createElement('div');
host.id = 'staff-lost-found-workspace';
root.hidden = true;
root.after(host);
```

- [ ] **Step 4: Run the static test to verify it passes**

Run: `node --test tests/staff-lost-found-runtime.test.cjs`

Expected: the host assertion passes.

### Task 2: Render live tasks and found items in Traditional Chinese

**Files:**
- Modify: `assets/staff-lost-found-runtime.js`
- Test: `tests/staff-lost-found-runtime.test.cjs`

**Interfaces:**
- Consumes: `POST /api/auth/demo-login`, `GET /api/tasks`, `GET /api/lost-found/items`.
- Produces: 優先任務 and 任務 rows from tracked lost-item cases, plus latest station found-item rows.

- [ ] **Step 1: Write failing assertions**

```js
assert.match(source, /優先任務/);
assert.match(source, /本單位近期拾獲/);
assert.match(source, /task\.caseId && task\.lostItem/);
assert.doesNotMatch(source, /友善轉乘/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/staff-lost-found-runtime.test.cjs`

Expected: the presentation assertions fail.

- [ ] **Step 3: Implement API-backed cards**

Use `mp-list-item`, `mp-status`, `mp-meta`, and `mp-footnote` to render task and found-item fields. Do not add static task or item rows.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/staff-lost-found-runtime.test.cjs`

Expected: all workspace assertions pass.

### Task 3: Submit a repository-aligned found item and verify deployment

**Files:**
- Modify: `assets/staff-lost-found-runtime.js`
- Test: `tests/staff-lost-found-runtime.test.cjs`

**Interfaces:**
- Consumes: the eight `CreateFoundItemInput` fields and staff demo token.
- Produces: a refreshed station item list after `POST /api/lost-found/items`.

- [ ] **Step 1: Write failing field assertions**

```js
for (const field of ['itemType', 'color', 'brand', 'features', 'foundLocation', 'foundAt', 'trainNumber']) {
  assert.match(source, new RegExp(`name="${field}"`));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/staff-lost-found-runtime.test.cjs`

Expected: the form assertion fails.

- [ ] **Step 3: Implement the styled form and refresh action**

Use labels with the existing `mp-input` class and send `stationName: user.station` together with `FormData` values.

- [ ] **Step 4: Run full verification**

Run: `node --test tests/*.test.cjs`; `npm.cmd test -- --run`; `npm.cmd run typecheck`.

Expected: all test suites pass.
