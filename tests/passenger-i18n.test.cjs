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

test('passenger i18n normalizes existing app language values and chip codes', () => {
  const i18n = loadPassengerI18n();
  const cases = [
    ['zh', 'zh-TW'],
    ['tw', 'nan'],
    ['zh-Hant-TW', 'zh-TW'],
    ['nan-TW', 'nan'],
    ['hak-TW', 'hak'],
    ['en-US', 'en'],
    ['ja-JP', 'ja'],
    ['ko-KR', 'ko'],
    ['vi-VN', 'vi'],
    ['id-ID', 'id'],
    ['th-TH', 'th'],
  ];

  for (const [appValue, expectedLanguage] of cases) {
    assert.equal(i18n.getLanguage({ lang: appValue }), expectedLanguage);
    assert.equal(
      i18n.translate('member.login', appValue),
      i18n.translate('member.login', expectedLanguage),
    );
  }
});

test('passenger i18n uses current page language when language argument is omitted', () => {
  const document = { documentElement: { lang: 'en-US' } };
  const i18n = loadPassengerI18n({ document });

  assert.equal(i18n.getLanguage(), 'en');
  assert.equal(i18n.translate('member.login'), 'Member Sign In');
  assert.equal(i18n.translateText('會員登入'), 'Member Sign In');
});

test('passenger i18n falls back to the active language chip when the root has no language', () => {
  const activeChip = {
    dataset: { language: 'ja-JP' },
    getAttribute(name) {
      return name === 'data-lang' ? 'ja-JP' : null;
    },
  };
  const document = {
    documentElement: { lang: '' },
    querySelector(selector) {
      return selector === '.mp-lang-chip.active, .mp-lang-chip.is-active, .mp-lang-chip[aria-pressed="true"]'
        ? activeChip
        : null;
    },
  };
  const i18n = loadPassengerI18n({ document });

  assert.equal(i18n.getLanguage(), 'ja');
  assert.equal(i18n.translate('member.login'), i18n.translate('member.login', 'ja'));
});
