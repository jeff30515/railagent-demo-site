const assert = require('node:assert/strict');
const test = require('node:test');

const locales = require('../assets/passenger-runtime-locales.js');

const expectedLanguages = ['zh-TW', 'nan', 'hak', 'en', 'ja', 'ko', 'vi', 'id', 'th'];
const memberKeys = [
  'memberTitle',
  'memberLoginLead',
  'memberJoinLead',
  'memberTabsLabel',
  'memberLoginTab',
  'memberJoinTab',
  'memberAccountLabel',
  'memberPasswordLabel',
  'memberRememberLabel',
  'memberForgotPassword',
  'memberLoginSubmit',
  'memberLoginHint',
  'memberLoginDemoStatus',
  'memberForgotDemoStatus',
  'memberJoinIdLabel',
  'memberJoinPasswordLabel',
  'memberJoinPasswordConfirmLabel',
  'memberJoinNameLabel',
  'memberJoinGenderLabel',
  'memberJoinGenderMale',
  'memberJoinGenderFemale',
  'memberJoinBirthdayLabel',
  'memberJoinEmailLabel',
  'memberJoinMobileLabel',
  'memberJoinResidenceLabel',
  'memberJoinSubmit',
  'memberJoinDemoStatus',
  'memberReturn',
];
const runtimeExtensionKeys = [
  'chatPlaceholder',
  'thinking',
  'missingInput',
  'searching',
  'searchError',
  'searchTitle',
  'noMatch',
  'snapshot',
  'mode',
  'similar',
  'pickupDate',
  'unknown',
  'unknownItem',
  'contact',
  'thankYou',
  'transferRouteLead',
  'callTitle',
  'callLead',
  'stationPlaceholder',
  'startVoice',
  'findStation',
  'calling',
  'stationError',
  'voiceUnavailable',
  'routePlaceholderOrigin',
  'routePlaceholderDestination',
  'routeThinking',
  'transferPageGuide',
  'routeOriginGuide',
  'routeDestinationGuide',
  'voicePrompt',
  'voiceRecognized',
  'stationThinking',
];

test('canonical passenger runtime provides complete copy for all nine languages', () => {
  assert.deepEqual(locales.SUPPORTED_LANGUAGES, expectedLanguages);

  for (const language of expectedLanguages) {
    const copy = locales.getRuntimeCopy(language);
    const pageLabels = locales.getPageLabels(language);

    for (const key of [
      'askRailAgent',
      'chatSubtitle',
      'close',
      'chatPlaceholder',
      'send',
      'thinking',
      'chatError',
      'missingInput',
      'searching',
      'searchError',
      'searchTitle',
      'noMatch',
      'snapshot',
      'mode',
      'similar',
      'pickupDate',
      'unknown',
      'unknownItem',
      'contact',
      'transferHelp',
      'transferRoute',
      'transferRouteLead',
      'callTitle',
      'callLead',
      'stationPlaceholder',
      'startVoice',
      'findStation',
      'calling',
      'stationError',
      'voiceUnavailable',
      'routeOrigin',
      'routeDestination',
      'routePlaceholderOrigin',
      'routePlaceholderDestination',
      'routeSubmit',
      'routeThinking',
      'routeError',
      'transferPageGuide',
      'routeOriginGuide',
      'routeDestinationGuide',
      'voicePrompt',
      'voiceRecognized',
      'stationThinking',
      'trackItem',
      'tracked',
      'tracking',
      'facilityIssue',
      'facilityRequired',
      'facilityThanks',
      'caseUnfollow',
      'caseUnfollowStatus',
      'feedback',
      'thankYou',
      ...memberKeys,
    ]) {
      assert.equal(typeof copy[key], 'string', `${language}.${key}`);
      assert.ok(copy[key].trim(), `${language}.${key} must not be blank`);
    }

    for (const key of [
      'friendlyTitle',
      'lostTitle',
      'facilityTitle',
      'quickHelp',
      'moreServices',
    ]) {
      assert.equal(typeof pageLabels[key], 'string', `${language}.${key}`);
      assert.ok(pageLabels[key].trim(), `${language}.${key} must not be blank`);
    }
  }
});

test('member auth copy rejects generated placeholders and wrong-language prefixes', () => {
  const wrongLanguagePatterns = {
    'zh-TW': /\b(Member|Login anggota)\b/,
    nan: /\bMember nan\b|\bMember hak\b|\bMember ja\b|\bMember ko\b|\bMember vi\b|\bMember th\b/,
    hak: /\bMember nan\b|\bMember hak\b|\bMember ja\b|\bMember ko\b|\bMember vi\b|\bMember th\b/,
    en: /\bMember nan\b|\bMember hak\b|\bMember ja\b|\bMember ko\b|\bMember vi\b|\bMember th\b/,
    ja: /\bMember nan\b|\bMember hak\b|\bMember ja\b|\bMember ko\b|\bMember vi\b|\bMember th\b|\bLogin anggota\b/,
    ko: /\bMember nan\b|\bMember hak\b|\bMember ja\b|\bMember ko\b|\bMember vi\b|\bMember th\b|\bLogin anggota\b/,
    vi: /\bMember nan\b|\bMember hak\b|\bMember ja\b|\bMember ko\b|\bMember vi\b|\bMember th\b|\bLogin anggota\b/,
    id: /\bMember nan\b|\bMember hak\b|\bMember ja\b|\bMember ko\b|\bMember vi\b|\bMember th\b/,
    th: /\bMember nan\b|\bMember hak\b|\bMember ja\b|\bMember ko\b|\bMember vi\b|\bMember th\b|\bLogin anggota\b/,
  };

  for (const language of expectedLanguages) {
    const copy = locales.getRuntimeCopy(language);

    for (const key of memberKeys) {
      assert.doesNotMatch(copy[key], wrongLanguagePatterns[language], `${language}.${key}`);
    }
  }
});

test('member auth copy contains representative natural strings for placeholder-prone languages', () => {
  assert.equal(locales.getRuntimeCopy('nan').memberTitle, 'Hoe-oan teng-jiip');
  assert.equal(locales.getRuntimeCopy('hak').memberTitle, 'Fi-ngien ten-ngip');
  assert.equal(locales.getRuntimeCopy('ja').memberTitle, '会員ログイン');
  assert.equal(locales.getRuntimeCopy('ko').memberTitle, '회원 로그인');
  assert.equal(locales.getRuntimeCopy('vi').memberTitle, 'Đăng nhập hội viên');
  assert.equal(locales.getRuntimeCopy('th').memberTitle, 'เข้าสู่ระบบสมาชิก');
});

test('runtime extension copy rejects generated placeholders and wrong-language prefixes', () => {
  const placeholderPattern = /\bLFI (?:nan|hak|ja|ko|vi|th)\b/;
  const wrongLanguagePatterns = {
    'zh-TW': /\b(?:Type your question|Tulis pertanyaan|Local AI search results)\b/,
    nan: /\b(?:Type your question|Tulis pertanyaan|Local AI search results)\b/,
    hak: /\b(?:Type your question|Tulis pertanyaan|Local AI search results)\b/,
    en: /\bLFI (?:nan|hak|ja|ko|vi|th)\b/,
    ja: /\b(?:Type your question|Tulis pertanyaan|Local AI search results)\b/,
    ko: /\b(?:Type your question|Tulis pertanyaan|Local AI search results)\b/,
    vi: /\b(?:Type your question|Tulis pertanyaan|Local AI search results)\b/,
    id: /\bLFI (?:nan|hak|ja|ko|vi|th)\b/,
    th: /\b(?:Type your question|Tulis pertanyaan|Local AI search results)\b/,
  };

  for (const language of expectedLanguages) {
    const copy = locales.getRuntimeCopy(language);

    for (const key of runtimeExtensionKeys) {
      assert.doesNotMatch(copy[key], placeholderPattern, `${language}.${key}`);
      assert.doesNotMatch(copy[key], wrongLanguagePatterns[language], `${language}.${key}`);
    }
  }
});

test('runtime extension copy contains representative natural strings for placeholder-prone languages', () => {
  assert.equal(locales.getRuntimeCopy('nan').chatPlaceholder, 'Phah li e bun-toe...');
  assert.equal(locales.getRuntimeCopy('hak').searchTitle, 'Pun-ki AI tsham-chhau kit-ko');
  assert.equal(locales.getRuntimeCopy('ja').stationError, 'Ekimei o ninshiki dekimasen. Mo ichido ekimei o hanasu ka nyuryoku shite kudasai.');
  assert.equal(locales.getRuntimeCopy('ko').pickupDate, 'Seupdeugil');
  assert.equal(locales.getRuntimeCopy('vi').transferRouteLead, 'Nhap vi tri hien tai va diem den de AI cuc bo goi y lo trinh.');
  assert.equal(locales.getRuntimeCopy('th').chatPlaceholder, 'Phim kham tham khong khun...');
});

test('language aliases normalize without downloading language resources', () => {
  assert.equal(locales.normalizeLanguage('zh-Hant-TW'), 'zh-TW');
  assert.equal(locales.normalizeLanguage('nan-TW'), 'nan');
  assert.equal(locales.normalizeLanguage('hak-TW'), 'hak');
  assert.equal(locales.normalizeLanguage('en-US'), 'en');
  assert.equal(locales.normalizeLanguage('ja-JP'), 'ja');
  assert.equal(locales.normalizeLanguage('ko-KR'), 'ko');
  assert.equal(locales.normalizeLanguage('vi-VN'), 'vi');
  assert.equal(locales.normalizeLanguage('id-ID'), 'id');
  assert.equal(locales.normalizeLanguage('th-TH'), 'th');
  assert.equal(locales.normalizeLanguage('unknown'), 'zh-TW');
});
