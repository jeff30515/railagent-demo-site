# Task 5 Report: Exclude TDX from the transport knowledge snapshot

## Status
- Complete.

## Changes
- Removed TDX credential inputs from `downloadSources`.
- Removed TDX source definitions, OAuth token request handling, blocked catalog entries, and authenticated TDX downloads from the downloader.
- Removed TDX credential inputs and environment reads from `refreshTransportKnowledge`.
- Removed TDX credential variables from `local.settings.example.json`.
- Updated downloader tests to assert no TDX request URLs, no `tdx-` catalog entries, and no TDX raw file paths even when credential-shaped extra options are supplied.
- Updated refresh test fixtures so refresh uses only the remaining public source list.
- `local-api/package.json` did not expose TDX-specific command behavior, so it was not changed.

## TDD Evidence
- RED: `npm.cmd test -- src/transportKnowledge/downloader.test.ts --run` failed before production edits with `expected ... to have a length of +0 but got 6`, proving the old downloader still emitted TDX catalog entries.
- GREEN: the same targeted downloader test passed after removing TDX behavior.

## Verification
- `npm.cmd test -- src/transportKnowledge/downloader.test.ts --run` -> 1 file passed, 2 tests passed.
- `npm.cmd test -- src/transportKnowledge/refresh.test.ts --run` -> 1 file passed, 1 test passed.
- `npm.cmd run typecheck` -> passed.
- `npm.cmd test -- --run` -> 15 files passed, 76 tests passed.
- `npm.cmd run build` -> passed.
- `rg -n "TDX|tdx|tdxClient" local-api\src\transportKnowledge\downloader.ts local-api\src\transportKnowledge\downloader.test.ts local-api\src\transportKnowledge\refresh.ts local-api\src\transportKnowledge\refresh.test.ts local-api\local.settings.example.json local-api\package.json` -> only the downloader regression test contains TDX strings, as assertions for skipped behavior.

## Concerns
- Existing `deriveKnowledge` and storage tests still contain standalone TDX fixtures outside this task's requested files. They are not used by refresh/download after this change, and the full suite still passes.
