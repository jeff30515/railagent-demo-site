# Friendly Transfer Assistance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a voice-first station-assistance call flow and a local-Ollama transfer-route response to the retained passenger application.

**Architecture:** The static page bridge in `assets/lost-found-local-api.js` adds the passenger UI without rebuilding the existing bundle. The local Node API gains two focused endpoints: deterministic station lookup backed by a committed local directory, and an Ollama-backed route response. Browser speech recognition is optional; typed station input is always available.

**Tech Stack:** Static GitHub Pages, vanilla browser JavaScript, TypeScript, Node `http`, Vitest, Ollama `gemma4:e4b`.

## Global Constraints

- Modify only `railagent-demo-site`; do not reintroduce the deleted legacy demo.
- The browser calls the local API through `apiBaseUrl`; it never calls Ollama directly.
- Station numbers come only from local structured data, never from model output or live scraping.
- Open a `tel:` link only after a separate user confirmation.
- Use Traditional Chinese UI text and preserve manual input when speech recognition is unavailable.
- Route answers are advisory, not live timetable or station-condition claims.

---

## File Structure

- `local-api/src/friendlyTransfer/stationDirectory.ts`: immutable demo station records and alias lookup.
- `local-api/src/friendlyTransfer/service.ts`: validates inputs, resolves station records, and asks Ollama for bounded route advice.
- `local-api/src/friendlyTransfer/service.test.ts`: isolated red-green behavior tests for the local service.
- `local-api/src/localServer.ts`: routes, validates, and serializes the two public local API endpoints.
- `local-api/src/localServer.test.ts`: HTTP-level request, CORS, and error tests for the local server.
- `assets/lost-found-local-api.js`: injects the friendly-transfer page UI and browser speech/call interactions.
- `index.html`: cache-bumps the bridge script only after the UI work is ready.

### Task 1: Create deterministic station directory and service

**Files:**
- Create: `local-api/src/friendlyTransfer/stationDirectory.ts`
- Create: `local-api/src/friendlyTransfer/service.ts`
- Create: `local-api/src/friendlyTransfer/service.test.ts`

**Interfaces:**
- Produces `resolveStation(spokenStation: string): StationMatch | null`.
- Produces `createFriendlyTransferService({ chat }): { findStation(spokenStation: string): StationMatch; route(origin: string, destination: string): Promise<string> }`.
- `StationMatch` is `{ station: string; phone: string; confirmation: string }`.
- Consumes an injected `chat(message: string): Promise<string>` function, matching the existing Ollama client.

- [ ] **Step 1: Write the failing station and route service tests**

```ts
import { describe, expect, it } from 'vitest';
import { createFriendlyTransferService } from './service.js';

describe('friendly transfer service', () => {
  it('resolves a spoken Taipei station alias to the local service phone', () => {
    const service = createFriendlyTransferService({ chat: async () => 'unused' });
    expect(service.findStation('我在台北車站')).toMatchObject({
      station: '臺北車站',
      phone: expect.stringMatching(/^02-/)
    });
  });

  it('does not return a phone number for an unknown station', () => {
    const service = createFriendlyTransferService({ chat: async () => 'unused' });
    expect(() => service.findStation('月球站')).toThrow('Station could not be resolved.');
  });

  it('asks Ollama for an accessible route using both supplied locations', async () => {
    const chat = async (prompt: string) => {
      expect(prompt).toContain('臺北車站');
      expect(prompt).toContain('南港車站');
      return '請依現場指示前往轉乘月台。';
    };
    const service = createFriendlyTransferService({ chat });
    await expect(service.route('臺北車站', '南港車站')).resolves.toBe('請依現場指示前往轉乘月台。');
  });
});
```

- [ ] **Step 2: Run the service test to verify it fails**

Run: `npm.cmd test -- --run src/friendlyTransfer/service.test.ts`

Expected: FAIL because `service.ts` does not exist.

- [ ] **Step 3: Implement the minimal station directory and service**

```ts
export interface StationMatch {
  station: string;
  phone: string;
  confirmation: string;
}

export function createFriendlyTransferService(deps: { chat(message: string): Promise<string> }) {
  return {
    findStation(spokenStation: string): StationMatch {
      const match = resolveStation(spokenStation);
      if (!match) throw new Error('Station could not be resolved.');
      return match;
    },
    async route(origin: string, destination: string): Promise<string> {
      return deps.chat(`旅客目前在${origin}，欲前往${destination}。請以繁體中文提供簡短無障礙轉乘建議，不可宣稱即時班表或現場狀態。`);
    }
  };
}
```

Populate a focused local directory with canonical names, aliases, and public service numbers. Normalize full-width spaces and case only; do not use fuzzy phone generation.

- [ ] **Step 4: Run the service test to verify it passes**

Run: `npm.cmd test -- --run src/friendlyTransfer/service.test.ts`

Expected: PASS with all three tests green.

- [ ] **Step 5: Commit the tested service boundary**

```powershell
git add local-api/src/friendlyTransfer
git commit -m "Keep station call details deterministic"
```

### Task 2: Expose station and route operations through the local API

**Files:**
- Modify: `local-api/src/localServer.ts`
- Create: `local-api/src/localServer.test.ts`

**Interfaces:**
- Consumes `createFriendlyTransferService` from Task 1.
- Adds `POST /api/friendly-transfer/station` with `{ spokenStation: string }`.
- Adds `POST /api/friendly-transfer/route` with `{ origin: string, destination: string }`.
- Returns `400` for missing fields, `404` for unknown stations, and `503` when Ollama route generation fails.

- [ ] **Step 1: Write failing local API tests**

```ts
it('returns a local station phone for the friendly-transfer station endpoint', async () => {
  const response = await request(server, '/api/friendly-transfer/station', { spokenStation: '台北車站' });
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ station: '臺北車站', phone: expect.any(String) });
});

it('rejects an unknown station without a phone field', async () => {
  const response = await request(server, '/api/friendly-transfer/station', { spokenStation: '月球站' });
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ error: 'Station could not be resolved.' });
});

it('requires both route endpoints', async () => {
  const response = await request(server, '/api/friendly-transfer/route', { origin: '臺北車站' });
  expect(response.status).toBe(400);
  expect(response.body).toEqual({ error: 'Origin and destination are required.' });
});
```

- [ ] **Step 2: Run the local API tests to verify they fail**

Run: `npm.cmd test -- --run src/localServer.test.ts`

Expected: FAIL because the new endpoint routes are absent.

- [ ] **Step 3: Add the two routes and validation**

Add the two route paths to the existing accepted-route guard. Parse only JSON objects, trim fields, cap each input at 200 characters, and preserve existing CORS behavior. Return a directory result directly for station lookup; route response shape is `{ answer, model }`.

- [ ] **Step 4: Run local API tests and existing relevant API tests**

Run: `npm.cmd test -- --run src/localServer.test.ts src/functions/agentApis.test.ts`

Expected: PASS with the new endpoint assertions and existing API behavior intact.

- [ ] **Step 5: Commit the HTTP contract**

```powershell
git add local-api/src/localServer.ts local-api/src/localServer.test.ts
git commit -m "Expose local transfer assistance endpoints"
```

### Task 3: Add accessible passenger UI and speech fallback

**Files:**
- Modify: `assets/lost-found-local-api.js`
- Modify: `index.html`

**Interfaces:**
- Consumes `POST /api/friendly-transfer/station` and `POST /api/friendly-transfer/route` from Task 2.
- Injects a `轉乘協助` launcher into the existing Friendly Transfer Assistance screen, not the passenger-home screen.
- Browser calls `window.speechSynthesis.speak` only when available and provides plain visible feedback regardless.

- [ ] **Step 1: Create a manual browser regression checklist before editing the bridge**

Record these expected behaviors in a comment-free test note inside the implementation commit message or local test session:

```text
1. Friendly Transfer Assistance opens with a large 轉乘協助 action.
2. Activating the action opens a dialog with a station input and a voice-start button when the browser supports recognition.
3. Typed "台北車站" produces a confirmation with a local phone number.
4. The tel: URL is not opened until the confirmation action is clicked.
5. Route guidance requires both current location and destination and displays the local API answer.
6. Leaving the page removes the injected dialog and results so they cannot leak into passenger home.
```

- [ ] **Step 2: Run the current bridge smoke flow before changes**

Run the local API and current tunnel, open:

```text
https://jeff30515.github.io/railagent-demo-site/?apiBaseUrl=<current-tunnel-url>
```

Expected: Existing lost-item search and RailAgent chat remain reachable before modifying the bridge.

- [ ] **Step 3: Implement the injected friendly-transfer experience**

Add endpoint URL construction alongside existing chat and lost-found endpoints. Insert the launcher only when the visible existing button text contains `友善轉乘協助`. Create one accessible modal with two modes:

```js
const recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const canRecognizeSpeech = typeof recognition === 'function';

function openStationCall(phone) {
  window.location.href = `tel:${phone.replace(/[^+\d]/g, '')}`;
}
```

Use `fetch` for station resolution and route guidance, set `aria-live="polite"` on status text, and preserve user entries after an API error. Remove friendly-transfer overlay/results when the existing `← 返回` or `首頁` navigation button is clicked.

- [ ] **Step 4: Run the browser smoke checklist after changes**

Use the active local-tunnel URL. Confirm all six checklist items, including manual station input, explicit call confirmation, and a route reply from the local model. Test speech recognition only if the browser exposes it; otherwise verify the visible manual fallback.

- [ ] **Step 5: Update bridge cache version and commit UI integration**

```powershell
git add assets/lost-found-local-api.js index.html
git commit -m "Make friendly transfer assistance voice-first"
```

### Task 4: Full verification and publication

**Files:**
- Modify only files necessary to fix concrete verification failures.

**Interfaces:**
- Validates the combined API and static UI flow from Tasks 1-3.

- [ ] **Step 1: Run the full local API suite**

Run: `npm.cmd test -- --run`

Expected: PASS with zero failed tests.

- [ ] **Step 2: Run static type and build checks**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

Expected: both commands exit `0`.

- [ ] **Step 3: Smoke test live static page with the local tunnel**

Open the GitHub Pages URL with the active `apiBaseUrl`, then complete station lookup, explicit call confirmation, route advice, lost-item lookup, and RailAgent chat. Confirm navigation does not leave any injected cards or dialogs on passenger home.

- [ ] **Step 4: Commit only necessary verification fixes and push `main`**

```powershell
git status --short
git push origin main
```

Expected: clean worktree after any verification fixes and remote `main` contains the implementation.
