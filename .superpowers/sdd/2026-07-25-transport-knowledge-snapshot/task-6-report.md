# Task 6 Report: Source URL Corrections

## Scope

- Owned files: `local-api/src/transportKnowledge/downloader.ts`, `local-api/src/transportKnowledge/downloader.test.ts`
- Report file: `.superpowers/sdd/2026-07-25-transport-knowledge-snapshot/task-6-report.md`
- Did not edit out-of-scope refresh tests or generated data artifacts.

## Changes

- Replaced the stale TRA accessibility URL that returned HTTP 404 with the current official mobility-service URL.
- Replaced the unrelated Taipei Metro station facilities endpoint with the official Taipei Open Data OD CSV manifest endpoint.
- Preserved the Taipei OD manifest as the authoritative raw record; no monthly CSV fan-out was added.
- Updated downloader tests first to assert the exact replacement URLs, CSV manifest format, and successful raw output path.

## TDD Evidence

- RED: `npm.cmd test -- src/transportKnowledge/downloader.test.ts` failed before production edits because `tra-official-accessibility.sourceUrl` still used `https://www.railway.gov.tw/tra-tip-web/tip/tip00H/tipH41/view`.
- GREEN: `npm.cmd test -- src/transportKnowledge/downloader.test.ts` passed after the metadata correction.

## Verification

- Targeted tests: `npm.cmd test -- src/transportKnowledge/downloader.test.ts` -> passed, 2 tests.
- Typecheck: `npm.cmd run typecheck` -> passed.
- Full suite: `npm.cmd test` -> failed in out-of-scope `src/transportKnowledge/refresh.test.ts`, which still expects `transport-raw/taipei-metro/taipei-metro-od-stations.json`; actual catalog now correctly writes `transport-raw/taipei-metro/taipei-metro-od-stations.csv`.

## Notes

- Initial `npm test -- ...` through PowerShell failed because script execution is disabled for `npm.ps1`; reran with `npm.cmd`.
- Existing untracked `local-api/data/transport-*` files were present before this task and were not modified.
