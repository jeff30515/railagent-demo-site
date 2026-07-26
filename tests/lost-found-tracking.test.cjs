const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const enhancer = fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'lost-found-local-api.js'),
  'utf8',
);
const indexHtml = fs.readFileSync(
  path.join(__dirname, '..', 'index.html'),
  'utf8',
);

assert.match(
  enhancer,
  /const DEFAULT_API_BASE_URL = 'http:\/\/127\.0\.0\.1:7071'/,
  'The completed passenger runtime should load from the bare URL with the local API default.',
);
assert.match(
  enhancer,
  /function resolveApiBaseUrl\(search\)/,
  'The passenger runtime should resolve configured and default local API URLs through one path.',
);
assert.doesNotMatch(
  enhancer,
  /if \(!apiBaseUrl\) return/,
  'The bare URL must not return before installing the completed passenger runtime.',
);
assert.match(
  indexHtml,
  /lost-found-local-api\.js\?v=20260726-single-passenger-runtime-1/,
  'The entry page should force browsers to fetch the canonical passenger runtime.',
);
assert.doesNotMatch(
  indexHtml,
  /passenger-i18n\.js|gate-i18n\.js|gate-i18n\.css/,
  'The obsolete multilingual overlays must not be loaded beside the canonical runtime.',
);

assert.ok(
  enhancer.includes(String.raw`\u8ffd\u8e64\u6b64\u7269\u4ef6`),
  'Every local-AI candidate should offer tracking.',
);
assert.ok(
  enhancer.includes(String.raw`\u8ffd\u8e64\u4e2d`),
  'Tracked cases should display their tracking status.',
);
assert.match(
  enhancer,
  /railagent-tracked-lost-found-cases/,
  'Tracked cases should persist in browser storage.',
);
assert.match(
  enhancer,
  /localStorage/,
  'Tracking should survive navigation to the cases page.',
);
assert.match(
  enhancer,
  /contactPhone: item\.keepStationTel/,
  'Tracking should preserve the candidate contact telephone.',
);
assert.match(
  enhancer,
  /copy\.contact.*record\.contactPhone/,
  'Tracked case cards should show the preserved contact telephone.',
);
assert.ok(
  enhancer.includes(String.raw`\u9ed1\u8272\u80cc\u5305\u907a\u5931\u7269\uff0c\u9700\u8981\u7ad9\u52d9\u5148\u6bd4\u5c0d\u5019\u9078\u62fe\u7372\u7269\u3002`),
  'The legacy backpack case should be explicitly removed.',
);
assert.ok(
  enhancer.includes(String.raw`\u670d\u52d9\u56de\u994b`) && !enhancer.includes(String.raw`\u670d\u52d9\u56de\u994b\uff08\u9589\u74b0\uff09`),
  'The public feedback heading should omit the closed-loop suffix.',
);
assert.ok(
  enhancer.includes(String.raw`\u7d50\u6848\u5f8c\u56de\u994b\u6703\u5beb\u5165\u672c\u6a5f\u4e8b\u4ef6\u76ee\u9304\uff0c\u4f9b\u6b77\u53f2\u54c1\u8cea\u5206\u6790\u3002`) && enhancer.includes('paragraph.remove()'),
  'The obsolete event-directory note should be removed from the rendered feedback card.',
);
