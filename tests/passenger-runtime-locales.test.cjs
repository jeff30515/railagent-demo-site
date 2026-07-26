const assert = require('node:assert/strict');
const test = require('node:test');

const locales = require('../assets/passenger-runtime-locales.js');

const expectedLanguages = ['zh-TW', 'nan', 'hak', 'en', 'ja', 'ko', 'vi', 'id', 'th'];

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
