const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const locales = require('../assets/passenger-runtime-locales.js');

const enhancement = fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'facility-report-feedback.js'),
  'utf8',
);

assert.match(
  enhancement,
  /facility-issue/,
  'Facility reports should provide an issue-description input.',
);
assert.match(
  enhancement,
  /noValidate: true/,
  'Facility reports should route blank submissions through the inline error message.',
);
assert.match(
  enhancement,
  /RailAgentPassengerRuntimeLocales/,
  'Facility feedback should use the shared nine-language copy.',
);
assert.match(
  enhancement,
  /getRuntimeCopy\(document\.documentElement\.lang\)/,
  'Facility copy should follow the active document language.',
);
assert.match(
  enhancement,
  /activeCopy\.facilityRequired/,
  'Facility reports should explain blank submissions with localized runtime copy.',
);
assert.match(
  enhancement,
  /activeCopy\.facilityThanks/,
  'Facility reports should acknowledge submissions with localized runtime copy.',
);
assert.ok(
  enhancement.includes("page.querySelector('#facility-issue')"),
  'A restored facility page should be enhanced again when its textarea is absent.',
);
assert.ok(
  !enhancement.includes("page.dataset.facilityFeedbackReady"),
  'A persistent page readiness flag must not prevent enhancement after re-entry.',
);
assert.ok(
  !enhancement.includes("const sample = card.querySelector('.mp-footnote');"),
  'The obsolete facility sample message should not be copied into the form.',
);
assert.ok(
  !enhancement.includes("const notice = card.querySelector('.mp-notice');"),
  'The Demo notice should not be copied into the form.',
);
assert.ok(
  enhancement.includes('facility-report-feedback__success'),
  'The acknowledgement should use its own neutral success presentation.',
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
  }

  get textContent() {
    return [this._textContent, ...this.children.map((child) => child.textContent)].join('');
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  append(...nodes) {
    nodes.forEach((node) => {
      if (!node) return;
      node.parentNode = this;
      this.children.push(node);
    });
  }

  replaceChildren(...nodes) {
    this.children = [];
    this._textContent = '';
    this.append(...nodes);
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  setAttribute(name, value) {
    const stringValue = String(value);
    this.attributeMap[name] = stringValue;
    if (name === 'id') this.id = stringValue;
    if (name === 'class') this.className = stringValue;
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = stringValue;
  }

  getAttribute(name) {
    if (name === 'id') return this.id || null;
    if (name === 'class') return this.className || null;
    if (name === 'role') return this.role || this.attributeMap[name] || null;
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
    return descendants(this).filter((node) => matchesSelector(node, selector));
  }

  focus() {}
}

function descendants(root) {
  const results = [];
  root.children.forEach((child) => {
    results.push(child, ...descendants(child));
  });
  return results;
}

function matchesSelector(node, selector) {
  const tag = selector.match(/^[a-z][\w-]*/i)?.[0];
  if (tag && node.tagName !== tag.toUpperCase()) return false;
  const id = selector.match(/#([\w-]+)/)?.[1];
  if (id && node.id !== id) return false;
  for (const className of [...selector.matchAll(/\.([\w-]+)/g)].map((match) => match[1])) {
    if (!node.className.split(/\s+/).includes(className)) return false;
  }
  for (const attr of selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)) {
    const actual = node.getAttribute(attr[1]);
    if (attr[2] === undefined ? actual === null : actual !== attr[2]) return false;
  }
  return Boolean(tag || id || selector.includes('.') || selector.includes('['));
}

function createDocument(language) {
  const documentElement = new Element('html');
  documentElement.lang = language;
  const body = new Element('body');
  documentElement.append(body);
  return {
    documentElement,
    body,
    createElement: (tagName) => new Element(tagName),
    querySelector: (selector) => documentElement.querySelector(selector),
    querySelectorAll: (selector) => documentElement.querySelectorAll(selector),
  };
}

function appendFacilityPage(document) {
  const page = document.createElement('section');
  page.setAttribute('data-service-page', 'facility-report');
  const card = document.createElement('section');
  card.className = 'mp-card mp-stack';
  const submit = document.createElement('button');
  submit.className = 'mp-primary';
  submit.textContent = 'Send report';
  card.append(submit);
  page.append(card);
  document.body.append(page);
  return { card };
}

function loadFacilityRuntime(document) {
  let observerCallback = null;
  const windowObject = {};
  const context = {
    document,
    window: windowObject,
    globalThis: windowObject,
    MutationObserver: class {
      constructor(callback) {
        observerCallback = callback;
      }
      observe() {}
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'passenger-runtime-locales.js'), 'utf8'), context);
  vm.runInNewContext(enhancement, context);
  return () => observerCallback?.();
}

function submit(form) {
  form.dispatchEvent({
    type: 'submit',
    preventDefault() {},
  });
}

test('facility form resyncs mounted copy and submits with the active language', () => {
  const document = createDocument('en');
  const { card } = appendFacilityPage(document);
  const sync = loadFacilityRuntime(document);

  assert.equal(card.querySelector('label').textContent, locales.getRuntimeCopy('en').facilityIssue);

  document.documentElement.lang = 'id';
  sync();

  const form = card.querySelector('form');
  const input = card.querySelector('#facility-issue');
  const error = card.querySelector('[role="alert"]');
  assert.equal(card.querySelector('label').textContent, locales.getRuntimeCopy('id').facilityIssue);

  submit(form);
  assert.equal(error.textContent, locales.getRuntimeCopy('id').facilityRequired);

  input.value = 'Door is stuck';
  document.documentElement.lang = 'unknown';
  submit(form);
  assert.equal(card.querySelector('[role="status"]').textContent, locales.getRuntimeCopy('zh-TW').facilityThanks);

  const restoredSubmit = document.createElement('button');
  restoredSubmit.className = 'mp-primary';
  restoredSubmit.textContent = 'Send report';
  card.replaceChildren(restoredSubmit);
  sync();
  assert.equal(card.querySelector('label').textContent, locales.getRuntimeCopy('zh-TW').facilityIssue);
});
