const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributeMap = {};
    Object.defineProperty(this, 'attributes', {
      enumerable: true,
      get: () => this.attributeMap,
    });
    this.dataset = {};
    this.eventListeners = {};
    this.className = '';
    this.textContent = '';
    this.type = '';
    this.name = '';
    this.id = '';
    this.htmlFor = '';
    this.hidden = false;
    this.required = false;
    this.value = '';
    this.parentNode = null;
    if (this.tagName === 'SELECT') {
      Object.defineProperty(this, 'type', {
        enumerable: true,
        get: () => 'select-one',
      });
    }
  }

  append(...nodes) {
    nodes.forEach((node) => {
      if (node) {
        node.parentNode = this;
        this.children.push(node);
      }
    });
  }

  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }

  setAttribute(name, value) {
    this.attributeMap[name] = String(value);
    if (name === 'class') this.className = String(value);
    if (name === 'id') this.id = String(value);
  }

  getAttribute(name) {
    if (name === 'class') return this.className;
    if (name === 'id') return this.id;
    return this.attributeMap[name] || null;
  }

  addEventListener(type, handler) {
    this.eventListeners[type] = handler;
  }

  dispatchEvent(event) {
    const handler = this.eventListeners[event.type];
    if (handler) handler.call(this, event);
  }

  querySelector(selector) {
    return findAll(this, selector)[0] || null;
  }

  querySelectorAll(selector) {
    return findAll(this, selector);
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (matchesSelector(node, selector)) return node;
      node = node.parentNode;
    }
    return null;
  }
}

function createDocument(language = 'zh-TW') {
  const documentElement = new Element('html');
  documentElement.lang = language;
  const eventListeners = {};
  return {
    documentElement,
    createElement(tagName) {
      return new Element(tagName);
    },
    querySelector(selector) {
      return documentElement.querySelector(selector);
    },
    querySelectorAll(selector) {
      return documentElement.querySelectorAll(selector);
    },
    addEventListener(type, handler) {
      eventListeners[type] = handler;
    },
    dispatchEvent(event) {
      const handler = eventListeners[event.type];
      if (handler) handler.call(this, event);
    },
  };
}

function findAll(root, selector) {
  const selectors = selector.split(',').map((item) => item.trim());
  const matches = [];

  function visit(node) {
    if (selectors.some((item) => matchesSelector(node, item))) matches.push(node);
    node.children.forEach(visit);
  }

  root.children.forEach(visit);
  return matches;
}

function matchesSelector(node, selector) {
  if (selector === 'section') return node.tagName === 'SECTION';
  if (selector === 'nav') return node.tagName === 'NAV';
  if (selector === 'button') return node.tagName === 'BUTTON';
  if (selector === 'a') return node.tagName === 'A';
  if (selector.startsWith('#')) return node.id === selector.slice(1);
  if (selector.startsWith('.')) return node.className.split(/\s+/).includes(selector.slice(1));
  if (selector === '[data-member-auth]') return node.attributes['data-member-auth'] !== undefined;
  if (selector === '[aria-label="帳戶"]') return node.attributes['aria-label'] === '帳戶';
  if (selector === 'section[aria-label="帳戶"]') {
    return node.tagName === 'SECTION' && node.attributes['aria-label'] === '帳戶';
  }
  if (selector === 'button.mp-primary') {
    return node.tagName === 'BUTTON' && node.className.split(/\s+/).includes('mp-primary');
  }
  return false;
}

function textOf(node) {
  if (node.hidden) return '';
  return [node.textContent, ...node.children.map(textOf)].join('');
}

function findByText(root, selector, expectedText) {
  return root.querySelectorAll(selector).find((node) => textOf(node).includes(expectedText));
}

function loadEnhancer(document) {
  const script = fs.readFileSync(path.join(__dirname, '..', 'assets', 'passenger-member-auth.js'), 'utf8');
  const localeScript = fs.readFileSync(path.join(__dirname, '..', 'assets', 'passenger-runtime-locales.js'), 'utf8');
  const windowEvents = {};
  const windowObject = {
    location: { hash: '' },
    addEventListener(type, handler) {
      windowEvents[type] = handler;
    },
    dispatchEvent(event) {
      const handler = windowEvents[event.type];
      if (handler) handler.call(this, event);
    },
  };
  const context = {
    document,
    MutationObserver: class {
      observe() {}
    },
    window: windowObject,
  };
  vm.runInNewContext(localeScript, context);
  vm.runInNewContext(script, context);
  return context.window;
}

function appendLegacyMemberSection(document) {
  const section = document.createElement('section');
  section.setAttribute('aria-label', '帳戶');
  const summary = document.createElement('article');
  summary.className = 'mp-card mp-stack';
  summary.textContent = '會員票夾 3';
  const reset = document.createElement('button');
  reset.className = 'mp-secondary';
  reset.textContent = '設定友善轉乘偏好';
  const exit = document.createElement('button');
  exit.className = 'mp-primary';
  exit.textContent = '返回身分選擇';
  section.append(summary, reset, exit);
  document.documentElement.append(section);
  return { section, exit };
}

function appendNavigation(document, activeIndex, workspaceClass = 'mobile-app-public') {
  const workspace = document.createElement('main');
  workspace.className = workspaceClass;
  document.documentElement.append(workspace);

  const navigation = document.createElement('nav');
  for (let index = 0; index < 3; index += 1) {
    const button = document.createElement('button');
    button.setAttribute('aria-pressed', index === activeIndex ? 'true' : 'false');
    navigation.append(button);
  }
  navigation.className = 'mp-bottom-nav';
  workspace.append(navigation);
  return navigation;
}

test('replaces passenger account summary with login fields and keeps return action', () => {
  const document = createDocument();
  appendNavigation(document, 2);
  const section = document.createElement('section');
  section.setAttribute('aria-label', '帳戶');
  const summary = document.createElement('article');
  summary.className = 'mp-card mp-stack';
  summary.textContent = '可見事件 3';
  const reset = document.createElement('button');
  reset.className = 'mp-secondary';
  reset.textContent = '重設友善轉乘示範';
  const exit = document.createElement('button');
  exit.className = 'mp-primary';
  exit.textContent = '返回身分選擇';
  let exited = false;
  exit.addEventListener('click', () => {
    exited = true;
  });
  section.append(summary, reset, exit);
  document.documentElement.append(section);

  const memberAuth = loadEnhancer(document);
  memberAuth.PassengerMemberAuth.enhancePassengerMemberAuth(document);

  const visibleText = textOf(section);
  assert.match(visibleText, /會員登入/);
  assert.match(visibleText, /帳號/);
  assert.match(visibleText, /密碼/);
  assert.match(visibleText, /記住帳號/);
  assert.match(visibleText, /忘記密碼/);
  assert.match(visibleText, /建議會員每三個月定期更換密碼/);
  assert.doesNotMatch(visibleText, /可見事件/);
  assert.doesNotMatch(visibleText, /重設友善轉乘示範/);

  assert.equal(findByText(section, 'a', '加入會員').getAttribute('href'), '#member-join');
  memberAuth.location.hash = '#member-join';
  memberAuth.dispatchEvent({ type: 'hashchange' });
  const joinText = textOf(section);
  assert.match(joinText, /證號/);
  assert.match(joinText, /再次確認密碼/);
  assert.match(joinText, /姓名/);
  assert.match(joinText, /性別/);
  assert.match(joinText, /生日/);
  assert.match(joinText, /E-mail/);
  assert.match(joinText, /手機/);
  assert.match(joinText, /居住地/);
  assert.doesNotMatch(joinText, /忘記密碼/);

  findByText(section, 'button', '返回身分選擇').dispatchEvent({ type: 'click' });
  assert.equal(exited, true);
});

test('member auth uses active locale copy and falls back for unknown languages', () => {
  const document = createDocument('en');
  appendNavigation(document, 2);
  const { section } = appendLegacyMemberSection(document);
  section.className = 'mp-stack';
  section.setAttribute('aria-label', 'Account');
  section.children[0].textContent = 'Demo passenger account / Visible events 1';
  section.children[1].textContent = 'Reset friendly-transfer demo';
  section.children[2].textContent = 'Back to role select';

  loadEnhancer(document).PassengerMemberAuth.enhancePassengerMemberAuth(document);

  const visibleText = textOf(section);
  assert.match(visibleText, /Member login/);
  assert.match(visibleText, /Enter your member account and password\./);
  assert.match(visibleText, /Remember account/);
  assert.match(visibleText, /Forgot password/);
  assert.match(visibleText, /Return to identity selection/);
  assert.doesNotMatch(visibleText, /會員登入|記住帳號|忘記密碼/);

  const unknownDocument = createDocument('unknown');
  appendNavigation(unknownDocument, 2);
  const { section: fallbackSection } = appendLegacyMemberSection(unknownDocument);

  loadEnhancer(unknownDocument).PassengerMemberAuth.enhancePassengerMemberAuth(unknownDocument);

  const fallbackText = textOf(fallbackSection);
  assert.match(fallbackText, /會員登入/);
  assert.match(fallbackText, /記住帳號/);
  assert.match(fallbackText, /返回身分選擇/);
});

test('mounted member auth rerenders when the active language changes', () => {
  const document = createDocument('en');
  appendNavigation(document, 2);
  const { section } = appendLegacyMemberSection(document);
  const memberAuth = loadEnhancer(document).PassengerMemberAuth;

  memberAuth.enhancePassengerMemberAuth(document);
  assert.match(textOf(section), /Member login/);

  document.documentElement.lang = 'id';
  memberAuth.enhancePassengerMemberAuth(document);

  const visibleText = textOf(section);
  assert.match(visibleText, /Login anggota/);
  assert.match(visibleText, /Ingat akun/);
  assert.match(visibleText, /Kembali ke pilihan identitas/);
  assert.doesNotMatch(visibleText, /Member login|Remember account|會員登入/);
});

test('member auth renders representative locale-specific copy for placeholder-prone languages', () => {
  for (const [language, expectedText] of [
    ['nan', '會員登入'],
    ['hak', '會員登入'],
    ['ja', '会員ログイン'],
    ['ko', '회원 로그인'],
    ['vi', 'Đăng nhập hội viên'],
    ['th', 'เข้าสู่ระบบสมาชิก'],
  ]) {
    const document = createDocument(language);
    appendNavigation(document, 2);
    const { section } = appendLegacyMemberSection(document);

    loadEnhancer(document).PassengerMemberAuth.enhancePassengerMemberAuth(document);

    const visibleText = textOf(section);
    assert.match(visibleText, new RegExp(expectedText));
    assert.doesNotMatch(visibleText, new RegExp(`Member ${language}`));
  }
});

test('replaces the old account page even when its aria label differs from the title', () => {
  const document = createDocument();
  appendNavigation(document, 2);
  const section = document.createElement('section');
  section.setAttribute('aria-label', '我的');
  const header = document.createElement('div');
  header.className = 'mp-hero-block';
  header.textContent = '帳戶示範重設與返回入口';
  const summary = document.createElement('article');
  summary.className = 'mp-card mp-stack';
  summary.textContent = '民眾示範帳號新北捷運 / 民眾服務可見事件 1';
  const reset = document.createElement('button');
  reset.className = 'mp-secondary';
  reset.textContent = '重設友善轉乘示範';
  const exit = document.createElement('button');
  exit.className = 'mp-primary';
  exit.textContent = '返回身分選擇';
  section.append(header, summary, reset, exit);
  document.documentElement.append(section);

  loadEnhancer(document).PassengerMemberAuth.enhancePassengerMemberAuth(document);

  const visibleText = textOf(section);
  assert.match(visibleText, /會員登入/);
  assert.match(visibleText, /帳號/);
  assert.doesNotMatch(visibleText, /民眾示範帳號/);
  assert.doesNotMatch(visibleText, /重設友善轉乘示範/);
});

test('does not replace a service page when the member navigation tab is inactive', () => {
  const document = createDocument('zh-TW');
  appendNavigation(document, 0);

  const servicePage = document.createElement('section');
  servicePage.className = 'mp-stack';
  servicePage.setAttribute('aria-label', '遺失物協尋');

  const form = document.createElement('article');
  form.className = 'mp-card';
  form.textContent = '遺失物搜尋表單';

  const back = document.createElement('button');
  back.className = 'mp-secondary';
  back.textContent = '返回';

  const search = document.createElement('button');
  search.className = 'mp-primary';
  search.textContent = '搜尋可能相符物品';

  servicePage.append(form, back, search);
  document.documentElement.append(servicePage);

  const memberAuth = loadEnhancer(document);
  const enhanced = memberAuth.PassengerMemberAuth.enhancePassengerMemberAuth(document);

  assert.equal(enhanced, false);
  assert.equal(servicePage.querySelector('[data-member-auth]'), null);
  assert.match(textOf(servicePage), /遺失物搜尋表單/);

  memberAuth.location.hash = '#member-join';
  memberAuth.dispatchEvent({ type: 'hashchange' });

  assert.equal(servicePage.querySelector('[data-member-auth]'), null);
  assert.match(textOf(servicePage), /遺失物搜尋表單/);
});

test('does not replace the station staff account page with passenger member login', () => {
  const document = createDocument('zh-TW');
  appendNavigation(document, 2, 'mobile-app-staff');

  const section = document.createElement('section');
  section.className = 'mp-stack';
  section.setAttribute('aria-label', '帳戶');

  const account = document.createElement('article');
  account.className = 'mp-card mp-stack';
  account.textContent = '板橋站務';

  const reset = document.createElement('button');
  reset.className = 'mp-secondary';
  reset.textContent = '重設友善轉乘示範';

  const exit = document.createElement('button');
  exit.className = 'mp-primary';
  exit.textContent = '返回身分選擇';

  section.append(account, reset, exit);
  document.documentElement.append(section);

  const memberAuth = loadEnhancer(document);
  const enhanced = memberAuth.PassengerMemberAuth.enhancePassengerMemberAuth(document);

  assert.equal(enhanced, false);
  assert.equal(section.querySelector('[data-member-auth]'), null);
  assert.match(textOf(section), /板橋站務/);

  memberAuth.location.hash = '#member-join';
  memberAuth.dispatchEvent({ type: 'hashchange' });

  assert.equal(section.querySelector('[data-member-auth]'), null);
  assert.match(textOf(section), /板橋站務/);
});
