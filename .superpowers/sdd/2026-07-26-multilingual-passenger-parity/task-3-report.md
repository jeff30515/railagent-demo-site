# Task 3 Report

## Files

- `index.html`
- `assets/passenger-i18n.js`
- `tests/passenger-i18n.test.cjs`

## Red

- `node --test tests/passenger-i18n.test.cjs` failed after adding the DOM localization test.
- Expected failure: `PassengerI18n.apply(root, 'th')` returned `false` because `apply()` was still a stub.

## Green

- `PassengerI18n.apply(root?, language?)` now translates only exact known Traditional-Chinese passenger text in text nodes and `aria-label`, `placeholder`, and `title`.
- Stable attributes such as `data-action`, event-bearing elements, IDs, data attributes, input values, event IDs, station/API strings, localStorage, and unknown strings are left untouched.
- `document.documentElement.lang` is updated with BCP-47 values such as `th-TH`.
- `PassengerI18n.observe()` now auto-starts, watches language-chip clicks and child DOM mutations, and guards against repeated observer setup and mutation loops.
- `index.html` loads `assets/passenger-i18n.js` before dependent enhancement scripts.

## Verification

- Red: `node --test tests/passenger-i18n.test.cjs` -> failed 1/5 as expected on `false !== true` for the new apply test.
- Target: `node --test tests/passenger-i18n.test.cjs` -> 5 passed, 0 failed.
- Full tests: `node --test tests/*.test.cjs` -> 12 passed, 0 failed.
- Syntax: `node --check assets/passenger-i18n.js` -> passed with no output.
- Whitespace: `git diff --check` -> exit 0; Git reported LF-to-CRLF working-copy warnings for touched files.

## Commit

- `Coordinate passenger DOM i18n parity`

## Concerns

- `git diff --check` emits line-ending warnings because Git will convert LF to CRLF when touching the modified files; no whitespace errors were reported.

## Review Fix 2026-07-26

### Files

- `assets/passenger-i18n.js`
- `tests/passenger-i18n.test.cjs`

### Red

- `node --test tests/passenger-i18n.test.cjs` failed 2/7 after adding regressions.
- Expected failures:
  - `apply(section)` returned `false` instead of translating with document `lang="en-US"`.
  - Active chip with visible `TH` and `aria-label="Thai"` resolved to `zh-TW` instead of `th`.

### Green

- Scoped `getLanguage(root)` now falls back from root language/chip to `document.documentElement.lang`, then the document-level active chip.
- Chip language detection now reads `aria-label` language labels and normalizes short visible codes such as `TH`.

### Verification

- Target: `node --test tests/passenger-i18n.test.cjs` -> 7 passed, 0 failed.
- Full tests: `node --test tests/*.test.cjs` -> 14 passed, 0 failed.
- Syntax: `node --check assets/passenger-i18n.js` -> passed with no output.
- Whitespace: `git diff --check` -> exit 0; Git reported LF-to-CRLF working-copy warnings for touched files.

### Concerns

- No new concerns beyond the existing line-ending warnings.
