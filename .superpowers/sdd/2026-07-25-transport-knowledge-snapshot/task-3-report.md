### Task 3 Report: Derive source-traceable retrieval documents

**Status:** Complete

**Files changed:**
- `local-api/src/transportKnowledge/deriveKnowledge.ts`
- `local-api/src/transportKnowledge/deriveKnowledge.test.ts`

**TDD evidence:**
- Added the required initial station derivation test first.
- Ran `npm.cmd test -- src/transportKnowledge/deriveKnowledge.test.ts`.
- Observed expected RED failure: `Cannot find module './deriveKnowledge.js'`.
- Implemented `deriveKnowledge`.
- Added focused coverage for combined line/transfer JSON objects, timetable snapshot notices, official page allowlisting, blocked/failed source skipping, and unparseable JSON skipping.

**Implementation summary:**
- Exports `deriveKnowledge(files, entries)` returning all four required topic buckets: `station`, `transfer`, `accessibility`, and `timetable`.
- Uses only successful catalog entries with a matching `relativePath` snapshot file.
- Preserves `sourceUrl` and `downloadedAt` on every derived `KnowledgeDocument`.
- Classifies topics from catalog metadata without changing `contracts.ts`.
- Parses JSON arrays and object-wrapped arrays, including combined line/transfer source objects.
- Produces concise Traditional Chinese runtime text for station, transfer, facility/accessibility, and timetable documents.
- Preserves only allowlisted official page body text for relevant station, transfer, accessibility, passenger service, or lost property metadata.
- Marks timetable text as a snapshot and appends the exact required realtime-guidance suffix. The suffix is encoded with Unicode escapes in source to avoid console/codepage drift.
- Skips blocked, failed, unknown, missing-file, and unparseable inputs without throwing.
- Added no dependencies.

**Verification:**
- `npm.cmd test -- src/transportKnowledge/deriveKnowledge.test.ts` -> passed, 4 tests.
- `npm.cmd run typecheck` -> passed.
- `npm.cmd test` -> passed, 14 test files and 76 tests.

**Notes / risks:**
- The derivation is intentionally conservative and metadata-driven. Unknown sources are skipped rather than guessed.
- HTML extraction is lightweight and dependency-free; it strips tags/scripts/styles but does not attempt full browser-grade text rendering.

### Fix Round 1

**Finding addressed:** Timetable documents appended a mojibake notice instead of the required exact text.

**Changes:**
- Replaced the timetable notice constant with the exact required runtime string: `資料快照，實際班次請以官方即時資訊為準。`.
- Updated the timetable test to assert exact final-line equality for that suffix instead of matching the old mojibake regex.

**Verification:**
- `npm.cmd test -- src/transportKnowledge/deriveKnowledge.test.ts` -> passed, 4 tests.
- `npm.cmd run typecheck` -> passed.
- `npm.cmd test` -> passed, 14 test files and 76 tests.
