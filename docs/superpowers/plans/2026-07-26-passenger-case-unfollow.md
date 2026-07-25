# Passenger Case Unfollow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let passengers remove an individual tracked case from their visible Cases list.

**Architecture:** Patch the existing minified React case-list component in `index-lostitem-talkback.js`. Add passenger-local state for hidden task IDs and a status message; derive the rendered list by excluding hidden IDs. Staff and supervisor branches keep using the original task list.

**Tech Stack:** React bundle, Node.js built-in test runner, static GitHub Pages site.

## Global Constraints

- The action is demo-only local UI state and must not mutate backend task data.
- Only the passenger role renders `取消追蹤`.
- The status message uses exactly `已取消追蹤` followed by the event ID.
- No new dependencies.

---

### Task 1: Passenger case-list unfollow control

**Files:**
- Modify: `assets/index-lostitem-talkback.js` (the `ky` case-list component)
- Test: `tests/passenger-case-unfollow.test.cjs`

**Interfaces:**
- Consumes: `tasks` array whose entries include `taskId` and `eventId`.
- Produces: passenger-only `取消追蹤` buttons that hide their matching `taskId` and render a status message.

- [ ] **Step 1: Write the failing test**

Create `tests/passenger-case-unfollow.test.cjs` that reads the bundle and asserts the component source contains a passenger hidden-task state set, filters the passenger-visible list by task ID, and renders the exact `取消追蹤` and `已取消追蹤` copy.

```js
assert.match(bundle, /useState\(\(\)=>new Set\(\)\)/);
assert.match(bundle, /取消追蹤/);
assert.match(bundle, /已取消追蹤/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/passenger-case-unfollow.test.cjs`

Expected: FAIL because the component has no unfollow state, button, or status message.

- [ ] **Step 3: Write minimal implementation**

Within `ky`, add a `Set` state named for hidden passenger task IDs and a nullable status state. Derive `visibleTasks` only for `s.role === "public"`; replace passenger `d.map(...)` rendering with `visibleTasks.map(...)`. Render this button in the passenger fragment:

```js
c.jsx("button", {
  type: "button",
  className: "mp-secondary",
  onClick: () => { hideTask(U.taskId); setUnfollowed(U.eventId); },
  children: "取消追蹤"
})
```

Render the message after the list:

```js
unfollowed ? c.jsxs("p", { className: "mp-status", children: ["已取消追蹤 ", unfollowed] }) : null
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/passenger-case-unfollow.test.cjs`

Expected: PASS.

- [ ] **Step 5: Run regression checks**

Run: `node --test tests/*.cjs; node --check assets/index-lostitem-talkback.js; git diff --check`

Expected: all tests pass, JavaScript syntax check succeeds, and diff check has no whitespace errors.

- [ ] **Step 6: Commit**

```bash
git add assets/index-lostitem-talkback.js tests/passenger-case-unfollow.test.cjs
git commit -m "Let passengers stop tracking individual cases"
```

## Self-review

- Spec coverage: Task 1 covers passenger-only visibility, individual removal, confirmation text, and preserving staff/supervisor behavior.
- Placeholder scan: no incomplete steps or deferred requirements remain.
- Type consistency: the task uses `taskId` for hiding and `eventId` for the displayed confirmation, matching the case component data.
