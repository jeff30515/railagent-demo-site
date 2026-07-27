# Dynamic Tracked Cases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep staff tasks and supervisor tracked-case totals synchronized with passenger tracking and cancellation.

**Architecture:** The local API will own the lifecycle of a tracked lost-item task, including cancellation. Passenger scripts will call that API on both state changes. Staff and supervisor scripts will fetch fresh task data on role/page changes; cache-busted asset URLs ensure browsers use the new clients.

**Tech Stack:** TypeScript local HTTP server, in-memory/Azure-table task repository, browser JavaScript, Node/Vitest tests.

## Global Constraints

- Keep the ngrok Token and any credentials outside the repository.
- Maintain `?apiBaseUrl=` only for localhost development overrides.
- Use the fixed ngrok API for public GitHub Pages requests.

---

### Task 1: Cancel tracked lost-item tasks in the API

**Files:**
- Modify: `local-api/src/shared/mobileTaskRepository.ts`
- Modify: `local-api/src/localServer.ts`
- Test: `local-api/src/localServer.test.ts`

**Interfaces:**
- Produces `untrackLostItemCase(user, candidateId): Promise<boolean>` on `MobileTaskRepository`.
- Produces `POST /api/lost-found/cases/untrack` accepting `{ candidateId }` and returning `{ removed: boolean }`.

- [ ] Write a test that tracks a candidate, untracks it, then verifies `/api/tasks` no longer lists that `caseId`.
- [ ] Run the targeted test and observe it fails because the route is missing.
- [ ] Remove the matching passenger-owned task in both repository implementations and expose the local route.
- [ ] Run `npm.cmd test -- --run src/localServer.test.ts` and verify it passes.

### Task 2: Synchronize passenger lifecycle and supervisor count

**Files:**
- Modify: `assets/lost-found-local-api.js`
- Modify: `assets/passenger-case-unfollow.js`
- Modify: `assets/supervisor-dashboard-enhancer.js`
- Test: `tests/passenger-case-unfollow.test.cjs`

**Interfaces:**
- Passenger scripts dispatch `railagent:tracked-cases-changed` after successful API track/untrack calls.
- Supervisor listens for this event and refreshes the API-derived count without retaining an old request promise.

- [ ] Write tests asserting untrack calls the API and the supervisor script invalidates cached counts on the change event.
- [ ] Run the targeted Node tests and observe the missing behavior.
- [ ] Implement the smallest request/event/cache-invalidation changes.
- [ ] Run the targeted tests and verify them green.

### Task 3: Load live staff tasks after deployment

**Files:**
- Modify: `index.html`
- Test: `tests/staff-lost-found-runtime.test.cjs`

**Interfaces:**
- GitHub Pages loads the current `staff-lost-found-enhancer.js` cache-busted asset.

- [ ] Write a test requiring a new staff-enhancer asset version.
- [ ] Run the test and observe it fails against the old version.
- [ ] Increment only the staff-enhancer URL version in `index.html`.
- [ ] Run the full browser-script test suite and verify it passes.

### Task 4: Verification and delivery

- [ ] Build the local API, restart only the verified 7071 process, and verify the untrack and CORS routes through the fixed ngrok URL.
- [ ] Verify a staff account and supervisor account read the same current tracked-task total.
- [ ] Commit with Lore trailers and push `main`.
