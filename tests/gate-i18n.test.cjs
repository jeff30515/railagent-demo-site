const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const gateCss = fs.readFileSync(path.join(__dirname, '..', 'assets', 'gate-i18n.css'), 'utf8');

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.ownerDocument = null;
    this.attributeMap = {};
    this.dataset = {};
    this.className = '';
    this.textContent = '';
    this.eventListeners = {};
  }

  append(...nodes) {
    nodes.forEach((node) => {
      if (!node) return;
      node.parentNode = this;
      node.ownerDocument = this.ownerDocument;
      this.children.push(node);
    });
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  setAttribute(name, value) {
    const nextValue = String(value);
    this.attributeMap[name] = nextValue;
    if (name === 'class') this.className = nextValue;
    if (name.startsWith('data-')) {
      const key = name
        .slice(5)
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      this.dataset[key] = nextValue;
    }
  }

  getAttribute(name) {
    if (name === 'class') return this.className || null;
    return Object.prototype.hasOwnProperty.call(this.attributeMap, name) ? this.attributeMap[name] : null;
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
  const document = {
    eventListeners: {},
    documentElement: null,
    body: null,
    createElement(tagName) {
      const node = new Element(tagName);
      node.ownerDocument = this;
      return node;
    },
    querySelector(selector) {
      return this.documentElement.querySelector(selector);
    },
    querySelectorAll(selector) {
      return this.documentElement.querySelectorAll(selector);
    },
    addEventListener(type, handler) {
      this.eventListeners[type] = handler;
    },
    dispatchEvent(event) {
      const handler = this.eventListeners[event.type];
      if (handler) handler.call(this, event);
    },
  };
  document.documentElement = document.createElement('html');
  document.body = document.createElement('body');
  document.documentElement.append(document.body);
  return document;
}

function classList(node) {
  return (node.className || '').split(/\s+/).filter(Boolean);
}

function matchesSimpleSelector(node, selector) {
  if (!node || node.tagName === undefined) return false;
  const classMatches = selector.match(/\.[a-zA-Z0-9_-]+/g) || [];
  for (const className of classMatches) {
    if (!classList(node).includes(className.slice(1))) return false;
  }
  const tag = selector.match(/^[a-zA-Z][a-zA-Z0-9-]*/);
  if (tag && node.tagName !== tag[0].toUpperCase()) return false;
  if (selector.includes('[aria-pressed="true"]') && node.getAttribute('aria-pressed') !== 'true') return false;
  if (selector.includes('[data-gate-i18n-tagline]') && node.getAttribute('data-gate-i18n-tagline') === null) return false;
  return true;
}

function matchesSelector(node, selector) {
  const selectors = selector.split(',').map((item) => item.trim());
  return selectors.some((candidate) => {
    const parts = candidate.split(/\s+/).filter(Boolean);
    let current = node;
    for (let index = parts.length - 1; index >= 0; index -= 1) {
      while (current && !matchesSimpleSelector(current, parts[index])) {
        current = current.parentNode;
      }
      if (!current) return false;
      current = current.parentNode;
    }
    return true;
  });
}

function findAll(root, selector) {
  const matches = [];
  function visit(node) {
    if (matchesSelector(node, selector)) matches.push(node);
    node.children.forEach(visit);
  }
  visit(root);
  return matches;
}

function loadGateI18n(document, options = {}) {
  const script = fs.readFileSync(path.join(__dirname, '..', 'assets', 'gate-i18n.js'), 'utf8');
  const observers = [];
  class MutationObserver {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe(target, config) {
      this.target = target;
      this.config = config;
    }
  }
  const window = {
    document,
    MutationObserver,
    setTimeout(callback) {
      callback();
    },
    localStorage: {
      getItem(key) {
        return options.storage && options.storage[key] ? options.storage[key] : null;
      },
      setItem() {},
    },
  };
  const context = { window, document, MutationObserver };
  vm.runInNewContext(script, context);
  return { gateI18n: context.window.GateI18n, observers };
}

function buildGateDocument(activeLanguage = 'en') {
  const document = createDocument();
  const main = document.createElement('main');
  main.className = 'mobile-app mobile-product mp-phase-gate';
  main.setAttribute('aria-label', 'RailAgent App 入口');
  const gate = document.createElement('div');
  gate.className = 'mp-gate';
  const hero = document.createElement('header');
  hero.className = 'mp-gate-hero';
  const logo = document.createElement('p');
  logo.className = 'mp-logo-word';
  logo.textContent = 'RailAgent';
  const heading = document.createElement('h1');
  heading.textContent = '旅途中的服務夥伴';
  hero.append(logo, heading);

  const langBar = document.createElement('div');
  langBar.className = 'mp-lang-bar';
  langBar.setAttribute('aria-label', '語言友善 · 選擇介面語言');
  const kicker = document.createElement('span');
  kicker.className = 'mp-lang-kicker';
  kicker.textContent = 'Language';
  const langRow = document.createElement('div');
  langRow.className = 'mp-lang-row mp-lang-row-wrap';
  const labels = ['繁體中文', '臺語', '客語', 'English', '日本語', '한국어', 'Tiếng Việt', 'Bahasa Indonesia', 'ภาษาไทย'];
  const values = ['zh-TW', 'nan', 'hak', 'en', 'ja', 'ko', 'vi', 'id', 'th'];
  values.forEach((value, index) => {
    const chip = document.createElement('button');
    chip.className = value === activeLanguage ? 'mp-lang-chip active' : 'mp-lang-chip';
    chip.setAttribute('aria-pressed', value === activeLanguage ? 'true' : 'false');
    chip.setAttribute('aria-label', labels[index]);
    chip.textContent = labels[index];
    langRow.append(chip);
  });
  langBar.append(kicker, langRow);

  const cards = document.createElement('div');
  cards.className = 'mp-gate-cards';
  const passenger = document.createElement('button');
  passenger.className = 'mp-gate-card-img passenger';
  passenger.setAttribute('aria-label', '我是旅客');
  const passengerImage = document.createElement('img');
  passengerImage.setAttribute('src', '/railagent-demo-site/gate/card-passenger.png?v=20260710e');
  passengerImage.setAttribute('alt', '我是旅客 Passenger');
  let passengerClicks = 0;
  passenger.addEventListener('click', () => {
    passengerClicks += 1;
  });
  passenger.append(passengerImage);
  const staff = document.createElement('button');
  staff.className = 'mp-gate-card-img staff';
  staff.setAttribute('aria-label', '站務／主管');
  const staffImage = document.createElement('img');
  staffImage.setAttribute('src', '/railagent-demo-site/gate/card-staff.png?v=20260710e');
  staffImage.setAttribute('alt', '站務 / 主管 Station Staff / Supervisor');
  staff.append(staffImage);
  cards.append(passenger, staff);

  const footer = document.createElement('div');
  footer.className = 'mp-gate-footer';
  const product = document.createElement('strong');
  product.textContent = 'RailAgent';
  const version = document.createElement('span');
  version.textContent = 'v2025.3.2 · English';
  footer.append(product, version);

  const access = document.createElement('div');
  access.className = 'mp-access-footer';
  access.setAttribute('aria-label', '無障礙模式');
  const hearing = document.createElement('button');
  hearing.className = 'mp-access-btn hearing';
  hearing.setAttribute('aria-label', '聽障友善 · 文字／視覺提醒優先');
  hearing.setAttribute('title', '聽障友善 · 文字／視覺提醒優先（再按一次取消）');
  const hearingText = document.createElement('span');
  hearingText.className = 'mp-access-btn-text';
  const hearingLabel = document.createElement('strong');
  hearingLabel.textContent = '聽障友善';
  const hearingHint = document.createElement('small');
  hearingHint.textContent = '文字／視覺優先';
  hearingText.append(hearingLabel, hearingHint);
  hearing.append(hearingText);
  const vision = document.createElement('button');
  vision.className = 'mp-access-btn vision';
  vision.setAttribute('aria-label', '視障友善 · 語音導讀（盲人模式）');
  vision.setAttribute('title', '視障友善 · 語音導讀（再按一次取消）');
  const visionText = document.createElement('span');
  visionText.className = 'mp-access-btn-text';
  const visionLabel = document.createElement('strong');
  visionLabel.textContent = '視障友善';
  const visionHint = document.createElement('small');
  visionHint.textContent = '語音導讀';
  visionText.append(visionLabel, visionHint);
  vision.append(visionText);
  access.append(hearing, vision);

  gate.append(hero, langBar, cards, footer, access);
  main.append(gate);
  document.body.append(main);
  return { document, main, langRow, passenger, passengerImage, staff, staffImage, getPassengerClicks: () => passengerClicks };
}

test('gate i18n publishes complete copy and fixed short labels for every supported language', () => {
  const { gateI18n } = loadGateI18n(createDocument());
  const expectedLanguages = ['zh-TW', 'nan', 'hak', 'en', 'ja', 'ko', 'vi', 'id', 'th'];
  const expectedShortLabels = ['繁中', '台語', '客家語', 'EN', '日本語', '한국어', 'VI', 'ID', 'TH'];

  assert.deepEqual(Array.from(gateI18n.SUPPORTED_LANGUAGES), expectedLanguages);
  assert.deepEqual(expectedLanguages.map((language) => gateI18n.getLanguageOption(language).short), expectedShortLabels);

  for (const language of expectedLanguages) {
    const copy = gateI18n.COPY[language];
    assert.equal(typeof copy.title, 'string');
    assert.equal(typeof copy.tagline, 'string');
    assert.equal(typeof copy.languageKicker, 'string');
    assert.equal(typeof copy.langAria, 'string');
    assert.equal(typeof copy.accessAria, 'string');
    assert.equal(typeof copy.hearingLabel, 'string');
    assert.equal(typeof copy.hearingHint, 'string');
    assert.equal(typeof copy.visionLabel, 'string');
    assert.equal(typeof copy.visionHint, 'string');
    assert.equal(typeof copy.footerProduct, 'string');
    assert.equal(typeof copy.version, 'string');
    assert.notEqual(copy.title, '');
    assert.notEqual(copy.tagline, '');
  }
});

test('gate language chips use centered two-row flex wrapping instead of a three-column grid', () => {
  assert.match(gateCss, /\.mp-lang-row\.mp-lang-row-fixed\s*\{[^}]*display:\s*flex;/s);
  assert.match(gateCss, /\.mp-lang-row\.mp-lang-row-fixed\s*\{[^}]*flex-wrap:\s*wrap;/s);
  assert.match(gateCss, /\.mp-lang-row\.mp-lang-row-fixed\s*\{[^}]*justify-content:\s*center;/s);
  assert.match(gateCss, /\.mp-lang-row\.mp-lang-row-fixed\s*\{[^}]*max-height:\s*calc\(\(2 \* var\(--mp-lang-chip-height\)\) \+ 0\.4rem\);/s);
  assert.doesNotMatch(gateCss, /grid-template-columns:\s*repeat\(3/);
});

test('gate i18n localizes non-image gate text and keeps image role cards intact', () => {
  const fixture = buildGateDocument('en');
  const { gateI18n } = loadGateI18n(fixture.document);

  assert.equal(typeof gateI18n.apply(fixture.document.body, 'en'), 'boolean');

  assert.equal(fixture.main.getAttribute('aria-label'), 'RailAgent app entry');
  assert.equal(fixture.document.querySelector('.mp-gate-hero h1').textContent, 'Choose your role');
  assert.equal(fixture.document.querySelector('[data-gate-i18n-tagline]').textContent, 'Station help that follows your language and accessibility needs.');
  assert.equal(fixture.document.querySelector('.mp-lang-kicker').textContent, 'Language');
  assert.equal(fixture.document.querySelector('.mp-lang-bar').getAttribute('aria-label'), 'Language friendly · choose interface language');
  assert.deepEqual(
    fixture.langRow.querySelectorAll('.mp-lang-chip').map((chip) => ({
      text: chip.textContent,
      lang: chip.getAttribute('data-lang'),
      label: chip.getAttribute('aria-label'),
    })),
    [
      { text: '繁中', lang: 'zh-TW', label: 'Traditional Chinese' },
      { text: '台語', lang: 'nan', label: 'Taiwanese' },
      { text: '客家語', lang: 'hak', label: 'Hakka' },
      { text: 'EN', lang: 'en', label: 'English' },
      { text: '日本語', lang: 'ja', label: 'Japanese' },
      { text: '한국어', lang: 'ko', label: 'Korean' },
      { text: 'VI', lang: 'vi', label: 'Vietnamese' },
      { text: 'ID', lang: 'id', label: 'Indonesian' },
      { text: 'TH', lang: 'th', label: 'Thai' },
    ],
  );
  assert.match(fixture.langRow.className, /\bmp-lang-row-fixed\b/);

  assert.equal(fixture.passenger.children[0], fixture.passengerImage);
  assert.equal(fixture.passengerImage.getAttribute('src'), '/railagent-demo-site/gate/card-passenger.png?v=20260710e');
  assert.equal(fixture.passengerImage.getAttribute('alt'), '我是旅客 Passenger');
  assert.equal(fixture.passenger.getAttribute('aria-label'), '我是旅客');
  fixture.passenger.dispatchEvent({ type: 'click' });
  assert.equal(fixture.getPassengerClicks(), 1);
  assert.equal(fixture.staff.children[0], fixture.staffImage);
  assert.equal(fixture.staff.getAttribute('aria-label'), '站務／主管');

  assert.equal(fixture.document.querySelector('.mp-access-footer').getAttribute('aria-label'), 'Accessibility mode');
  assert.equal(fixture.document.querySelector('.mp-access-btn.hearing').getAttribute('aria-label'), 'Hearing friendly · prioritize text and visual alerts');
  assert.equal(fixture.document.querySelector('.mp-access-btn.hearing strong').textContent, 'Hearing friendly');
  assert.equal(fixture.document.querySelector('.mp-access-btn.hearing small').textContent, 'Text and visual first');
  assert.equal(fixture.document.querySelector('.mp-access-btn.vision').getAttribute('aria-label'), 'Vision friendly · voice guidance');
  assert.equal(fixture.document.querySelector('.mp-access-btn.vision strong').textContent, 'Vision friendly');
  assert.equal(fixture.document.querySelector('.mp-access-btn.vision small').textContent, 'Voice guidance');
  assert.equal(fixture.document.querySelector('.mp-gate-footer strong').textContent, 'RailAgent');
  assert.equal(fixture.document.querySelector('.mp-gate-footer span').textContent, 'v2025.3.2 · English');
});

test('gate i18n detects every active chip language and reapplies after redraws', () => {
  const expectedTitles = {
    'zh-TW': '選擇你的身分',
    nan: '揀你的身分',
    hak: '選擇你的身分',
    en: 'Choose your role',
    ja: '役割を選択',
    ko: '역할 선택',
    vi: 'Chọn vai trò',
    id: 'Pilih peran',
    th: 'เลือกบทบาทของคุณ',
  };

  for (const [language, title] of Object.entries(expectedTitles)) {
    const fixture = buildGateDocument(language);
    const { gateI18n } = loadGateI18n(fixture.document);
    assert.equal(gateI18n.getLanguage(fixture.document.body), language);
    gateI18n.apply(fixture.document.body);
    assert.equal(fixture.document.querySelector('.mp-gate-hero h1').textContent, title);
  }

  const originalChipLabels = [
    ['繁體中文', 'zh-TW'],
    ['臺語', 'nan'],
    ['客語', 'hak'],
    ['English', 'en'],
    ['日本語', 'ja'],
    ['한국어', 'ko'],
    ['Tiếng Việt', 'vi'],
    ['Bahasa Indonesia', 'id'],
    ['ภาษาไทย', 'th'],
  ];
  for (const [label, language] of originalChipLabels) {
    const document = createDocument();
    const { gateI18n } = loadGateI18n(document);
    const chip = document.createElement('button');
    chip.className = 'mp-lang-chip active';
    chip.setAttribute('aria-pressed', 'true');
    chip.setAttribute('aria-label', label);
    chip.textContent = label;
    document.body.append(chip);
    assert.equal(gateI18n.getLanguage(document.body), language);
  }

  const fixture = buildGateDocument('ja');
  const { gateI18n, observers } = loadGateI18n(fixture.document);
  assert.equal(gateI18n.observe(), true);
  const heading = fixture.document.querySelector('.mp-gate-hero h1');
  heading.textContent = '旅途中的服務夥伴';
  observers[0].callback([{ type: 'childList' }]);
  assert.equal(heading.textContent, '役割を選択');
});
