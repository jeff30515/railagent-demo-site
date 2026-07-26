const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const enhancer = fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'lost-found-local-api.js'),
  'utf8',
);

assert.ok(
  enhancer.includes(String.raw`\u8ffd\u8e64\u6b64\u7269\u4ef6`),
  'Every local-AI candidate should offer tracking.',
);
assert.ok(
  enhancer.includes(String.raw`\u8ffd\u8e64\u4e2d`),
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
  /data-railagent-speech-cue="quick-help"/,
  'The old home-only quick-help action must be removed by its stable cue, not Chinese copy.',
);
assert.match(
  enhancer,
  /\.mp-service-list/,
  'Every localized passenger home needs the RailAgent chat card in its stable service-list container.',
);
assert.match(
  enhancer,
  /\[data-railagent-speech-cue="quick-help"\][\s\S]*?button\.remove\(\)/,
  'Legacy home actions must be removed, not hidden with a CSS data attribute.',
);
assert.ok(
  enhancer.includes(String.raw`\u9ed1\u8272\u80cc\u5305\u907a\u5931\u7269\uff0c\u9700\u8981\u7ad9\u52d9\u5148\u6bd4\u5c0d\u5019\u9078\u62fe\u7372\u7269\u3002`),
  'The legacy backpack case should be explicitly removed.',
);
assert.ok(
  enhancer.includes(String.raw`\u670d\u52d9\u56de\u994b`) && !enhancer.includes(String.raw`\u670d\u52d9\u56de\u994b\uff08\u9589\u74b0\uff09`),
  'The public feedback heading should omit the closed-loop suffix.',
);
assert.ok(
  enhancer.includes(String.raw`\u7d50\u6848\u5f8c\u56de\u994b\u6703\u5beb\u5165\u672c\u6a5f\u4e8b\u4ef6\u76ee\u9304\uff0c\u4f9b\u6b77\u53f2\u54c1\u8cea\u5206\u6790\u3002`) && enhancer.includes('paragraph.remove()'),
  'The obsolete event-directory note should be removed from the rendered feedback card.',
);

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributeMap = {};
    this.dataset = {};
    this.className = '';
    this.id = '';
    this.textContent = '';
    this.innerHTML = '';
    this.type = '';
    this.disabled = false;
    this.hidden = false;
    this.value = '';
    this.offsetParent = {};
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

  insertAdjacentElement(position, node) {
    if (position !== 'afterend' || !this.parentNode) {
      this.append(node);
      return node;
    }
    const siblings = this.parentNode.children;
    const index = siblings.indexOf(this);
    node.parentNode = this.parentNode;
    siblings.splice(index + 1, 0, node);
    return node;
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }

  setAttribute(name, value) {
    this.attributeMap[name] = String(value);
    if (name === 'id') this.id = String(value);
    if (name === 'class') this.className = String(value);
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      this.dataset[key] = String(value);
    }
  }

  getAttribute(name) {
    if (name === 'id') return this.id;
    if (name === 'class') return this.className;
    return this.attributeMap[name] || null;
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

  querySelector(selector) {
    return findAll(this, selector)[0] || null;
  }

  querySelectorAll(selector) {
    return findAll(this, selector);
  }
}

function hasClass(node, className) {
  return node.className.split(/\s+/).includes(className);
}

function matchesSelector(node, selector) {
  if (selector === 'section') return node.tagName === 'SECTION';
  if (selector === 'button') return node.tagName === 'BUTTON';
  if (selector === 'input') return node.tagName === 'INPUT';
  if (selector === 'p') return node.tagName === 'P';
  if (selector === 'h2') return node.tagName === 'H2';
  if (selector === '.mp-card') return hasClass(node, 'mp-card');
  if (selector === '.mp-card.mp-stack') return hasClass(node, 'mp-card') && hasClass(node, 'mp-stack');
  if (selector === '.mp-list') return hasClass(node, 'mp-list');
  if (selector === '.mp-tags') return hasClass(node, 'mp-tags');
  if (selector === '.mp-tag') return hasClass(node, 'mp-tag');
  if (selector === 'button.mp-primary') return node.tagName === 'BUTTON' && hasClass(node, 'mp-primary');
  if (selector === '#railagent-local-lost-found-result') return node.id === 'railagent-local-lost-found-result';
  if (selector === '#railagent-local-chat-launcher') return node.id === 'railagent-local-chat-launcher';
  if (selector === '#railagent-friendly-transfer-tools') return node.id === 'railagent-friendly-transfer-tools';
  if (selector === '#railagent-transfer-dialog') return node.id === 'railagent-transfer-dialog';
  if (selector === '#railagent-tracked-lost-found-cases') return node.id === 'railagent-tracked-lost-found-cases';
  if (selector === '[aria-label="public own case list"]') return node.attributeMap['aria-label'] === 'public own case list';
  if (selector === 'article[aria-label]') return node.tagName === 'ARTICLE' && node.attributeMap['aria-label'] !== undefined;
  if (selector === 'article[aria-label="\\u670d\\u52d9\\u56de\\u994b"]') return false;
  if (selector === '[data-service-page="facility-report"]') return node.attributeMap['data-service-page'] === 'facility-report';
  if (selector === '[data-service-page="lost-item"]') return node.attributeMap['data-service-page'] === 'lost-item';
  if (selector === '[data-service-page="friendly-transfer"]') return node.attributeMap['data-service-page'] === 'friendly-transfer';
  if (selector === '.railagent-track-lost-found') return hasClass(node, 'railagent-track-lost-found');
  return false;
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

function createDocument() {
  const documentElement = new Element('html');
  const head = new Element('head');
  const body = new Element('body');
  documentElement.append(head, body);
  const listeners = {};
  return {
    documentElement,
    head,
    body,
    createElement(tagName) {
      return new Element(tagName);
    },
    getElementById(id) {
      return findAll(documentElement, `#${id}`)[0] || null;
    },
    querySelector(selector) {
      return documentElement.querySelector(selector);
    },
    querySelectorAll(selector) {
      return documentElement.querySelectorAll(selector);
    },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    dispatchEvent(event) {
      if (listeners[event.type]) listeners[event.type](event);
    },
  };
}

function loadLocalApi(document, fetchImpl = async () => ({ ok: true, json: async () => ({ candidates: [] }) })) {
  const script = fs.readFileSync(path.join(__dirname, '..', 'assets', 'lost-found-local-api.js'), 'utf8');
  const context = {
    document,
    fetch: fetchImpl,
    URL,
    URLSearchParams,
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init && init.detail;
      }
    },
    MutationObserver: class {
      observe() {}
    },
    window: {
      location: { search: '?apiBaseUrl=http://127.0.0.1:7071' },
      localStorage: {
        getItem() {
          return null;
        },
        setItem() {},
      },
      dispatchEvent() {},
      addEventListener() {},
    },
  };
  vm.runInNewContext(script, context);
}

function addInput(section, value = '') {
  const input = new Element('input');
  input.value = value;
  section.append(input);
  return input;
}

test('local API lost-found search attaches by page structure across non-Chinese labels', async () => {
  const labels = ['Find Matching Items', '一致する候補を検索', '일치 후보 검색'];

  for (const label of labels) {
    const document = createDocument();
    const page = new Element('section');
    page.setAttribute('data-service-page', 'lost-item');
    for (let index = 0; index < 7; index += 1) addInput(page, index === 0 ? 'bag' : 'value');
    const button = new Element('button');
    button.className = 'mp-primary';
    button.textContent = label;
    page.append(button);
    document.body.append(page);
    let requested = false;

    loadLocalApi(document, async () => {
      requested = true;
      return {
        ok: true,
        json: async () => ({ sourceMaxPickupDate: '2026-07-01', candidates: [] }),
      };
    });
    document.dispatchEvent({ type: 'DOMContentLoaded' });
    document.dispatchEvent({
      type: 'click',
      target: button,
      preventDefault() {},
      stopImmediatePropagation() {},
    });
    await Promise.resolve();

    assert.equal(requested, true, `search did not run for ${label}`);
    assert.ok(document.getElementById('railagent-local-lost-found-result'));
  }
});

test('transfer tools attach without Chinese headings and chat remains only on passenger home', () => {
  const document = createDocument();
  const facility = new Element('section');
  facility.setAttribute('data-service-page', 'facility-report');
  const facilityButton = new Element('button');
  facilityButton.className = 'mp-primary';
  facilityButton.textContent = 'Report Facility Issue';
  facility.append(facilityButton);
  const transfer = new Element('section');
  transfer.setAttribute('data-service-page', 'friendly-transfer');
  const heading = new Element('h2');
  heading.textContent = 'Friendly Transfer Assistance';
  transfer.append(heading);
  document.body.append(facility, transfer);

  loadLocalApi(document);
  document.dispatchEvent({ type: 'DOMContentLoaded' });

  assert.equal(document.getElementById('railagent-local-chat-launcher'), null);
  assert.ok(document.getElementById('railagent-friendly-transfer-tools'));
});

test('reruns cleanup after the React mobile bundle finishes mounting', () => {
  assert.match(
    enhancer,
    /window\.addEventListener\('load', syncLocalModeUi\)/,
    'The cleanup must run after the mobile bundle\'s first render, not only before it mounts.'
  );
});
