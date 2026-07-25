# Facility Report Feedback Implementation Plan

**Goal:** Collect a passenger's on-site facility issue and acknowledge a valid submission.

**Architecture:** The repository publishes a compiled React preview without its source. A small deferred script observes the existing facility-report page and replaces its static submit control with an accessible native form. It performs local required-field validation and replaces the form with the requested thank-you status message after submission.

**Constraints:** Preserve the existing selection flow; add no backend persistence; require a problem description; display the exact approved thank-you copy.

### Task 1: Add and verify the facility-report form

**Files:**

- `assets/facility-report-feedback.js` — progressive enhancement for the published facility page.
- `index.html` — loads the enhancement after the compiled bundle.
- `tests/facility-report-feedback.test.cjs` — static regression checks for the form ID, validation path, and approved copy.

- [x] Add a failing test for the new enhancement asset and its required strings.
- [x] Create the enhancement with a labelled `facility-issue` textarea, inline empty-value error, and status message.
- [x] Load the enhancement from the static page.
- [x] Add `noValidate` so blank submissions reach the inline validation branch.
- [x] Run the test and syntax checks.
- [x] Manually verify that blank submission shows `請輸入現場問題後再送出。` and valid submission shows `感謝您的回報，我們已通知相關人員處理。`.
