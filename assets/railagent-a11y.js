(function () {
  const languages = {
    zh: {
      htmlLang: 'zh-Hant-TW',
      languageBar: '語言選擇',
      languageButton: (name) => `切換語言為${name}`,
      selected: '目前已選取',
      gate: 'RailAgent 身分與模式選擇',
      vision: '視障輔助模式，啟用給 TalkBack 使用的語音導覽與區塊標籤',
      hearing: '聽障輔助模式，啟用文字提示與視覺化狀態',
      nav: 'RailAgent 主要功能分頁',
      button: (name) => `${name} 按鈕`,
      card: (name) => `${name} 區塊`,
      service: (name) => `${name} 服務功能`,
      task: (name) => `${name} 任務卡片`,
      field: (name) => `${name} 輸入欄位`,
      kpi: (name) => `${name} 指標`,
      table: (name) => `${name} 資料表`,
      region: (name) => `${name} 區域`,
      form: '表單輸入區',
      voice: '語音操作區',
      status: '狀態訊息'
    },
    en: {
      htmlLang: 'en',
      languageBar: 'Language selection',
      languageButton: (name) => `Switch language to ${name}`,
      selected: 'selected',
      gate: 'RailAgent identity and mode selection',
      vision: 'Vision assistance mode, enables TalkBack voice navigation and labeled areas',
      hearing: 'Hearing assistance mode, enables text prompts and visual status',
      nav: 'RailAgent primary function tabs',
      button: (name) => `${name} button`,
      card: (name) => `${name} area`,
      service: (name) => `${name} service function`,
      task: (name) => `${name} task card`,
      field: (name) => `${name} input field`,
      kpi: (name) => `${name} metric`,
      table: (name) => `${name} data table`,
      region: (name) => `${name} region`,
      form: 'Form input area',
      voice: 'Voice action area',
      status: 'Status message'
    },
    ja: {
      htmlLang: 'ja',
      languageBar: '言語選択',
      languageButton: (name) => `${name}に言語を切り替え`,
      selected: '選択中',
      gate: 'RailAgent の身分とモード選択',
      vision: '視覚支援モード、TalkBack 用の音声案内と領域ラベルを有効にします',
      hearing: '聴覚支援モード、文字案内と視覚的な状態表示を有効にします',
      nav: 'RailAgent の主な機能タブ',
      button: (name) => `${name}ボタン`,
      card: (name) => `${name}領域`,
      service: (name) => `${name}サービス機能`,
      task: (name) => `${name}タスクカード`,
      field: (name) => `${name}入力欄`,
      kpi: (name) => `${name}指標`,
      table: (name) => `${name}データ表`,
      region: (name) => `${name}領域`,
      form: 'フォーム入力領域',
      voice: '音声操作領域',
      status: '状態メッセージ'
    }
  };

  function textOf(element) {
    return (element && element.textContent ? element.textContent : '').replace(/\s+/g, ' ').trim();
  }

  function detectLanguage() {
    const activeChip = document.querySelector('.mp-lang-chip.active, .mp-lang-chip[aria-pressed="true"]');
    const activeText = textOf(activeChip).toLowerCase();
    if (/日本|japanese|ja\b/.test(activeText)) return 'ja';
    if (/english|en\b/.test(activeText)) return 'en';
    if (activeText) return 'zh';

    const pageText = textOf(document.body).toLowerCase();
    if (/日本/.test(pageText)) return 'ja';
    if (/english|accessibility|service case/.test(pageText)) return 'en';
    return 'zh';
  }

  function setLabel(element, label) {
    if (!element || !label) return;
    element.setAttribute('aria-label', label);
  }

  function firstMeaningfulText(element) {
    if (!element) return '';
    const candidate = element.querySelector('h1, h2, h3, strong, .mp-access-btn-text, .mp-status, .mp-tag');
    return textOf(candidate) || textOf(element).slice(0, 80);
  }

  function activeSpeechLang() {
    return (languages[detectLanguage()] || languages.zh).htmlLang;
  }

  function speechTextFor(element) {
    if (!element) return '';
    const target = element.closest(
      '.mp-lang-chip, .mp-access-btn, button, a, input, textarea, select, .mp-service, .mp-list-item, .mp-card, .mp-kpi, .mp-field, [aria-label]'
    );
    if (!target) return '';
    if (target.matches('input, textarea, select')) {
      return target.getAttribute('aria-label') || target.getAttribute('placeholder') || target.getAttribute('name') || '';
    }
    const visible = firstMeaningfulText(target);
    return visible || target.getAttribute('aria-label') || '';
  }

  let talkbackEnabled = false;
  let lastSpoken = '';
  let lastSpokenAt = 0;

  function speak(text) {
    const cleanText = (text || '').replace(/\s+/g, ' ').trim();
    if (!cleanText || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
    const now = Date.now();
    if (cleanText === lastSpoken && now - lastSpokenAt < 700) return;
    lastSpoken = cleanText;
    lastSpokenAt = now;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = activeSpeechLang();
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  function enableTalkbackSimulation() {
    talkbackEnabled = true;
    document.documentElement.setAttribute('data-railagent-talkback', 'on');
    speak(speechTextFor(document.querySelector('.mp-access-vision')) || 'TalkBack');
  }

  function maybeSpeakFromEvent(event) {
    if (!talkbackEnabled) return;
    const text = speechTextFor(event.target);
    if (text) speak(text);
  }

  function enhance() {
    const languageKey = detectLanguage();
    const copy = languages[languageKey] || languages.zh;
    document.documentElement.lang = copy.htmlLang;

    document.querySelectorAll('.mp-lang-row, .mp-lang-bar').forEach((element) => {
      element.setAttribute('role', 'group');
      setLabel(element, copy.languageBar);
    });

    document.querySelectorAll('.mp-lang-chip').forEach((button) => {
      const name = textOf(button) || button.getAttribute('data-lang') || '';
      const isSelected = button.classList.contains('active') || button.getAttribute('aria-pressed') === 'true';
      setLabel(button, `${copy.languageButton(name)}${isSelected ? `, ${copy.selected}` : ''}`);
    });

    document.querySelectorAll('.mp-gate, .mp-shell-gate').forEach((element) => setLabel(element, copy.gate));
    document.querySelectorAll('.mp-access-vision').forEach((element) => setLabel(element, copy.vision));
    document.querySelectorAll('.mp-access-hearing').forEach((element) => setLabel(element, copy.hearing));

    document.querySelectorAll('.mp-bottom-nav').forEach((nav) => {
      nav.setAttribute('role', 'navigation');
      setLabel(nav, copy.nav);
    });

    document.querySelectorAll('button').forEach((button) => {
      if (button.classList.contains('mp-lang-chip') || button.hasAttribute('aria-label')) return;
      const name = firstMeaningfulText(button);
      setLabel(button, copy.button(name));
    });

    document.querySelectorAll('.mp-service, .mp-service-list > *').forEach((element) => {
      const name = firstMeaningfulText(element);
      setLabel(element, copy.service(name));
    });

    document.querySelectorAll('.mp-list-item').forEach((element) => {
      const name = firstMeaningfulText(element);
      setLabel(element, copy.task(name));
    });

    document.querySelectorAll('.mp-card').forEach((element) => {
      if (element.hasAttribute('aria-label')) return;
      const name = firstMeaningfulText(element);
      setLabel(element, copy.card(name));
    });

    document.querySelectorAll('.mp-kpi').forEach((element) => {
      const name = firstMeaningfulText(element);
      setLabel(element, copy.kpi(name));
    });

    document.querySelectorAll('.mp-field').forEach((field) => {
      const label = textOf(field.querySelector('label')) || firstMeaningfulText(field);
      setLabel(field, copy.field(label));
      field.querySelectorAll('input, textarea, select').forEach((input) => setLabel(input, copy.field(label)));
    });

    document.querySelectorAll('.mp-input').forEach((input) => {
      if (input.hasAttribute('aria-label')) return;
      const label = input.getAttribute('placeholder') || input.getAttribute('name') || copy.form;
      setLabel(input, copy.field(label));
    });

    document.querySelectorAll('.mp-data-table').forEach((table) => {
      const name = firstMeaningfulText(table.closest('section, article')) || copy.table('');
      setLabel(table, copy.table(name));
    });

    document.querySelectorAll('.mp-voice-actions, .mp-voice-bar').forEach((element) => {
      setLabel(element, copy.voice);
    });

    document.querySelectorAll('.mp-status, .mp-notice, .mp-error, .mp-voice-live').forEach((element) => {
      if (!element.hasAttribute('role')) element.setAttribute('role', 'status');
      if (!element.hasAttribute('aria-label')) setLabel(element, `${copy.status}: ${textOf(element)}`);
    });

    document.querySelectorAll('section').forEach((section) => {
      if (section.hasAttribute('aria-label')) return;
      const name = firstMeaningfulText(section);
      setLabel(section, copy.region(name));
    });
  }

  let scheduled = false;
  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhance();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleEnhance);
  } else {
    scheduleEnhance();
  }

  document.addEventListener('click', (event) => {
    if (event.target && event.target.closest && event.target.closest('.mp-access-vision')) {
      setTimeout(enableTalkbackSimulation, 0);
    }
    setTimeout(scheduleEnhance, 0);
  }, true);
  document.addEventListener('change', () => setTimeout(scheduleEnhance, 0), true);
  document.addEventListener('mouseover', maybeSpeakFromEvent, true);
  document.addEventListener('focusin', maybeSpeakFromEvent, true);

  new MutationObserver(scheduleEnhance).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'aria-pressed']
  });
})();
