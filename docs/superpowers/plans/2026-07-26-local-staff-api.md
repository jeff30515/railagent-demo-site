# Local Staff API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public Cloudflare Tunnel's local API support the Banqiao and Qingpu staff pages without breaking passenger lost-item search.

**Architecture:** Extend the existing `localServer.ts` HTTP adapter with the same demo-account lookup, task listing, and unit-scoped found-item operations already used by the Azure Function handlers. The adapter continues to use its in-memory fallback repository, so passenger case tracking and both staff views share one local process and one data set.

**Tech Stack:** Node.js HTTP server, TypeScript, Vitest, in-memory `TaskRepository`.

## Global Constraints

- Keep `/api/lost-found/match`, `/api/passenger-chat`, and friendly-transfer routes unchanged.
- Reuse `createFallbackTaskRepository`; add no dependencies.
- Authorize staff requests through the existing `x-demo-user-id` header.
- Preserve unit scoping: Banqiao may access `station-banqiao`; Qingpu may access `station-qingpu`.

---

### Task 1: Route staff login and case listing through the local HTTP server

**Files:**
- Modify: `local-api/src/localServer.ts:45-136`
- Test: `local-api/src/localServer.test.ts`

**Interfaces:**
- Consumes: `mobileTasks.getDemoUserByAccount(accountId)` and `mobileTasks.listTasksForUser(user)`.
- Produces: `POST /api/auth/demo-login` returning `{ user, demoToken }`; `GET /api/tasks` returning `{ user, tasks, counts }`.

- [ ] **Step 1: Write the failing test**

```ts
it('logs a Banqiao staff account in and returns its visible cases', async () => {
  const login = await request('/api/auth/demo-login', {
    accountId: 'ntmetro-staff-banqiao'
  });
  expect(login.status).toBe(200);
  expect(login.body.demoToken).toBe('demo-staff-banqiao');

  const tasks = await request('/api/tasks', undefined, {
    'x-demo-user-id': login.body.demoToken
  }, 'GET');
  expect(tasks.status).toBe(200);
  expect(tasks.body.user.unitId).toBe('station-banqiao');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- localServer.test.ts`

Expected: the login route returns `404`.

- [ ] **Step 3: Write minimal implementation**

```ts
if (route === '/api/auth/demo-login') {
  const accountId = textField(await readJson(request), 'accountId');
  const user = accountId ? await mobileTasks.getDemoUserByAccount(accountId) : null;
  if (!user) return respond(response, 401, { error: 'invalid_demo_account' }, cors);
  respond(response, 200, { user, demoToken: user.userId }, cors);
  return;
}
```

Authorize `GET /api/tasks` with `x-demo-user-id`, call `listTasksForUser`, and return task counts for all known task statuses.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- localServer.test.ts`

Expected: the new test passes with the existing local-server tests.

- [ ] **Step 5: Commit**

```bash
git add local-api/src/localServer.ts local-api/src/localServer.test.ts
git commit -m "Serve staff login and task data from the local API"
```

### Task 2: Verify unit-scoped staff found-item operations for both stations

**Files:**
- Modify: `local-api/src/localServer.test.ts`
- Modify: `local-api/src/localServer.ts:84-120`

**Interfaces:**
- Consumes: `GET /api/lost-found/items?unitId=<unit>` and `POST /api/lost-found/items` with `x-demo-user-id`.
- Produces: station-scoped list and create behavior usable by both staff pages.

- [ ] **Step 1: Write the failing test**

```ts
it('keeps Qingpu found items separate from Banqiao found items', async () => {
  const qingpu = await request('/api/lost-found/items', {
    itemType: '雨傘', foundLocation: '出口 2', foundAt: '2026-07-26T10:00', stationName: '桃園青埔'
  }, { 'x-demo-user-id': 'demo-staff-tymetro' });
  expect(qingpu.status).toBe(201);

  const list = await request('/api/lost-found/items?unitId=station-qingpu', undefined,
    { 'x-demo-user-id': 'demo-staff-tymetro' }, 'GET');
  expect(list.body.items).toEqual(expect.arrayContaining([
    expect.objectContaining({ unitId: 'station-qingpu', itemType: '雨傘' })
  ]));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- localServer.test.ts`

Expected: the Qingpu request is rejected or returns no station-scoped item.

- [ ] **Step 3: Write minimal implementation**

Keep the existing found-item adapter, but route it after the shared authentication helper. Ensure request routing recognizes the staff routes and permits `GET /api/tasks` while maintaining existing `GET /api/lost-found/items` authorization.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- localServer.test.ts`

Expected: both Banqiao and Qingpu found-item tests pass.

- [ ] **Step 5: Commit**

```bash
git add local-api/src/localServer.ts local-api/src/localServer.test.ts
git commit -m "Keep local staff found items scoped to each station"
```

### Task 3: Verify the externally shared API contract

**Files:**
- Test: `local-api/src/localServer.test.ts`

**Interfaces:**
- Consumes: CORS preflight and the staff routes from Tasks 1-2.
- Produces: a public Tunnel-compatible local server contract.

- [ ] **Step 1: Add a regression assertion**

```ts
it('allows the GitHub Pages origin to call staff login', async () => {
  const response = await request('/api/auth/demo-login', { accountId: 'tymetro-staff-qingpu' }, {
    origin: 'https://jeff30515.github.io'
  });
  expect(response.status).toBe(200);
});
```

- [ ] **Step 2: Run the complete local API suite**

Run: `npm test`

Expected: all local API tests pass.

- [ ] **Step 3: Start the local API and verify over the active Tunnel**

Run: `Invoke-WebRequest -Method POST <tunnel>/api/auth/demo-login` and then `Invoke-WebRequest -Method GET <tunnel>/api/tasks -Headers @{ 'x-demo-user-id'='demo-staff-banqiao' }`.

Expected: both return HTTP 200.

- [ ] **Step 4: Commit and push**

```bash
git add local-api/src/localServer.ts local-api/src/localServer.test.ts
git commit -m "Expose the complete staff workflow through the shared local API"
git push origin HEAD:main
```
