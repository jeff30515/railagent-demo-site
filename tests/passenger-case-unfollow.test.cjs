const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const TRACKED_CASES_KEY = 'railagent-tracked-lost-found-cases';

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
    this.id = '';
    this.parentNode = null;
  }

  append(...nodes) {
    nodes.forEach((node) => {
      if (node) {
        node.parentNode = this;
        this.children.push(node);
      }
    });
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  setAttribute(name, value) {
    this.attributeMap[name] = String(value);
    if (name === 'class') this.className = String(value);
    if (name === 'id') this.id = String(value);
    if (name.startsWith('data-')) {
      const datasetKey = name
        .slice(5)
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      this.dataset[datasetKey] = String(value);
    }
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

function hasClass(node, className) {
  return node.className.split(/\s+/).includes(className);
}

function matchesSelector(node, selector) {
  if (selector === 'section') return node.tagName === 'SECTION';
  if (selector === 'section[aria-label="public own case list"]') {
    return node.tagName === 'SECTION' && node.attributes['aria-label'] === 'public own case list';
  }
  if (selector === '#railagent-tracked-lost-found-cases') return node.id === 'railagent-tracked-lost-found-cases';
  if (selector === '.mp-list') return hasClass(node, 'mp-list');
  if (selector === 'article.mp-list-item') return node.tagName === 'ARTICLE' && hasClass(node, 'mp-list-item');
  if (selector === '.mp-meta') return hasClass(node, 'mp-meta');
  if (selector === 'span') return node.tagName === 'SPAN';
  if (selector === '[data-passenger-unfollow-status]') return node.attributes['data-passenger-unfollow-status'] !== undefined;
  if (selector === '[data-passenger-unfollow]') return node.attributes['data-passenger-unfollow'] !== undefined;
  return false;
}

function textOf(node) {
  return [node.textContent, ...node.children.map(textOf)].join('');
}

function createLocalStorage(initial) {
  const store = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
  };
}

function createPassengerI18n() {
  return {
    applyCalls: [],
    translate(key) {
      const copy = {
        'case.unfollow': '追跡を解除',
        'case.unfollowStatus': '追跡を解除しました ',
      };
      return copy[key] || key;
    },
    apply(section) {
      this.applyCalls.push(section);
      return true;
    },
  };
}

function loadEnhancer(document, localStorage, passengerI18n) {
  const script = fs.readFileSync(path.join(__dirname, '..', 'assets', 'passenger-case-unfollow.js'), 'utf8');
  const context = {
    document,
    MutationObserver: class {
      observe() {}
    },
    window: {
      localStorage,
      PassengerI18n: passengerI18n,
    },
  };
  vm.runInNewContext(script, context);
  return context.window.PassengerCaseUnfollow;
}

function appendTrackedArticle(list, eventId, label) {
  const article = list.ownerDocument ? list.ownerDocument.createElement('article') : new Element('article');
  article.className = 'mp-list-item';
  article.textContent = label;
  const meta = new Element('div');
  meta.className = 'mp-meta';
  const type = new Element('span');
  type.textContent = 'lost-found';
  const id = new Element('span');
  id.textContent = eventId;
  meta.append(type, id);
  article.append(meta);
  list.append(article);
  return article;
}

test('passenger case unfollow enhancer lets a re-tracked case render again', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'assets', 'passenger-case-unfollow.js'), 'utf8');

  assert.match(script, /railagent-tracked-lost-found-cases/);
  assert.match(script, /localStorage\.setItem\(TRACKED_CASES_KEY/);
  assert.match(script, /filter\(\(entry\) => entry\.id !== recordId\)/);
  assert.match(script, /article\.remove\(\)/);
  assert.match(script, /public own case list/);
  assert.doesNotMatch(script, /hiddenTaskIds/);
});

test('renders Japanese unfollow status and removes only the selected tracked record', () => {
  const document = createDocument();
  const section = document.createElement('section');
  section.setAttribute('aria-label', 'public own case list');
  const list = document.createElement('div');
  list.id = 'railagent-tracked-lost-found-cases';
  list.className = 'mp-list';
  list.dataset.signature = JSON.stringify([{ id: 'keep' }, { id: 'remove' }]);
  appendTrackedArticle(list, 'SE-KEEP', 'first case');
  const selectedArticle = appendTrackedArticle(list, 'SE-REMOVE', 'selected case');
  section.append(list);
  document.documentElement.append(section);
  const localStorage = createLocalStorage({
    [TRACKED_CASES_KEY]: JSON.stringify([{ id: 'keep' }, { id: 'remove' }]),
  });
  const passengerI18n = createPassengerI18n();

  loadEnhancer(document, localStorage, passengerI18n).enhancePassengerCases(document);

  const button = selectedArticle.querySelector('[data-passenger-unfollow]');
  assert.equal(textOf(button), '追跡を解除');
  button.dispatchEvent({
    type: 'click',
    preventDefault() {},
    stopPropagation() {},
  });

  assert.deepEqual(JSON.parse(localStorage.getItem(TRACKED_CASES_KEY)), [{ id: 'keep' }]);
  assert.equal(list.querySelectorAll('article.mp-list-item').length, 1);
  assert.equal(textOf(section.querySelector('[data-passenger-unfollow-status]')), '追跡を解除しました SE-REMOVE');
  assert.equal(passengerI18n.applyCalls.at(-1), section);
});

test('adds unfollow controls when the case section label is localized', () => {
  const document = createDocument();
  const section = document.createElement('section');
  section.setAttribute('aria-label', 'My Cases');
  const list = document.createElement('div');
  list.id = 'railagent-tracked-lost-found-cases';
  list.className = 'mp-list';
  list.dataset.signature = JSON.stringify([{ id: 'tracked-localized' }]);
  appendTrackedArticle(list, 'SE-LOCALIZED', 'localized case');
  section.append(list);
  document.documentElement.append(section);
  const localStorage = createLocalStorage({
    [TRACKED_CASES_KEY]: JSON.stringify([{ id: 'tracked-localized' }]),
  });

  loadEnhancer(document, localStorage, createPassengerI18n()).enhancePassengerCases(document);

  assert.ok(section.querySelector('[data-passenger-unfollow]'));
});
