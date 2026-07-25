# Passenger Member Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the passenger "My" account summary with a two-tab member login and registration entry page.

**Architecture:** The deployed app is a static React bundle without editable source. Add a small post-load enhancement script that detects the passenger account section, replaces its visible content, and preserves the existing "返回身分選擇" button node so the current React navigation handler remains intact.

**Tech Stack:** Static HTML, browser DOM APIs, existing CSS classes, Node built-in test runner.

## Global Constraints

- Page title text must become "會員登入".
- Tabs must be "會員登入" and "加入會員", with "會員登入" shown first.
- Login tab fields: 帳號, 密碼, 記住帳號, 忘記密碼, hint text exactly matching the approved spec.
- Join tab fields: 證號, 密碼, 再次確認密碼, 姓名, 性別, 生日, E-mail, 手機, 居住地.
- Keep the bottom "返回身分選擇" action and remove all other original account/reset content.
- Do not add external dependencies or connect real authentication.

---

### Task 1: DOM Enhancer Test

**Files:**
- Create: `tests/passenger-member-auth.test.cjs`

**Interfaces:**
- Consumes: `assets/passenger-member-auth.js` as a browser-compatible script exposing `window.PassengerMemberAuth.enhancePassengerMemberAuth(root)`.
- Produces: Regression tests proving the account section is transformed and the original return button remains callable.

- [ ] **Step 1: Write the failing test**

```javascript
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = {};
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
    this.attributes[name] = String(value);
    if (name === 'class') this.className = String(value);
    if (name === 'id') this.id = String(value);
  }

  getAttribute(name) {
    if (name === 'class') return this.className;
    if (name === 'id') return this.id;
    return this.attributes[name] || null;
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
  if (selector === 'button') return node.tagName === 'BUTTON';
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

function loadEnhancer(document) {
  const script = fs.readFileSync(path.join(__dirname, '..', 'assets', 'passenger-member-auth.js'), 'utf8');
  const context = {
    document,
    MutationObserver: class {
      observe() {}
    },
    window: {},
  };
  vm.runInNewContext(script, context);
  return context.window.PassengerMemberAuth;
}

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

  loadEnhancer(document).enhancePassengerMemberAuth(document);

  const visibleText = textOf(section);
  assert.match(visibleText, /會員登入/);
  assert.match(visibleText, /帳號/);
  assert.match(visibleText, /密碼/);
  assert.match(visibleText, /記住帳號/);
  assert.match(visibleText, /忘記密碼/);
  assert.match(visibleText, /建議會員每三個月定期更換密碼/);
  assert.doesNotMatch(visibleText, /可見事件/);
  assert.doesNotMatch(visibleText, /重設友善轉乘示範/);

  section.querySelector('button.mp-primary').dispatchEvent({ type: 'click' });
  assert.equal(exited, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/passenger-member-auth.test.cjs`
Expected: FAIL because `assets/passenger-member-auth.js` does not exist.

### Task 2: Passenger Member Auth Enhancer

**Files:**
- Create: `assets/passenger-member-auth.js`
- Modify: `index.html`
- Test: `tests/passenger-member-auth.test.cjs`

**Interfaces:**
- Consumes: existing account section with `section[aria-label="帳戶"]` and a `button.mp-primary` return button.
- Produces: `window.PassengerMemberAuth.enhancePassengerMemberAuth(root)` and automatic MutationObserver enhancement.

- [ ] **Step 1: Implement the minimal script**

Create a browser script that:
- Finds `section[aria-label="帳戶"]`.
- Preserves the existing primary return button.
- Replaces all other children with the new title, tabs, active form, status region, and return button.
- Switches between login and join views locally.

- [ ] **Step 2: Include the script in `index.html`**

Add `<script defer src="/railagent-demo-site/assets/passenger-member-auth.js?v=20260726-member-auth"></script>` after the existing app enhancement scripts.

- [ ] **Step 3: Run test to verify it passes**

Run: `node --test tests/passenger-member-auth.test.cjs`
Expected: PASS.

### Task 3: Static Smoke Verification

**Files:**
- Verify: `index.html`
- Verify: `assets/passenger-member-auth.js`
- Verify: `tests/passenger-member-auth.test.cjs`

**Interfaces:**
- Consumes: Task 2 completed assets.
- Produces: Evidence the HTML references the enhancer and all requested labels are present in tested behavior.

- [ ] **Step 1: Run the focused test**

Run: `node --test tests/passenger-member-auth.test.cjs`
Expected: PASS.

- [ ] **Step 2: Inspect git diff**

Run: `git diff -- index.html assets/passenger-member-auth.js tests/passenger-member-auth.test.cjs docs/superpowers/plans/2026-07-26-passenger-member-auth.md`
Expected: Only the member auth plan, enhancer, test, and HTML script include changed.

- [ ] **Step 3: Commit and push**

Commit with Lore trailers and push `main` to `origin/main`.

