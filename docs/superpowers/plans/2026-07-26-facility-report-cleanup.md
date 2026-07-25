# Facility Report Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove stale facility-report messaging, preserve the issue field after navigation, and present a clean acknowledgement after submission.

**Architecture:** Keep the progressive enhancement sidecar as the behaviour layer. Detect the live card through `#facility-issue`, rebuild only freshly restored bundled-app cards, and use a dedicated neutral success class.

**Tech Stack:** Static HTML, vanilla JavaScript, Node.js assertion tests.

## Global Constraints

- Do not modify the precompiled React bundle.
- Do not add dependencies.
- Keep required-input validation and the existing thank-you copy.
- Do not stage unrelated `local-api/data` files.

### Task 1: Regression tests

- [x] Add source assertions for stale-copy removal, re-entry detection, and neutral success styling.
- [x] Confirm they fail against the former implementation.

### Task 2: Enhancement cleanup

- [x] Replace the persistent readiness flag with `page.querySelector('#facility-issue')` detection.
- [x] Stop appending `.mp-footnote` and `.mp-notice` content.
- [x] Render a centred `facility-report-feedback__success` acknowledgement.
- [x] Run the targeted test and JavaScript syntax check.

### Task 3: Browser validation

- [x] Verify the issue field remains available after 返回 and re-entry.
- [x] Verify a valid submission presents only the clean thank-you acknowledgement.
