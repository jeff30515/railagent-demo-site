const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const locales = require('../assets/passenger-runtime-locales.js');

test('passenger case unfollow enhancer lets a re-tracked case render again', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'assets', 'passenger-case-unfollow.js'), 'utf8');

  assert.match(script, /RailAgentPassengerRuntimeLocales/);
  assert.match(script, /copy\.caseUnfollow/);
  assert.match(script, /copy\.caseUnfollowStatus/);
  assert.doesNotMatch(script, /hiddenTaskIds/);
  assert.match(script, /railagent-tracked-lost-found-cases/);
  assert.match(script, /localStorage\.setItem\(TRACKED_CASES_KEY/);
  assert.match(script, /filter\(\(entry\) => entry\.id !== recordId\)/);
  assert.match(script, /article\.remove\(\)/);
  assert.match(script, /public own case list/);
});

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributeMap = {};
    this.dataset = {};
    this.eventListeners = {};
    this._textContent = '';
    this.textContentWriteCount = 0;
    this.id = '';
    this.className = '';
  }

  get textContent() {
    return [this._textContent, ...this.children.map((child) => child.textContent)].join('');
  }

  set textContent(value) {
    this.textContentWriteCount += 1;
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
}

function descendants(root) {
  const results = [];
  root.children.forEach((child) => {
    results.push(child, ...descendants(child));
  });
  return results;
}

function matchesSelector(node, selector) {
  const parts = selectorParts(selector);
  if (parts.length > 1) {
    const leaf = parts.at(-1);
    const ancestors = parts.slice(0, -1);
    if (!matchesSelector(node, leaf)) return false;
    let cursor = node.parentNode;
    for (let index = ancestors.length - 1; index >= 0; index -= 1) {
      while (cursor && !matchesSelector(cursor, ancestors[index])) cursor = cursor.parentNode;
      if (!cursor) return false;
      cursor = cursor.parentNode;
    }
    return true;
  }
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

function selectorParts(selector) {
  const parts = [];
  let current = '';
  let bracketDepth = 0;
  let quote = null;
  for (const character of selector) {
    if (quote) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      current += character;
      continue;
    }
    if (character === '[') bracketDepth += 1;
    if (character === ']') bracketDepth -= 1;
    if (/\s/.test(character) && bracketDepth === 0) {
      if (current) parts.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  if (current) parts.push(current);
  return parts;
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

function appendTrackedCasePage(document) {
  const section = document.createElement('section');
  section.setAttribute('aria-label', 'public own case list');
  const list = document.createElement('section');
  list.className = 'mp-list';
  list.dataset.signature = JSON.stringify([{ id: 'rec-1' }, { id: 'rec-2' }]);
  const first = trackedArticle(document, 'EVT-2026-BQ-2001');
  const second = trackedArticle(document, 'EVT-2026-BQ-2002');
  list.append(first, second);
  section.append(list);
  document.body.append(section);
  return { section, list, first };
}

function trackedArticle(document, eventId) {
  const article = document.createElement('article');
  article.className = 'mp-list-item';
  const meta = document.createElement('div');
  meta.className = 'mp-meta';
  const status = document.createElement('span');
  status.textContent = 'Tracking';
  const id = document.createElement('span');
  id.textContent = eventId;
  meta.append(status, id);
  article.append(meta);
  return article;
}

function loadUnfollowRuntime(document, storage) {
  const windowObject = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
    },
  };
  const context = {
    document,
    window: windowObject,
    globalThis: windowObject,
    MutationObserver: class {
      observe() {}
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'passenger-runtime-locales.js'), 'utf8'), context);
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'passenger-case-unfollow.js'), 'utf8'), context);
  return windowObject.PassengerCaseUnfollow;
}

test('passenger unfollow uses active locale, fallback copy, and removes storage on click', () => {
  const document = createDocument('unknown');
  const storage = new Map([
    ['railagent-tracked-lost-found-cases', JSON.stringify([{ id: 'rec-1' }, { id: 'rec-2' }])],
  ]);
  const { section, first } = appendTrackedCasePage(document);
  const api = loadUnfollowRuntime(document, storage);
  assert.equal(api.enhancePassengerCases(document), true);
  const button = first.querySelector('[data-passenger-unfollow]');

  assert.equal(button.textContent, locales.getRuntimeCopy('zh-TW').caseUnfollow);

  document.documentElement.lang = 'nan';
  api.enhancePassengerCases(document);
  assert.equal(button.textContent, locales.getRuntimeCopy('nan').caseUnfollow);

  document.documentElement.lang = 'en';
  api.enhancePassengerCases(document);
  assert.equal(button.textContent, locales.getRuntimeCopy('en').caseUnfollow);

  button.dispatchEvent({
    type: 'click',
    preventDefault() {},
    stopPropagation() {},
  });

  assert.equal(first.parentNode, null);
  assert.deepEqual(JSON.parse(storage.get('railagent-tracked-lost-found-cases')), [{ id: 'rec-2' }]);
  assert.equal(
    section.querySelector('[data-passenger-unfollow-status]').textContent,
    `${locales.getRuntimeCopy('en').caseUnfollowStatus}EVT-2026-BQ-2001`,
  );
});

test('passenger case enhancer does not rewrite unchanged button copy on every mutation pass', () => {
  const document = createDocument('zh-TW');
  const storage = new Map([
    ['railagent-tracked-lost-found-cases', JSON.stringify([{ id: 'rec-1' }, { id: 'rec-2' }])],
  ]);
  const { first } = appendTrackedCasePage(document);
  const api = loadUnfollowRuntime(document, storage);

  assert.equal(api.enhancePassengerCases(document), true);
  const button = first.querySelector('[data-passenger-unfollow]');
  const writesAfterCreation = button.textContentWriteCount;

  assert.equal(api.enhancePassengerCases(document), true);
  assert.equal(
    button.textContentWriteCount,
    writesAfterCreation,
    'An unchanged textContent write retriggers the document MutationObserver and locks the Cases page.',
  );
});
