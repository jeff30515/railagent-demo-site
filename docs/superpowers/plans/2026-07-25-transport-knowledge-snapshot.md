# Transport Knowledge Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Download selected public rail and metro data into `local-api/data` and derive source-traceable JSONL documents for local Ollama retrieval.

**Architecture:** A transport-knowledge module owns typed catalog records, source-specific downloads, and deterministic document derivation. A CLI refresh command writes only below `local-api/data/transport-*`; injected fetch and clock functions make network behavior unit-testable. TDX calls use environment credentials and create explicit blocked catalog entries when unavailable.

**Tech Stack:** Node.js built-in fetch, TypeScript (NodeNext), Vitest, JSON/JSONL.

## Global Constraints

- Preserve original source URL, download time, format, status, and error details in `transport-catalog.json`.
- Never place TDX credentials in source control, raw data, derived data, output, or logs.
- Limit official-site capture to pages directly relevant to stations, transfers, accessibility, passenger services, and lost property.
- Mark timetable content as a snapshot and direct users to official real-time information for operational decisions.
- A failure or blocked status for one source must not stop other sources.
- Do not add dependencies.

---

### Task 1: Define the catalog and safe filesystem writer

**Files:**
- Create: `local-api/src/transportKnowledge/contracts.ts`
- Create: `local-api/src/transportKnowledge/storage.ts`
- Create: `local-api/src/transportKnowledge/storage.test.ts`

**Interfaces:**
- Produces `CatalogEntry`, `TransportCatalog`, `KnowledgeDocument`, `SnapshotFile`, and `writeSnapshot(root, catalog, files)`.
- `writeSnapshot(root: string, catalog: TransportCatalog, files: readonly SnapshotFile[]): Promise<void>` writes only below `root`.

- [ ] **Step 1: Write the failing test**

```ts
it('writes catalog and source files below the snapshot root', async () => {
  const root = await mkdtemp(join(tmpdir(), 'transport-knowledge-'));
  await writeSnapshot(root, { generatedAt: '2026-07-25T00:00:00.000Z', entries: [] }, [
    { relativePath: 'transport-raw/tdx/tra-stations.json', contents: '{"ok":true}' }
  ]);
  await expect(readFile(join(root, 'transport-catalog.json'), 'utf8')).resolves.toContain('generatedAt');
  await expect(readFile(join(root, 'transport-raw/tdx/tra-stations.json'), 'utf8')).resolves.toBe('{"ok":true}');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/transportKnowledge/storage.test.ts`

Expected: FAIL because `storage.ts` and `writeSnapshot` do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface CatalogEntry {
  id: string; title: string; sourceUrl: string; downloadedAt: string;
  format: 'json' | 'csv' | 'html' | 'text';
  relativePath?: string; status: 'downloaded' | 'blocked' | 'failed'; error?: string;
}
export interface TransportCatalog { generatedAt: string; entries: CatalogEntry[]; }
export interface KnowledgeDocument {
  id: string; topic: 'station' | 'transfer' | 'accessibility' | 'timetable';
  text: string; sourceUrl: string; downloadedAt: string;
}
export interface SnapshotFile { relativePath: string; contents: string; }
```

Use `mkdir(dirname(target), { recursive: true })`. Reject a relative path when `resolve(root, relativePath)` does not start with `resolve(root) + sep`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/transportKnowledge/storage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add local-api/src/transportKnowledge/contracts.ts local-api/src/transportKnowledge/storage.ts local-api/src/transportKnowledge/storage.test.ts
git commit -m "Add transport snapshot storage"
```

### Task 2: Download each source independently and catalogue outcomes

**Files:**
- Create: `local-api/src/transportKnowledge/downloader.ts`
- Create: `local-api/src/transportKnowledge/downloader.test.ts`

**Interfaces:**
- Consumes Task 1 types.
- Produces `downloadSources({ fetch, now, tdxClientId?, tdxClientSecret? }): Promise<{ catalog: TransportCatalog; files: SnapshotFile[] }>`.
- TDX source IDs begin with `tdx-`; public source IDs include `taipei-metro-od`, `tra-official-`, `thsr-official-`, and `trtc-official-`.

- [ ] **Step 1: Write the failing tests**

```ts
it('continues after one source fails and records the failure', async () => {
  const result = await downloadSources({
    fetch: async (url) => String(url).includes('broken')
      ? new Response('', { status: 503 })
      : new Response('{"stations":[]}', { status: 200 }),
    now: () => '2026-07-25T00:00:00.000Z'
  });
  expect(result.catalog.entries.some((entry) => entry.status === 'failed')).toBe(true);
  expect(result.files.length).toBeGreaterThan(0);
});

it('records TDX as blocked without credentials without attempting a TDX request', async () => {
  const fetch = vi.fn(async () => new Response('{}', { status: 200 }));
  const result = await downloadSources({ fetch, now: () => '2026-07-25T00:00:00.000Z' });
  expect(result.catalog.entries.filter((entry) => entry.id.startsWith('tdx-')).every((entry) => entry.status === 'blocked')).toBe(true);
  expect(fetch.mock.calls.some(([url]) => String(url).includes('tdx.transportdata.tw'))).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/transportKnowledge/downloader.test.ts`

Expected: FAIL because `downloadSources` does not exist.

- [ ] **Step 3: Write minimal implementation**

Use fixed source arrays. The public array contains Taipei OD dataset metadata/resource and a finite allowlist of official service pages. The TDX array includes TRA and THSR station plus timetable endpoints, and TRTC station, line, and transfer endpoints. Request an OAuth token only when both credentials exist; attach it as `Authorization: Bearer <token>`. On each non-2xx response create a `failed` catalog entry and continue. With absent credentials, create a `blocked` entry for every TDX source and do not call TDX.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/transportKnowledge/downloader.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add local-api/src/transportKnowledge/downloader.ts local-api/src/transportKnowledge/downloader.test.ts
git commit -m "Add independent transport source downloads"
```

### Task 3: Derive source-traceable retrieval documents

**Files:**
- Create: `local-api/src/transportKnowledge/deriveKnowledge.ts`
- Create: `local-api/src/transportKnowledge/deriveKnowledge.test.ts`

**Interfaces:**
- Consumes `SnapshotFile[]` and successful `CatalogEntry[]`.
- Produces `deriveKnowledge(files, entries): Record<'station' | 'transfer' | 'accessibility' | 'timetable', KnowledgeDocument[]>`.

- [ ] **Step 1: Write the failing test**

```ts
it('creates a station document with source traceability', () => {
  const documents = deriveKnowledge([
    { relativePath: 'transport-raw/tdx/tra-stations.json', contents: JSON.stringify([{ StationID: '1000', StationName: { Zh_tw: '臺北' }, StationAddress: '臺北市' }]) }
  ], [{ id: 'tdx-tra-stations', title: '臺鐵車站', sourceUrl: 'https://tdx.example/tra', downloadedAt: '2026-07-25T00:00:00.000Z', format: 'json', relativePath: 'transport-raw/tdx/tra-stations.json', status: 'downloaded' }]);
  expect(documents.station[0]).toMatchObject({ topic: 'station', sourceUrl: 'https://tdx.example/tra', downloadedAt: '2026-07-25T00:00:00.000Z' });
  expect(documents.station[0].text).toContain('臺北');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/transportKnowledge/deriveKnowledge.test.ts`

Expected: FAIL because `deriveKnowledge` does not exist.

- [ ] **Step 3: Write minimal implementation**

Parse known JSON arrays and objects. Build concise Traditional Chinese documents for station names/addresses, line names, transfer descriptions, facilities, and timetable period information. Keep allowlisted official-page body text as accessibility or transfer documents according to source metadata. Append `資料快照，實際班次請以官方即時資訊為準。` to every timetable document.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/transportKnowledge/deriveKnowledge.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add local-api/src/transportKnowledge/deriveKnowledge.ts local-api/src/transportKnowledge/deriveKnowledge.test.ts
git commit -m "Derive transport retrieval documents"
```

### Task 4: Add a refresh CLI and execute the first snapshot

**Files:**
- Create: `local-api/src/transportKnowledge/refresh.ts`
- Create: `local-api/src/transportKnowledge/refresh.test.ts`
- Modify: `local-api/package.json`
- Modify: `local-api/local.settings.example.json`
- Create: `local-api/data/transport-raw/.gitkeep`
- Create: `local-api/data/transport-knowledge/.gitkeep`

**Interfaces:**
- Produces `refreshTransportKnowledge({ root, fetch, now, tdxClientId?, tdxClientSecret? })`.
- Adds `npm run refresh:transport-knowledge`; environment inputs are `TDX_CLIENT_ID`, `TDX_CLIENT_SECRET`, and optional `TRANSPORT_DATA_ROOT`.

- [ ] **Step 1: Write the failing test**

```ts
it('writes raw, catalog, and JSONL knowledge when a source succeeds', async () => {
  const root = await mkdtemp(join(tmpdir(), 'transport-refresh-'));
  await refreshTransportKnowledge({
    root,
    fetch: async () => new Response(JSON.stringify([{ StationID: '1000', StationName: { Zh_tw: '臺北' } }]), { status: 200 }),
    now: () => '2026-07-25T00:00:00.000Z'
  });
  await expect(readFile(join(root, 'transport-catalog.json'), 'utf8')).resolves.toContain('downloaded');
  await expect(readFile(join(root, 'transport-knowledge/station-documents.jsonl'), 'utf8')).resolves.toContain('臺北');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/transportKnowledge/refresh.test.ts`

Expected: FAIL because `refreshTransportKnowledge` does not exist.

- [ ] **Step 3: Write minimal implementation**

Call the downloader, derive documents, serialize one JSON object per line per topic, then call `writeSnapshot`. Add:

```json
"refresh:transport-knowledge": "npm run build && node dist/src/transportKnowledge/refresh.js"
```

Document the optional TDX environment variables in `local.settings.example.json` with blank values only.

- [ ] **Step 4: Run tests and static checks**

Run: `npm test -- src/transportKnowledge/refresh.test.ts && npm run typecheck && npm test -- --run`

Expected: all commands PASS.

- [ ] **Step 5: Execute and inspect the public-data snapshot**

Run: `npm run refresh:transport-knowledge`

Expected: catalog exists; public sources are downloaded or recorded with exact failure; TDX is blocked without credentials; every derived document has `sourceUrl` and `downloadedAt`.

- [ ] **Step 6: Commit**

```bash
git add local-api/package.json local-api/local.settings.example.json local-api/src/transportKnowledge local-api/data/transport-raw/.gitkeep local-api/data/transport-knowledge/.gitkeep
git commit -m "Add transport knowledge refresh command"
```

## Self-review

- Spec coverage: Tasks 1–4 cover raw-data retention, catalog traceability, isolated failures, TDX credential safety, official-page scoping, derived JSONL, snapshot disclaimers, test isolation, and an actual public-data refresh.
- Placeholder scan: no deferred behavior or undefined interfaces remain.
- Type consistency: `CatalogEntry`, `KnowledgeDocument`, `SnapshotFile`, `downloadSources`, `deriveKnowledge`, `writeSnapshot`, and `refreshTransportKnowledge` are used consistently.

