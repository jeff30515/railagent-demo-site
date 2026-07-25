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
assert.ok(
  enhancement.includes(String.raw`\u8acb\u8f38\u5165\u73fe\u5834\u554f\u984c\u5f8c\u518d\u9001\u51fa\u3002`),
  'Facility reports should explain why a blank submission cannot be sent.',
);
assert.ok(
  enhancement.includes(String.raw`\u611f\u8b1d\u60a8\u7684\u56de\u5831\uff0c\u6211\u5011\u5df2\u901a\u77e5\u76f8\u95dc\u4eba\u54e1\u8655\u7406\u3002`),
  'Facility reports should acknowledge a successful submission.',
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
