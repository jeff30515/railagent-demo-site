(function () {
  const originalExitButtons = new WeakMap();

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

  function currentCopy() {
    const localeApi = window.RailAgentPassengerRuntimeLocales;
    if (localeApi && typeof localeApi.getRuntimeCopy === 'function') {
      return localeApi.getRuntimeCopy(document.documentElement.lang);
    }
    throw new Error('Passenger locale module must load before member auth runtime.');
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
        '.mobile-product .passenger-member-auth__return{margin-top:.25rem}' +
        '.mobile-product [data-railagent-member-legacy="true"]{display:none!important}',
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

  function createLoginForm(status, copy) {
    const form = createElement('form', { className: 'mp-card mp-stack passenger-member-auth__form', noValidate: true });
    form.append(
      createField('member-login-account', copy.memberAccountLabel, {
        required: true,
        autocomplete: 'username',
      }),
      createField('member-login-password', copy.memberPasswordLabel, {
        required: true,
        type: 'password',
        autocomplete: 'current-password',
      }),
      createRememberField(copy),
      createForgotPasswordButton(status, copy),
      createElement('p', { className: 'mp-footnote passenger-member-auth__hint', textContent: copy.memberLoginHint }),
      createElement('button', {
        type: 'submit',
        className: 'mp-primary',
        textContent: copy.memberLoginSubmit,
      }),
    );

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      status.textContent = copy.memberLoginDemoStatus;
    });

    return form;
  }

  function createRememberField(copy) {
    const label = createElement('label', { className: 'passenger-member-auth__check' });
    const checkbox = createElement('input', {
      id: 'member-login-remember',
      name: 'member-login-remember',
      type: 'checkbox',
    });
    label.append(checkbox, createElement('span', { textContent: copy.memberRememberLabel }));
    return label;
  }

  function createForgotPasswordButton(status, copy) {
    const button = createElement('button', {
      type: 'button',
      className: 'mp-secondary passenger-member-auth__link-button',
      textContent: copy.memberForgotPassword,
    });
    button.addEventListener('click', function () {
      status.textContent = copy.memberForgotDemoStatus;
    });
    return button;
  }

  function createJoinForm(status, copy) {
    const form = createElement('form', { className: 'mp-card mp-stack passenger-member-auth__form', noValidate: true });
    form.append(
      createField('member-join-id', copy.memberJoinIdLabel, { required: true, autocomplete: 'off' }),
      createField('member-join-password', copy.memberJoinPasswordLabel, {
        required: true,
        type: 'password',
        autocomplete: 'new-password',
      }),
      createField('member-join-password-confirm', copy.memberJoinPasswordConfirmLabel, {
        required: true,
        type: 'password',
        autocomplete: 'new-password',
      }),
      createField('member-join-name', copy.memberJoinNameLabel, { required: true, autocomplete: 'name' }),
      createField('member-join-gender', copy.memberJoinGenderLabel, {
        required: true,
        select: [copy.memberJoinGenderMale, copy.memberJoinGenderFemale],
      }),
      createField('member-join-birthday', copy.memberJoinBirthdayLabel, { required: true, type: 'date' }),
      createField('member-join-email', copy.memberJoinEmailLabel, { required: true, type: 'email', autocomplete: 'email' }),
      createField('member-join-mobile', copy.memberJoinMobileLabel, { required: true, type: 'tel', autocomplete: 'tel' }),
      createField('member-join-residence', copy.memberJoinResidenceLabel, { required: true, autocomplete: 'street-address' }),
      createElement('button', {
        type: 'submit',
        className: 'mp-primary',
        textContent: copy.memberJoinSubmit,
      }),
    );

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      status.textContent = copy.memberJoinDemoStatus;
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
    const copy = currentCopy();
    const locale = document.documentElement.lang;
    let surface = Array.from(section.children || []).find((child) =>
      child.className.split(/\s+/).includes('passenger-member-auth__surface')
    );
    if (!surface) {
      Array.from(section.children || []).forEach((child) => {
        child.hidden = true;
        child.dataset.railagentMemberLegacy = 'true';
      });
      surface = createElement('div', {
        className: 'mp-stack passenger-member-auth__surface',
      });
      section.append(surface);
    }
    if (surface.dataset.locale === locale && surface.dataset.tab === activeTab) return;
    surface.dataset.locale = locale;
    surface.dataset.tab = activeTab;

    const status = createElement('p', {
      className: 'mp-footnote passenger-member-auth__status',
      textContent: '',
      attributes: { role: 'status', 'aria-live': 'polite' },
    });

    const header = createElement('div', { className: 'mp-hero-block passenger-member-auth__header' });
    header.append(
      createElement('h2', { textContent: copy.memberTitle }),
      createElement('p', { textContent: activeTab === 'login' ? copy.memberLoginLead : copy.memberJoinLead }),
    );

    const tabs = createElement('div', {
      className: 'mp-chip-row passenger-member-auth__tabs',
      attributes: { role: 'tablist', 'aria-label': copy.memberTabsLabel },
    });
    tabs.append(
      buildTab(copy.memberLoginTab, 'login', activeTab === 'login'),
      buildTab(copy.memberJoinTab, 'join', activeTab === 'join'),
    );

    const panel = createElement('div', {
      attributes: { 'data-member-auth': '', role: 'tabpanel' },
    });
    panel.append(activeTab === 'login' ? createLoginForm(status, copy) : createJoinForm(status, copy), status);

    const returnButton = createElement('button', {
      type: 'button',
      className: 'mp-primary passenger-member-auth__return',
      textContent: copy.memberReturn,
    });
    returnButton.addEventListener('click', function () {
      if (typeof exitButton.click === 'function') exitButton.click();
      else exitButton.dispatchEvent({ type: 'click' });
    });

    section.setAttribute('aria-label', copy.memberTitle);
    surface.replaceChildren(header, tabs, panel, returnButton);
  }

  function getText(node) {
    if (!node) return '';
    if (node.textContent) return node.textContent;
    return Array.from(node.children || []).map(getText).join('');
  }

  function findReturnButton(section) {
    const renderedReturn = section.querySelector('.passenger-member-auth__return');
    if (renderedReturn) return renderedReturn;
    const translatedReturn = Array.from(section.querySelectorAll('button')).find((button) =>
      getText(button).includes('\u8fd4\u56de\u8eab\u5206\u9078\u64c7'),
    );
    if (translatedReturn) return translatedReturn;
    return Array.from(section.children || [])
      .filter((child) => child.tagName === 'BUTTON')
      .at(-1) || null;
  }

  function findRenderedMemberSection(scope) {
    const panel = scope.querySelector('[data-member-auth]');
    return (panel && panel.closest('section')) || null;
  }

  function isLegacyAccountSection(section) {
    const text = getText(section);
    const label = section.getAttribute('aria-label') || '';
    const directChildren = Array.from(section.children || []);
    const directButtons = directChildren.filter((child) => child.tagName === 'BUTTON');
    const hasAccountShape =
      section.tagName === 'SECTION' &&
      section.className.split(/\s+/).includes('mp-stack') &&
      directButtons.length === 2 &&
      directChildren.some((child) =>
        child.tagName === 'ARTICLE' && child.className.split(/\s+/).includes('mp-card')
      );
    return (
      !section.querySelector('[data-member-auth]') &&
      (
        hasAccountShape ||
        (
          text.includes('\u8fd4\u56de\u8eab\u5206\u9078\u64c7') &&
          (label.includes('\u5e33\u6236') || label.includes('\u6211\u7684') || text.includes('\u5e33\u6236'))
        )
      )
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
    const section = findRenderedMemberSection(scope) || findLegacyAccountSection(scope);

    if (!section) return false;

    const exitButton = originalExitButtons.get(section) || findReturnButton(section);

    if (!exitButton) return false;

    originalExitButtons.set(section, exitButton);
    render(section, exitButton, activeMemberTab());
    return true;
  }

  function activeMemberTab() {
    return window.location && window.location.hash === '#member-join' ? 'join' : 'login';
  }

  function renderMemberTabFromHash() {
    const section =
      findRenderedMemberSection(document) ||
      findLegacyAccountSection(document);
    const exitButton = section && (originalExitButtons.get(section) || findReturnButton(section));
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
