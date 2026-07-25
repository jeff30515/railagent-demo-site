const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadPassengerI18n(extraWindow = {}) {
  const script = fs.readFileSync(path.join(__dirname, '..', 'assets', 'passenger-i18n.js'), 'utf8');
  const window = {
    document: { documentElement: { lang: '' } },
    localStorage: { getItem: () => null },
    ...extraWindow,
  };
  const context = { window, document: window.document };
  vm.runInNewContext(script, context);
  return context.window.PassengerI18n;
}

test('passenger i18n publishes complete non-empty copy for every supported language', () => {
  const i18n = loadPassengerI18n();
  const expectedLanguages = ['zh-TW', 'nan', 'hak', 'en', 'ja', 'ko', 'vi', 'id', 'th'];
  const requiredKeys = [...i18n.REQUIRED_KEYS].sort();

  assert.deepEqual(Array.from(i18n.SUPPORTED_LANGUAGES), expectedLanguages);
  assert.equal(typeof i18n.getLanguage, 'function');
  assert.equal(typeof i18n.translate, 'function');
  assert.equal(typeof i18n.translateText, 'function');
  assert.equal(typeof i18n.apply, 'function');
  assert.equal(typeof i18n.observe, 'function');
  assert.equal(i18n.translate('member.login', 'xx'), i18n.translate('member.login', 'zh-TW'));
  assert.equal(i18n.translate('missing.copy', 'en'), i18n.translate('missing.copy', 'zh-TW'));
  assert.equal(i18n.translateText('會員登入', 'en'), 'Member Sign In');
  assert.equal(i18n.apply(), false);
  assert.equal(i18n.observe(), false);

  for (const language of expectedLanguages) {
    assert.notEqual(i18n.translate('member.login', language), '');
    assert.notEqual(i18n.translate('case.unfollow', language), '');
    assert.deepEqual(Array.from(Object.keys(i18n.COPY[language]).sort()), requiredKeys);
  }
});
