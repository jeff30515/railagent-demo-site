const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const enhancement = fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'facility-report-feedback.js'),
  'utf8',
);

assert.match(
  enhancement,
  /facility-issue/,
  'Facility reports should provide an issue-description input.',
);
assert.match(
  enhancement,
  /noValidate: true/,
  'Facility reports should route blank submissions through the inline error message.',
);
assert.match(
  enhancement,
  /RailAgentPassengerRuntimeLocales/,
  'Facility feedback should use the shared nine-language copy.',
);
assert.match(
  enhancement,
  /getRuntimeCopy\(document\.documentElement\.lang\)/,
  'Facility copy should follow the active document language.',
);
assert.match(
  enhancement,
  /copy\.facilityRequired/,
  'Facility reports should explain blank submissions with localized runtime copy.',
);
assert.match(
  enhancement,
  /copy\.facilityThanks/,
  'Facility reports should acknowledge submissions with localized runtime copy.',
);
assert.ok(
  enhancement.includes("page.querySelector('#facility-issue')"),
  'A restored facility page should be enhanced again when its textarea is absent.',
);
assert.ok(
  !enhancement.includes("page.dataset.facilityFeedbackReady"),
  'A persistent page readiness flag must not prevent enhancement after re-entry.',
);
assert.ok(
  !enhancement.includes("const sample = card.querySelector('.mp-footnote');"),
  'The obsolete facility sample message should not be copied into the form.',
);
assert.ok(
  !enhancement.includes("const notice = card.querySelector('.mp-notice');"),
  'The Demo notice should not be copied into the form.',
);
assert.ok(
  enhancement.includes('facility-report-feedback__success'),
  'The acknowledgement should use its own neutral success presentation.',
);
