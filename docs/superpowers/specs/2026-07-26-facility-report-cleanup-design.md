# Facility Report Cleanup Design

## Confirmed UI

- Remove the obsolete B1 sample copy and the orange Demo service-event notice.
- Keep the existing white rounded card.
- After successful submission, replace the form with centred thank-you text without the orange `.mp-notice` treatment.

## Navigation resilience

The progressive enhancement checks the current card for `#facility-issue` instead of using a persistent page readiness flag. When React restores a fresh card after returning and re-entering, the enhancement creates the input again.

## Verification

- Static assertions cover stale-copy removal, re-entry detection, and success styling.
- Browser smoke test covers re-entry and valid submission.
