const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const locales = require('../assets/passenger-runtime-locales.js');

const enhancer = fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'lost-found-local-api.js'),
  'utf8',
);
const indexHtml = fs.readFileSync(
  path.join(__dirname, '..', 'index.html'),
  'utf8',
);
const applicationBundle = fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'index-lostitem-talkback.js'),
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
  /passenger-runtime-locales\.js\?v=20260726-nine-language-parity-8/,
  'The entry page should force browsers to fetch the shared passenger locale module.',
);
assert.match(
  indexHtml,
  /lost-found-local-api\.js\?v=20260726-nine-language-parity-8/,
  'The entry page should force browsers to fetch the canonical passenger runtime.',
);
assert.match(
  indexHtml,
  /facility-report-feedback\.js\?v=20260726-nine-language-parity-8/,
  'The entry page should force browsers to fetch the updated facility feedback runtime.',
);
assert.match(
  indexHtml,
  /passenger-member-auth\.js\?v=20260726-nine-language-parity-8/,
  'The entry page should force browsers to fetch the updated member auth runtime.',
);
assert.match(
  indexHtml,
  /passenger-case-unfollow\.js\?v=20260726-nine-language-parity-8/,
  'The entry page should force browsers to fetch the updated case action runtime.',
);
const localeScriptIndex = indexHtml.indexOf('passenger-runtime-locales.js');
const canonicalRuntimeIndex = indexHtml.indexOf('lost-found-local-api.js');
const facilityRuntimeIndex = indexHtml.indexOf('facility-report-feedback.js');
const memberRuntimeIndex = indexHtml.indexOf('passenger-member-auth.js');
const caseRuntimeIndex = indexHtml.indexOf('passenger-case-unfollow.js');

assert.ok(localeScriptIndex >= 0, 'The shared passenger locale module must be loaded.');
assert.ok(localeScriptIndex < canonicalRuntimeIndex);
assert.ok(localeScriptIndex < facilityRuntimeIndex);
assert.ok(localeScriptIndex < memberRuntimeIndex);
assert.ok(localeScriptIndex < caseRuntimeIndex);
assert.match(
  indexHtml,
  /index-lostitem-talkback\.js\?v=20260726-nine-language-parity-8/,
  'The React application bundle must be cache-busted with the passenger runtime.',
);
assert.doesNotMatch(
  indexHtml,
  /passenger-i18n\.js|gate-i18n\.js|gate-i18n\.css/,
  'The obsolete multilingual overlays must not be loaded beside the canonical runtime.',
);
assert.doesNotMatch(
  applicationBundle,
  /className:"mp-primary",onClick:\(\)=>o\("friendly"\),children:b\.quickHelp/,
  'The React-owned passenger home must not render the obsolete quick-help action.',
);
assert.doesNotMatch(
  applicationBundle,
  /className:"mp-secondary",onClick:\(\)=>o\("more"\),children:b\.moreServices/,
  'The React-owned passenger home must not render the obsolete more-services action.',
);

assert.ok(
  locales.getRuntimeCopy('zh-TW').trackItem,
  'Every local-AI candidate should offer tracking.',
);
assert.ok(
  locales.getRuntimeCopy('zh-TW').tracking,
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
assert.match(
  enhancer,
  /EVT-2026-BQ-0187/,
  'The obsolete fixed backpack case should be removed by its stable event ID.',
);
assert.ok(
  locales.getRuntimeCopy('zh-TW').feedback && !enhancer.includes(String.raw`\u670d\u52d9\u56de\u994b\uff08\u9589\u74b0\uff09`),
  'The public feedback heading should omit the closed-loop suffix.',
);
assert.ok(
  enhancer.includes("feedbackArticle.querySelector('p')?.remove()"),
  'The obsolete event-directory note should be removed from the rendered feedback card.',
);
assert.match(
  enhancer,
  /RailAgentPassengerRuntimeLocales/,
  'The canonical runtime should obtain copy from the shared nine-language locale module.',
);
assert.match(
  enhancer,
  /\[data-service-page="lost-item"\]/,
  'Lost-item search should be identified by its stable page marker.',
);
assert.match(
  enhancer,
  /sourceLink\.closest\('p'\)\?\.remove\(\)/,
  'The localized TRA source notice should be removed by structure.',
);
assert.doesNotMatch(
  enhancer,
  /text\.includes\('\\u793a\\u7bc4\\u8cc7\\u6599\\u4f9d\\u7167'\)/,
  'Source-notice removal must not depend on Traditional Chinese text.',
);
assert.doesNotMatch(
  enhancer,
  /pageLabels\.friendlyTitle/,
  'Friendly-transfer page discovery must not depend on localized heading text.',
);
assert.doesNotMatch(
  enhancer,
  /passengerHome\?\.children.*button\.mp-primary.*button\.mp-secondary.*remove\(\)/s,
  'The enhancer must not delete React-owned home nodes and trigger a removeChild crash.',
);

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributeMap = {};
    this.dataset = {};
    this.eventListeners = {};
    this._textContent = '';
    this.id = '';
    this.className = '';
    this.hidden = false;
    this.value = '';
    this.disabled = false;
    this.innerHTMLSetCount = 0;
    Object.defineProperty(this, 'attributes', {
      enumerable: true,
      get: () => this.attributeMap,
    });
    Object.defineProperty(this, 'offsetParent', {
      enumerable: true,
      get: () => (this.hidden ? null : this.parentNode || {}),
    });
    Object.defineProperty(this, 'parentElement', {
      enumerable: true,
      get: () => this.parentNode,
    });
  }

  get textContent() {
    return [this._textContent, ...this.children.map((child) => child.textContent)].join('');
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  get innerHTML() {
    return this.children.map((child) => child.outerHTML).join('');
  }

  set innerHTML(value) {
    this.innerHTMLSetCount += 1;
    this.children = [];
    this._textContent = '';
    parseHtmlInto(this, String(value));
  }

  get outerHTML() {
    const attrs = Object.entries(this.attributeMap).map(([key, value]) => ` ${key}="${value}"`).join('');
    return `<${this.tagName.toLowerCase()}${attrs}>${this._textContent}${this.children.map((child) => child.outerHTML).join('')}</${this.tagName.toLowerCase()}>`;
  }

  append(...nodes) {
    nodes.forEach((node) => {
      if (!node) return;
      node.parentNode = this;
      this.children.push(node);
    });
  }

  appendChild(node) {
    this.append(node);
    return node;
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  replaceChildren(...nodes) {
    this.children = [];
    this._textContent = '';
    this.append(...nodes);
  }

  insertAdjacentElement(position, element) {
    if (position === 'afterend' && this.parentNode) {
      const index = this.parentNode.children.indexOf(this);
      element.parentNode = this.parentNode;
      this.parentNode.children.splice(index + 1, 0, element);
      return element;
    }
    this.append(element);
    return element;
  }

  setAttribute(name, value) {
    const stringValue = String(value);
    this.attributeMap[name] = stringValue;
    if (name === 'id') this.id = stringValue;
    if (name === 'class') this.className = stringValue;
    if (name === 'href') this.href = stringValue;
    if (name.startsWith('data-')) this.dataset[dataKey(name)] = stringValue;
  }

  getAttribute(name) {
    if (name === 'id') return this.id || null;
    if (name === 'class') return this.className || null;
    return this.attributeMap[name] ?? null;
  }

  addEventListener(type, handler) {
    this.eventListeners[type] = this.eventListeners[type] || [];
    this.eventListeners[type].push(handler);
  }

  dispatchEvent(event) {
    event.target = event.target || this;
    (this.eventListeners[event.type] || []).forEach((handler) => handler.call(this, event));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    return findAll(this, selector);
  }

  matches(selector) {
    return matchesSelector(this, selector);
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (matchesSelector(node, selector)) return node;
      node = node.parentNode;
    }
    return null;
  }

  focus() {}
}

function dataKey(name) {
  return name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function parseHtmlInto(parent, html) {
  const stack = [parent];
  const pattern = /<\/?([a-z0-9-]+)([^>]*)>|([^<]+)/gi;
  let match;
  while ((match = pattern.exec(html))) {
    if (match[3]) {
      stack[stack.length - 1]._textContent += match[3];
      continue;
    }
    const [source, tagName, attrSource] = match;
    if (source.startsWith('</')) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const element = new Element(tagName);
    const attrPattern = /([:\w-]+)(?:="([^"]*)")?/g;
    let attr;
    while ((attr = attrPattern.exec(attrSource))) {
      element.setAttribute(attr[1], attr[2] ?? '');
    }
    stack[stack.length - 1].append(element);
    if (!source.endsWith('/>') && !['input', 'br', 'hr', 'img', 'meta', 'link'].includes(tagName.toLowerCase())) {
      stack.push(element);
    }
  }
}

function createDocument(language = 'en') {
  const documentElement = new Element('html');
  documentElement.lang = language;
  const head = new Element('head');
  const body = new Element('body');
  documentElement.append(head, body);
  const eventListeners = {};
  return {
    documentElement,
    head,
    body,
    createElement(tagName) {
      return new Element(tagName);
    },
    getElementById(id) {
      return this.querySelector(`#${id}`);
    },
    querySelector(selector) {
      return documentElement.querySelector(selector);
    },
    querySelectorAll(selector) {
      return documentElement.querySelectorAll(selector);
    },
    addEventListener(type, handler) {
      eventListeners[type] = eventListeners[type] || [];
      eventListeners[type].push(handler);
    },
    dispatchEvent(event) {
      (eventListeners[event.type] || []).forEach((handler) => handler.call(this, event));
    },
  };
}

function findAll(root, selector) {
  return selector.split(',').flatMap((part) => findSingle(root, part.trim()));
}

function findSingle(root, selector) {
  if (selector.startsWith(':scope > ')) {
    const childSelector = selector.slice(':scope > '.length);
    return root.children.filter((child) => matchesSelector(child, childSelector));
  }
  const parts = selector.split(/\s+/).filter(Boolean);
  const all = descendants(root);
  if (parts.length === 1) return all.filter((node) => matchesSelector(node, parts[0]));
  const leaf = parts.at(-1);
  const ancestors = parts.slice(0, -1);
  return all.filter((node) => {
    if (!matchesSelector(node, leaf)) return false;
    let cursor = node.parentNode;
    for (let index = ancestors.length - 1; index >= 0; index -= 1) {
      while (cursor && !matchesSelector(cursor, ancestors[index])) cursor = cursor.parentNode;
      if (!cursor) return false;
      cursor = cursor.parentNode;
    }
    return true;
  });
}

function descendants(root) {
  const results = [];
  function visit(node) {
    node.children.forEach((child) => {
      results.push(child);
      visit(child);
    });
  }
  visit(root);
  return results;
}

function matchesSelector(node, selector) {
  if (!selector) return false;
  const id = selector.match(/#([\w-]+)/)?.[1];
  if (id && node.id !== id) return false;
  const tag = selector.match(/^[a-z][\w-]*/i)?.[0];
  if (tag && node.tagName !== tag.toUpperCase()) return false;
  for (const className of [...selector.matchAll(/\.([\w-]+)/g)].map((item) => item[1])) {
    if (!node.className.split(/\s+/).includes(className)) return false;
  }
  for (const attr of selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)) {
    const actual = node.getAttribute(attr[1]);
    if (attr[2] === undefined) {
      if (actual === null) return false;
    } else if (actual !== attr[2]) {
      return false;
    }
  }
  return Boolean(tag || id || selector.includes('.') || selector.includes('['));
}

function click(document, target) {
  const event = {
    type: 'click',
    target,
    defaultPrevented: false,
    immediatePropagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopImmediatePropagation() {
      this.immediatePropagationStopped = true;
    },
  };
  document.dispatchEvent(event);
  return event;
}

function loadPassengerRuntime(document, fetchImpl = async () => ({ ok: true, json: async () => ({ candidates: [] }) })) {
  const storage = new Map();
  const windowObject = {
    location: { search: '' },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
    },
    addEventListener() {},
    dispatchEvent() {},
    SpeechRecognition: null,
    webkitSpeechRecognition: null,
  };
  const context = {
    document,
    window: windowObject,
    globalThis: windowObject,
    URL,
    URLSearchParams,
    fetch: fetchImpl,
    CustomEvent: class {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    MutationObserver: class {
      observe() {}
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'passenger-runtime-locales.js'), 'utf8'), context);
  vm.runInNewContext(enhancer, context);
}

function appendPassengerPages(document, labels) {
  const home = document.createElement('section');
  home.className = 'mp-stack';
  home.setAttribute('aria-label', '旅客首頁');
  const services = document.createElement('div');
  services.className = 'mp-service-list';
  const transferButton = document.createElement('button');
  transferButton.className = 'mp-service';
  transferButton.textContent = labels.friendlyTitle;
  const lostButton = document.createElement('button');
  lostButton.className = 'mp-service';
  lostButton.textContent = labels.lostTitle;
  const facilityButton = document.createElement('button');
  facilityButton.className = 'mp-service';
  facilityButton.textContent = labels.facilityTitle.replace('Report', 'report');
  services.append(transferButton, lostButton, facilityButton);
  const quick = document.createElement('button');
  quick.className = 'mp-primary';
  quick.textContent = labels.quickHelp;
  const more = document.createElement('button');
  more.className = 'mp-secondary';
  more.textContent = labels.moreServices;
  home.append(services);
  document.body.append(home);

  const transfer = document.createElement('section');
  transfer.className = 'mp-stack';
  transfer.setAttribute('aria-label', labels.friendlyTitle);
  const hero = document.createElement('div');
  hero.className = 'mp-hero-block';
  const heading = document.createElement('h2');
  heading.textContent = labels.friendlyTitle;
  hero.append(heading);
  const card = document.createElement('section');
  card.className = 'mp-card mp-stack';
  transfer.append(hero, card);
  document.body.append(transfer);

  const lost = document.createElement('section');
  lost.setAttribute('data-service-page', 'lost-item');
  const notice = document.createElement('p');
  const link = document.createElement('a');
  link.setAttribute('href', 'https://www.railway.gov.tw/tra-tip-web/tip/tip00E/tipE11/query');
  link.textContent = 'source';
  notice.append(link);
  lost.append(notice);
  const unrelated = document.createElement('button');
  unrelated.className = 'mp-primary';
  unrelated.textContent = 'Other primary action';
  lost.append(unrelated);
  const searchPanel = document.createElement('section');
  for (let index = 0; index < 7; index += 1) {
    const field = document.createElement('div');
    field.className = 'mp-field';
    const input = document.createElement('input');
    input.value = index === 0 ? 'bag' : `field-${index}`;
    field.append(input);
    searchPanel.append(field);
  }
  const search = document.createElement('button');
  search.className = 'mp-primary';
  search.textContent = 'Localized search';
  searchPanel.append(search);
  lost.append(searchPanel);
  document.body.append(lost);
  return { transferHeading: heading, search, unrelated, notice, facilityButton, quick, more };
}

test('injected passenger tools resync non-zh copy without Traditional Chinese fallback', () => {
  const locales = require('../assets/passenger-runtime-locales.js');
  const document = createDocument('en');
  const pages = appendPassengerPages(document, locales.getPageLabels('en'));
  loadPassengerRuntime(document);

  document.dispatchEvent({ type: 'DOMContentLoaded' });
  assert.equal(pages.quick.parentNode, null);
  assert.equal(pages.more.parentNode, null);
  const launcher = document.getElementById('railagent-local-chat-launcher');
  assert.equal(launcher.innerHTMLSetCount, 1);
  document.dispatchEvent({ type: 'DOMContentLoaded' });
  assert.equal(launcher.innerHTMLSetCount, 1);
  click(document, launcher);

  assert.equal(document.querySelector('#railagent-local-chat textarea').getAttribute('placeholder'), 'Type your question...');
  assert.equal(document.querySelector('#railagent-friendly-transfer-tools h3').textContent, 'Transfer route');
  assert.equal(document.querySelector('#railagent-route-origin').getAttribute('placeholder'), 'Example: Taipei Main Station');
  assert.equal(document.querySelector('#railagent-transfer-help-button').textContent, 'Friendly transfer help');
  assert.equal(document.querySelector('[data-service-page="lost-item"] p'), null);

  document.documentElement.lang = 'id';
  const idLabels = locales.getPageLabels('id');
  pages.transferHeading.textContent = idLabels.friendlyTitle;
  pages.facilityButton.textContent = idLabels.facilityTitle;
  document.dispatchEvent({ type: 'DOMContentLoaded' });
  assert.equal(launcher.innerHTMLSetCount, 2);
  click(document, document.getElementById('railagent-local-chat-launcher'));

  assert.equal(document.querySelector('#railagent-local-chat textarea').getAttribute('placeholder'), 'Tulis pertanyaan Anda...');
  assert.equal(document.querySelector('#railagent-friendly-transfer-tools h3').textContent, 'Rute transfer');
  assert.equal(document.querySelector('#railagent-route-origin').getAttribute('placeholder'), 'Contoh: Stasiun Utama Taipei');
  assert.equal(document.querySelector('#railagent-transfer-help-button').textContent, 'Bantuan transfer ramah');
});

test('nan lost-item search uses page structure and ignores unrelated primary buttons', async () => {
  const locales = require('../assets/passenger-runtime-locales.js');
  const document = createDocument('nan');
  const pages = appendPassengerPages(document, locales.getPageLabels('nan'));
  let fetchCalls = 0;
  loadPassengerRuntime(document, async () => {
    fetchCalls += 1;
    return { ok: true, json: async () => ({ sourceMaxPickupDate: '', aiMode: 'local', candidates: [] }) };
  });

  document.dispatchEvent({ type: 'DOMContentLoaded' });
  const unrelatedEvent = click(document, pages.unrelated);
  assert.equal(unrelatedEvent.defaultPrevented, false);
  assert.equal(fetchCalls, 0);

  const searchEvent = click(document, pages.search);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(searchEvent.defaultPrevented, true);
  assert.equal(fetchCalls, 1);
  assert.match(document.getElementById('railagent-local-lost-found-result').textContent, /Bo chhoe tioh u kho-leng sio-hu e sit-but/);
  assert.doesNotMatch(document.getElementById('railagent-local-lost-found-result').textContent, /\u672c\u6a5f AI/);
  assert.doesNotMatch(document.getElementById('railagent-local-lost-found-result').textContent, /LFI (?:nan|hak|ja|ko|vi|th)/);
});

test('lost-item rendered copy rejects generated placeholders across all passenger languages', async () => {
  const locales = require('../assets/passenger-runtime-locales.js');
  const expectations = {
    'zh-TW': '\u672a\u627e\u5230\u53ef\u80fd\u76f8\u7b26\u7684\u907a\u5931\u7269\u3002',
    nan: 'Bo chhoe tioh u kho-leng sio-hu e sit-but.',
    hak: 'Mo tsham-to ko-nang siong-fu ge sit-vut.',
    en: 'No likely lost-item matches were found.',
    ja: 'Gaito shiso na ishitsubutsu wa mitsukarimasen deshita.',
    ko: 'Ilchi hal ganeungseong-i inneun bunsilmul-eul chatji mothaetseumnida.',
    vi: 'Khong tim thay do that lac co kha nang phu hop.',
    id: 'Tidak ada kecocokan barang hilang yang mungkin.',
    th: 'Mai phop khong hai thi na cha trong kan.',
  };

  for (const language of locales.SUPPORTED_LANGUAGES) {
    const document = createDocument(language);
    const pages = appendPassengerPages(document, locales.getPageLabels(language));
    loadPassengerRuntime(document, async () => ({
      ok: true,
      json: async () => ({ sourceMaxPickupDate: '', aiMode: 'local', candidates: [] }),
    }));

    document.dispatchEvent({ type: 'DOMContentLoaded' });
    click(document, pages.search);
    await new Promise((resolve) => setImmediate(resolve));

    const resultText = document.getElementById('railagent-local-lost-found-result').textContent;
    assert.match(resultText, new RegExp(expectations[language]), language);
    assert.doesNotMatch(resultText, /LFI (?:nan|hak|ja|ko|vi|th)/, language);
  }
});
