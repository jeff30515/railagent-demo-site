# 九語系旅客功能一致性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓九種語言共用完整旅客功能，且所有介面、狀態與可存取名稱使用選取的本地化文字。

**Architecture:** 新增 `passenger-i18n.js` 作為唯一的瀏覽器端旅客翻譯來源。它匯出九語系字典與 DOM 套用 API，並以 MutationObserver 處理 React 及現有增強腳本的動態重繪；既有增強腳本透過該 API 取得字串，不改變功能事件或資料鍵。

**Tech Stack:** 靜態 JavaScript、Node.js 內建測試器、現有 React 編譯產物、DOM API。

## Global Constraints

- 九種語言必須為 `zh-TW`、`nan`、`hak`、`en`、`ja`、`ko`、`vi`、`id`、`th`。
- 不使用遠端翻譯服務、即時翻譯或由使用者安裝的語言包。
- 保持既有 API、`localStorage` 鍵、元素 ID、hash 路由與功能事件不變。
- 未知語系或缺漏字串須回退到繁中，不能顯示空白。
- 不新增套件。

---

### Task 1: 建立可重用的旅客語系協調器

**Files:**
- Create: `assets/passenger-i18n.js`
- Test: `tests/passenger-i18n.test.cjs`

**Interfaces:**
- Produces: `window.PassengerI18n`，包含 `getLanguage()`, `translate(key, language?)`, `translateText(text, language?)`, `apply(root?)`, `observe()`。
- Consumes: 頁面中目前選取的語言 chip，以及既有的語言標籤。

- [ ] **Step 1: Write the failing test**

```js
test('ships all passenger copy for every supported language', () => {
  const { PassengerI18n } = loadI18n(createDocument());
  for (const language of PassengerI18n.SUPPORTED_LANGUAGES) {
    assert.equal(PassengerI18n.translate('member.login', language).length > 0, true);
    assert.equal(PassengerI18n.translate('case.unfollow', language).length > 0, true);
  }
  assert.equal(PassengerI18n.translate('member.login', 'unknown'), PassengerI18n.translate('member.login', 'zh-TW'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/passenger-i18n.test.cjs`

Expected: FAIL because `assets/passenger-i18n.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
const SUPPORTED_LANGUAGES = ['zh-TW', 'nan', 'hak', 'en', 'ja', 'ko', 'vi', 'id', 'th'];
function translate(key, language) {
  return COPY[language]?.[key] ?? COPY['zh-TW'][key] ?? key;
}
window.PassengerI18n = { SUPPORTED_LANGUAGES, translate, /* remaining API */ };
```

Include all member-auth, tracked-case, lost-found, friendly-transfer, facility-feedback, account, navigation and status copy keys used in the passenger surface.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/passenger-i18n.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add assets/passenger-i18n.js tests/passenger-i18n.test.cjs
git commit -m "Bundle passenger translations for all languages"
```

### Task 2: Localize dynamic member and tracked-case enhancements

**Files:**
- Modify: `assets/passenger-member-auth.js`
- Modify: `assets/passenger-case-unfollow.js`
- Modify: `tests/passenger-member-auth.test.cjs`
- Modify: `tests/passenger-case-unfollow.test.cjs`

**Interfaces:**
- Consumes: `window.PassengerI18n.translate(key)` and `window.PassengerI18n.apply(section)`.
- Produces: The existing member forms and unfollow control with localized text and unchanged element IDs, events, URL hash and local-storage behavior.

- [ ] **Step 1: Write the failing tests**

```js
test('member form rerenders in English without changing login field IDs', () => {
  selectLanguage(document, 'en');
  PassengerMemberAuth.enhancePassengerMemberAuth(document);
  assert.match(textOf(section), /Member sign in/);
  assert.equal(section.querySelector('#member-login-account').id, 'member-login-account');
});

test('unfollow status uses selected-language copy and still removes stored record', () => {
  selectLanguage(document, 'ja');
  clickUnfollowButton(article);
  assert.match(textOf(section), /追跡/);
  assert.equal(readTrackedRecords().length, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/passenger-member-auth.test.cjs tests/passenger-case-unfollow.test.cjs`

Expected: FAIL because the enhancements currently create Traditional Chinese text.

- [ ] **Step 3: Write minimal implementation**

```js
function copy(key) {
  return window.PassengerI18n ? window.PassengerI18n.translate(key) : FALLBACK_COPY[key];
}
// Keep IDs, names, classes, event listeners and storage constants intact.
```

Use the shared copy helper for every user-visible label, action and status string. Call `PassengerI18n.apply(section)` after each enhancement render.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/passenger-member-auth.test.cjs tests/passenger-case-unfollow.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add assets/passenger-member-auth.js assets/passenger-case-unfollow.js tests/passenger-member-auth.test.cjs tests/passenger-case-unfollow.test.cjs
git commit -m "Localize dynamic passenger account controls"
```

### Task 3: Load the coordinator and translate compiled-page copy safely

**Files:**
- Modify: `index.html`
- Modify: `assets/passenger-i18n.js`
- Test: `tests/passenger-i18n.test.cjs`

**Interfaces:**
- Consumes: The compiled React DOM and language selector state.
- Produces: Localized visible text, `placeholder`, `aria-label`, `title`, `lang` and status text for the passenger surface without changing IDs, data attributes, values or event handlers.

- [ ] **Step 1: Write the failing test**

```js
test('apply localizes visible passenger text but preserves action attributes', () => {
  const action = appendPassengerButton(document, '案件追蹤');
  action.setAttribute('data-action', 'tracked-cases');
  PassengerI18n.apply(document, 'th');
  assert.equal(action.textContent, 'ติดตามเคส');
  assert.equal(action.getAttribute('data-action'), 'tracked-cases');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/passenger-i18n.test.cjs`

Expected: FAIL because `apply` does not yet translate DOM nodes.

- [ ] **Step 3: Write minimal implementation**

```js
function apply(root = document, language = getLanguage()) {
  root.querySelectorAll('[aria-label], [placeholder], [title], button, a, h1, h2, h3, p, span, label, option').forEach(localizeElement);
  document.documentElement.lang = LANGUAGE_META[language].lang;
}
```

Scope the selector to the passenger application root. Map only known complete source strings, never user-entered values, event IDs, station data or API content. Add the deferred coordinator script before dependent enhancement scripts in `index.html` and install an observer that reacts to language-chip clicks and DOM changes.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/passenger-i18n.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html assets/passenger-i18n.js tests/passenger-i18n.test.cjs
git commit -m "Synchronize passenger copy with selected language"
```

### Task 4: Verify parity at repository and browser boundaries

**Files:**
- Modify: `tests/passenger-i18n.test.cjs`

**Interfaces:**
- Consumes: The final `PassengerI18n` API and static page entry point.
- Produces: Regression coverage that prevents a new passenger copy key or language from silently becoming incomplete.

- [ ] **Step 1: Write the failing parity test**

```js
test('every language supplies exactly the required passenger copy keys', () => {
  const required = PassengerI18n.REQUIRED_KEYS;
  for (const language of PassengerI18n.SUPPORTED_LANGUAGES) {
    assert.deepEqual(Object.keys(PassengerI18n.COPY[language]).sort(), required.slice().sort());
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/passenger-i18n.test.cjs`

Expected: FAIL until the exported completeness contract is implemented.

- [ ] **Step 3: Write minimal implementation and verify static wiring**

```js
window.PassengerI18n = { COPY, REQUIRED_KEYS: Object.keys(COPY['zh-TW']), /* existing exports */ };
```

Run: `node --test tests/*.test.cjs && npm test --prefix local-api`

Expected: all static and local API tests pass.

- [ ] **Step 4: Browser smoke verification**

Start a local static server, select each of the nine languages, then verify that the passenger home, member login, case tracking, cancellation, feedback and return action remain operable without any network translation request.

- [ ] **Step 5: Commit**

```bash
git add tests/passenger-i18n.test.cjs
git commit -m "Guard multilingual passenger feature parity"
```

