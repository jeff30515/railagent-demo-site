(function () {
  const LOGIN_HINT =
    '\u5efa\u8b70\u6703\u54e1\u6bcf\u4e09\u500b\u6708\u5b9a\u671f\u66f4\u63db\u5bc6\u78bc\uff0c\u5bc6\u78bc\u898f\u5247\u70ba8-12\u5b57\u5143\uff0c\u81f3\u5c11\u4e00\u500b\u82f1\u6587\u5b57\u8207\u4e00\u500b\u6578\u5b57';

  function createElement(name, options) {
    const element = document.createElement(name);
    const { attributes, ...properties } = options || {};
    Object.assign(element, properties);

    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }

    return element;
  }

  function injectStyles() {
    if (!document.head || document.querySelector('#passenger-member-auth-style')) return;

    const style = createElement('style', {
      id: 'passenger-member-auth-style',
      textContent:
        '.mobile-product .passenger-member-auth__tabs{margin:.25rem 0 .75rem}' +
        '.mobile-product .passenger-member-auth__tab{text-decoration:none}' +
        '.mobile-product .passenger-member-auth__form{gap:.85rem}' +
        '.mobile-product .passenger-member-auth__field{display:grid;gap:.35rem;font-weight:800;color:var(--mp-navy)}' +
        '.mobile-product .passenger-member-auth__field input,.mobile-product .passenger-member-auth__field select{width:100%;min-height:48px;border:1px solid rgba(30,58,95,.12);border-radius:14px;background:#fff;color:var(--mp-ink);font:inherit;padding:0 .9rem;box-shadow:inset 0 1px rgba(255,255,255,.85),0 4px 14px rgba(21,42,69,.06)}' +
        '.mobile-product .passenger-member-auth__field input:focus,.mobile-product .passenger-member-auth__field select:focus{outline:3px solid rgba(13,115,119,.22);border-color:rgba(13,115,119,.48)}' +
        '.mobile-product .passenger-member-auth__check{display:inline-flex;align-items:center;gap:.5rem;font-weight:800;color:var(--mp-navy)}' +
        '.mobile-product .passenger-member-auth__check input{width:1rem;height:1rem;accent-color:var(--mp-teal)}' +
        '.mobile-product .passenger-member-auth__link-button{width:auto;justify-self:start;min-height:40px;padding:0 1rem}' +
        '.mobile-product .passenger-member-auth__hint{margin:0;line-height:1.55}' +
        '.mobile-product .passenger-member-auth__status{min-height:1.4em;margin:.25rem 0 0;color:var(--mp-teal);font-weight:800}' +
        '.mobile-product .passenger-member-auth__return{margin-top:.25rem}',
    });
    document.head.append(style);
  }

  function createField(id, labelText, options) {
    const label = createElement('label', {
      className: 'passenger-member-auth__field',
      htmlFor: id,
    });
    const caption = createElement('span', { textContent: labelText });
    const controlOptions = {
      id,
      name: id,
      required: Boolean(options && options.required),
    };
    if (!(options && options.select)) controlOptions.type = (options && options.type) || 'text';
    const input = createElement(options && options.select ? 'select' : 'input', controlOptions);

    if (options && options.placeholder) input.setAttribute('placeholder', options.placeholder);
    if (options && options.autocomplete) input.setAttribute('autocomplete', options.autocomplete);

    if (options && options.select) {
      options.select.forEach((optionText) => {
        input.append(createElement('option', { value: optionText, textContent: optionText }));
      });
    }

    label.append(caption, input);
    return label;
  }

  function createLoginForm(status) {
    const form = createElement('form', { className: 'mp-card mp-stack passenger-member-auth__form', noValidate: true });
    form.append(
      createField('member-login-account', '\u5e33\u865f', {
        required: true,
        autocomplete: 'username',
      }),
      createField('member-login-password', '\u5bc6\u78bc', {
        required: true,
        type: 'password',
        autocomplete: 'current-password',
      }),
      createRememberField(),
      createForgotPasswordButton(status),
      createElement('p', { className: 'mp-footnote passenger-member-auth__hint', textContent: LOGIN_HINT }),
      createElement('button', {
        type: 'submit',
        className: 'mp-primary',
        textContent: '\u6703\u54e1\u767b\u5165',
      }),
    );

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      status.textContent = '\u6b64\u70ba\u6703\u54e1\u767b\u5165\u793a\u7bc4\uff0c\u5c1a\u672a\u4e32\u63a5\u771f\u5be6\u9a57\u8b49\u3002';
    });

    return form;
  }

  function createRememberField() {
    const label = createElement('label', { className: 'passenger-member-auth__check' });
    const checkbox = createElement('input', {
      id: 'member-login-remember',
      name: 'member-login-remember',
      type: 'checkbox',
    });
    label.append(checkbox, createElement('span', { textContent: '\u8a18\u4f4f\u5e33\u865f' }));
    return label;
  }

  function createForgotPasswordButton(status) {
    const button = createElement('button', {
      type: 'button',
      className: 'mp-secondary passenger-member-auth__link-button',
      textContent: '\u5fd8\u8a18\u5bc6\u78bc',
    });
    button.addEventListener('click', function () {
      status.textContent = '\u6b64\u70ba\u5fd8\u8a18\u5bc6\u78bc\u793a\u7bc4\uff0c\u5c1a\u672a\u958b\u653e\u7dda\u4e0a\u91cd\u8a2d\u3002';
    });
    return button;
  }

  function createJoinForm(status) {
    const form = createElement('form', { className: 'mp-card mp-stack passenger-member-auth__form', noValidate: true });
    form.append(
      createField('member-join-id', '\u8b49\u865f', { required: true, autocomplete: 'off' }),
      createField('member-join-password', '\u5bc6\u78bc', {
        required: true,
        type: 'password',
        autocomplete: 'new-password',
      }),
      createField('member-join-password-confirm', '\u518d\u6b21\u78ba\u8a8d\u5bc6\u78bc', {
        required: true,
        type: 'password',
        autocomplete: 'new-password',
      }),
      createField('member-join-name', '\u59d3\u540d', { required: true, autocomplete: 'name' }),
      createField('member-join-gender', '\u6027\u5225', { required: true, select: ['\u7537', '\u5973'] }),
      createField('member-join-birthday', '\u751f\u65e5', { required: true, type: 'date' }),
      createField('member-join-email', 'E-mail', { required: true, type: 'email', autocomplete: 'email' }),
      createField('member-join-mobile', '\u624b\u6a5f', { required: true, type: 'tel', autocomplete: 'tel' }),
      createField('member-join-residence', '\u5c45\u4f4f\u5730', { required: true, autocomplete: 'street-address' }),
      createElement('button', {
        type: 'submit',
        className: 'mp-primary',
        textContent: '\u52a0\u5165\u6703\u54e1',
      }),
    );

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      status.textContent = '\u6b64\u70ba\u52a0\u5165\u6703\u54e1\u793a\u7bc4\uff0c\u5c1a\u672a\u5132\u5b58\u500b\u4eba\u8cc7\u6599\u3002';
    });

    return form;
  }

  function buildTab(label, tabName, active) {
    const tab = createElement('a', {
      className: active ? 'mp-chip passenger-member-auth__tab is-active' : 'mp-chip passenger-member-auth__tab',
      textContent: label,
      attributes: {
        href: '#member-' + tabName,
        role: 'tab',
        'data-member-auth-tab': tabName,
        'aria-pressed': active ? 'true' : 'false',
        'aria-selected': active ? 'true' : 'false',
      },
    });
    return tab;
  }

  function render(section, exitButton, activeTab) {
    const status = createElement('p', {
      className: 'mp-footnote passenger-member-auth__status',
      textContent: '',
      attributes: { role: 'status', 'aria-live': 'polite' },
    });

    const header = createElement('div', { className: 'mp-hero-block passenger-member-auth__header' });
    header.append(
      createElement('h2', { textContent: '\u6703\u54e1\u767b\u5165' }),
      createElement('p', { textContent: activeTab === 'login' ? '\u8acb\u8f38\u5165\u6703\u54e1\u5e33\u865f\u8207\u5bc6\u78bc\u3002' : '\u8acb\u586b\u5beb\u57fa\u672c\u8cc7\u6599\u5efa\u7acb\u6703\u54e1\u3002' }),
    );

    const tabs = createElement('div', {
      className: 'mp-chip-row passenger-member-auth__tabs',
      attributes: { role: 'tablist', 'aria-label': '\u6703\u54e1\u529f\u80fd' },
    });
    tabs.append(
      buildTab('\u6703\u54e1\u767b\u5165', 'login', activeTab === 'login'),
      buildTab('\u52a0\u5165\u6703\u54e1', 'join', activeTab === 'join'),
    );

    const panel = createElement('div', {
      attributes: { 'data-member-auth': '', role: 'tabpanel' },
    });
    panel.append(activeTab === 'login' ? createLoginForm(status) : createJoinForm(status), status);

    exitButton.type = 'button';
    exitButton.className = 'mp-primary passenger-member-auth__return';
    exitButton.textContent = '\u8fd4\u56de\u8eab\u5206\u9078\u64c7';

    section.setAttribute('aria-label', '\u6703\u54e1\u767b\u5165');
    section.replaceChildren(header, tabs, panel, exitButton);
  }

  function getText(node) {
    if (!node) return '';
    if (node.textContent) return node.textContent;
    return Array.from(node.children || []).map(getText).join('');
  }

  function findReturnButton(section) {
    return Array.from(section.querySelectorAll('button')).find((button) =>
      getText(button).includes('\u8fd4\u56de\u8eab\u5206\u9078\u64c7'),
    );
  }

  function isLegacyAccountSection(section) {
    const text = getText(section);
    const label = section.getAttribute('aria-label') || '';
    return (
      !section.querySelector('[data-member-auth]') &&
      text.includes('\u8fd4\u56de\u8eab\u5206\u9078\u64c7') &&
      (label.includes('\u5e33\u6236') || label.includes('\u6211\u7684') || text.includes('\u5e33\u6236'))
    );
  }

  function findLegacyAccountSection(scope) {
    const exactSection =
      scope.querySelector('section[aria-label="\u5e33\u6236"]') ||
      scope.querySelector('[aria-label="\u5e33\u6236"]');

    if (exactSection && isLegacyAccountSection(exactSection)) return exactSection;
    return Array.from(scope.querySelectorAll('section')).find(isLegacyAccountSection) || null;
  }

  function enhancePassengerMemberAuth(root) {
    injectStyles();

    const scope = root || document;
    const section = findLegacyAccountSection(scope);

    if (!section) return false;

    const exitButton = findReturnButton(section);

    if (!exitButton) return false;

    render(section, exitButton, activeMemberTab());
    return true;
  }

  function activeMemberTab() {
    return window.location && window.location.hash === '#member-join' ? 'join' : 'login';
  }

  function renderMemberTabFromHash() {
    const section =
      findLegacyAccountSection(document) ||
      Array.from(document.querySelectorAll('section')).find(
        (candidate) => candidate.getAttribute('aria-label') === '\u6703\u54e1\u767b\u5165',
      );
    const exitButton = section && findReturnButton(section);
    if (section && exitButton) render(section, exitButton, activeMemberTab());
  }

  window.PassengerMemberAuth = { enhancePassengerMemberAuth };
  window.addEventListener('hashchange', renderMemberTabFromHash);

  const observer = new MutationObserver(function () {
    enhancePassengerMemberAuth(document);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhancePassengerMemberAuth(document);
})();
