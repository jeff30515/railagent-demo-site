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

function createDocument() {
  const documentElement = new Element('html');
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
  return [node.textContent, ...node.children.map(textOf)].join('');
}

function findByText(root, selector, expectedText) {
  return root.querySelectorAll(selector).find((node) => textOf(node).includes(expectedText));
}

function createPassengerI18n(language) {
  const copy = {
    en: {
      'member.login': 'Member Sign In',
      'member.loginLead': 'Enter your member account and password.',
      'member.account': 'Account',
      'member.password': 'Password',
      'member.remember': 'Remember Account',
      'member.forgotPassword': 'Forgot Password',
      'member.loginHint':
        'Members should change passwords every three months. Use 8-12 characters with at least one letter and one number.',
      'member.loginDemoStatus': 'This member sign-in demo is not connected to real authentication.',
      'member.forgotPasswordDemoStatus': 'This forgot-password demo does not provide online reset yet.',
      'member.join': 'Join as Member',
      'member.joinLead': 'Fill in the basic details to create a member account.',
      'member.id': 'ID Number',
      'member.passwordConfirm': 'Confirm Password Again',
      'member.name': 'Name',
      'member.gender': 'Gender',
      'member.genderMale': 'Male',
      'member.genderFemale': 'Female',
      'member.birthday': 'Birthday',
      'member.email': 'E-mail',
      'member.mobile': 'Mobile',
      'member.residence': 'Residence',
      'member.joinDemoStatus': 'This member registration demo has not saved personal data.',
      'member.returnToGate': 'Back to Role Selection',
      'member.functions': 'Member Functions',
    },
  };

  return {
    applyCalls: [],
    translate(key) {
      return copy[language][key] || key;
    },
    apply(section) {
      this.applyCalls.push(section);
      return true;
    },
  };
}

function loadEnhancer(document, passengerI18n) {
  const script = fs.readFileSync(path.join(__dirname, '..', 'assets', 'passenger-member-auth.js'), 'utf8');
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
    window: {
      ...windowObject,
      PassengerI18n: passengerI18n,
    },
  };
  vm.runInNewContext(script, context);
  return context.window;
}

test('renders member login form with English i18n while retaining login account id', () => {
  const document = createDocument();
  const section = document.createElement('section');
  section.setAttribute('aria-label', '\u5e33\u6236');
  const summary = document.createElement('article');
  summary.className = 'mp-card mp-stack';
  summary.textContent = '\u53ef\u898b\u4e8b\u4ef6 3';
  const reset = document.createElement('button');
  reset.className = 'mp-secondary';
  reset.textContent = '\u91cd\u8a2d\u53cb\u5584\u8f49\u4e58\u793a\u7bc4';
  const exit = document.createElement('button');
  exit.className = 'mp-primary';
  exit.textContent = '\u8fd4\u56de\u8eab\u5206\u9078\u64c7';
  section.append(summary, reset, exit);
  document.documentElement.append(section);
  const passengerI18n = createPassengerI18n('en');

  loadEnhancer(document, passengerI18n).PassengerMemberAuth.enhancePassengerMemberAuth(document);

  const visibleText = textOf(section);
  assert.match(visibleText, /Member Sign In/);
  assert.match(visibleText, /Enter your member account and password\./);
  assert.match(visibleText, /Account/);
  assert.match(visibleText, /Password/);
  assert.match(visibleText, /Remember Account/);
  assert.match(visibleText, /Forgot Password/);
  assert.match(visibleText, /Back to Role Selection/);
  assert.ok(section.querySelector('#member-login-account'));
  assert.equal(section.querySelector('#member-login-account').name, 'member-login-account');
  assert.equal(passengerI18n.applyCalls[0], section);
});

test('replaces passenger account summary with login fields and keeps return action', () => {
  const document = createDocument();
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

test('replaces the old account page even when its aria label differs from the title', () => {
  const document = createDocument();
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
