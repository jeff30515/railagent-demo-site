# Lost-found Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a passenger track a local-AI lost-property candidate as a personal case, while removing obsolete demo and feedback copy.

**Architecture:** The static lost-found enhancer renders accessible tracking controls and stores a compact, de-duplicated case record in browser local storage. Its DOM observer renders those records into the public cases page and removes the legacy backpack card. The feedback enhancer owns the acknowledgement wording.

**Tech Stack:** Static JavaScript, DOM APIs, browser local storage, Node.js built-in test runner.

## Global Constraints

- Do not add dependencies or remote persistence.
- A tracked case uses the candidate's item name, station, and pickup date, and displays `追蹤中`.
- Re-tracking the same candidate must not create another case.
- Successful feedback text is exactly `感謝您的回饋!`.

---

### Task 1: Lock requirements in failing tests

**Files:**
- Create: `tests/lost-found-tracking.test.cjs`
- Modify: `tests/facility-report-feedback.test.cjs`
- Test: `tests/lost-found-tracking.test.cjs`, `tests/facility-report-feedback.test.cjs`

**Interfaces:** Tests read the static enhancers and assert the candidate control, de-duplication/storage hooks, legacy-case removal, and exact feedback text.

- [ ] Write assertions for `追蹤此物件`, `追蹤中`, the tracked-case storage key, removal of `黑色背包遺失物，需要站務先比對候選拾獲物。`, and the exact acknowledgement.
- [ ] Run `node --test tests/lost-found-tracking.test.cjs tests/facility-report-feedback.test.cjs`; verify it fails because the feature does not yet exist.
- [ ] Commit only the red tests with `git add tests/lost-found-tracking.test.cjs tests/facility-report-feedback.test.cjs && git commit -m "Define lost-property tracking behavior"`.

### Task 2: Persist and render tracked cases

**Files:**
- Modify: `assets/lost-found-local-api.js` (`candidateCard`, DOM click handling, `syncLocalModeUi`)
- Test: `tests/lost-found-tracking.test.cjs`

**Interfaces:** Candidate fields are `candidate.item.propertyName`, `stationName` or `pickupLocation`, and `pickupDate`. Local storage uses key `railagent-tracked-lost-found-cases`; each record has `{ id, title, stationName, pickupDate, status: '追蹤中' }`.

- [ ] Add a failing behavioral fixture that calls the tracking handler twice with the same candidate and expects one stored record.
- [ ] Run it and confirm the expected failure.
- [ ] Add focused helpers to derive a stable candidate id, read/write records safely, and reject duplicate ids.
- [ ] Add one `button.railagent-track-lost-found` to every candidate card; its delegated handler creates the case, updates its label to `已追蹤`, and synchronises the view.
- [ ] On synchronisation, remove the article containing the legacy backpack summary and append/update tracked cards only in the public cases page. Each card must display `追蹤中`, title, station, and pickup date.
- [ ] Run `node --test tests/lost-found-tracking.test.cjs`; verify PASS, then commit the feature.

### Task 3: Update feedback wording

**Files:**
- Modify: `assets/facility-report-feedback.js` (`THANK_YOU_MESSAGE`)
- Modify: `assets/lost-found-local-api.js` (public case feedback enhancer)
- Test: `tests/facility-report-feedback.test.cjs`, `tests/lost-found-tracking.test.cjs`

**Interfaces:** The existing facility report form continues to prevent blank submissions. Both feedback success presentations must show `感謝您的回饋!`.

- [ ] Add failing tests for the exact success text and absence of `服務回饋（閉環）` and `結案後回饋會寫入本機事件目錄，供歷史品質分析。`.
- [ ] Run the two focused tests and confirm the expected failure.
- [ ] Replace the facility acknowledgement, remove the public feedback suffix and explanation, and replace the public feedback recorded-event message.
- [ ] Re-run the focused tests; verify PASS, then commit the copy update.

### Task 4: Verify the static site

**Files:**
- Verify: `assets/lost-found-local-api.js`, `assets/facility-report-feedback.js`, `tests/*.test.cjs`

- [ ] Run `node --test tests/*.test.cjs` and confirm all tests pass.
- [ ] Run `git diff --check && git status --short`; confirm no whitespace errors or unexpected tracked changes.
