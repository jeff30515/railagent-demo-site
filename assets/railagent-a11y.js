(function () {
  const languageChips = [
    { code: 'zh', lang: 'zh-Hant-TW', match: /繁中|繁體|中文|zh/i, spoken: '繁體中文' },
    { code: 'tw', lang: 'zh-Hant-TW', match: /臺語|台語|taigi|tw/i, spoken: '臺語' },
    { code: 'hak', lang: 'zh-Hant-TW', match: /客語|hakka/i, spoken: '客語' },
    { code: 'en', lang: 'en', match: /^en$|english/i, spoken: 'English' },
    { code: 'ja', lang: 'ja', match: /日本語|日文|japanese|ja/i, spoken: '日本語' },
    { code: 'ko', lang: 'ko', match: /한국어|韓文|korean|ko/i, spoken: '한국어' },
    { code: 'vi', lang: 'vi', match: /^vi$|vietnam|tiếng việt|越南/i, spoken: 'Tiếng Việt' },
    { code: 'id', lang: 'id', match: /^id$|indonesia|印尼/i, spoken: 'Bahasa Indonesia' },
    { code: 'th', lang: 'th', match: /^th$|thai|泰語|ภาษาไทย/i, spoken: 'ภาษาไทย' }
  ];

  const uiCopy = {
    zh: {
      languageBar: '語言選擇',
      selected: '目前選取',
      gate: 'RailAgent 身分與模式選擇',
      vision: '視障友善，開啟後滑鼠指到哪個功能就朗讀該功能名稱',
      hearing: '聽障友善，文字和視覺提示優先',
      nav: '主要功能導覽',
      button: (name) => name,
      card: (name) => name,
      service: (name) => name,
      task: (name) => name,
      field: (name) => name,
      kpi: (name) => name,
      table: (name) => name,
      region: (name) => name,
      form: '表單欄位',
      status: '狀態'
    },
    en: {
      languageBar: 'Language selection',
      selected: 'selected',
      gate: 'RailAgent identity and mode selection',
      vision: 'Vision friendly mode. After enabling it, hover over a function to hear its name.',
      hearing: 'Hearing friendly mode. Text and visual prompts first.',
      nav: 'Primary navigation',
      button: (name) => name,
      card: (name) => name,
      service: (name) => name,
      task: (name) => name,
      field: (name) => name,
      kpi: (name) => name,
      table: (name) => name,
      region: (name) => name,
      form: 'Form field',
      status: 'Status'
    },
    ja: {
      languageBar: '言語選択',
      selected: '選択中',
      gate: 'RailAgent の利用者種別とモード選択',
      vision: '視覚支援モード。オンにすると、マウスを当てた機能名を読み上げます。',
      hearing: '聴覚支援モード。文字と視覚的な案内を優先します。',
      nav: '主なナビゲーション',
      button: (name) => name,
      card: (name) => name,
      service: (name) => name,
      task: (name) => name,
      field: (name) => name,
      kpi: (name) => name,
      table: (name) => name,
      region: (name) => name,
      form: '入力欄',
      status: '状態'
    },
    vi: {
      languageBar: 'Chọn ngôn ngữ',
      selected: 'đang chọn',
      gate: 'Chọn vai trò và chế độ RailAgent',
      vision: 'Chế độ thân thiện cho người khiếm thị. Khi bật, trỏ vào chức năng nào sẽ đọc tên chức năng đó.',
      hearing: 'Chế độ thân thiện cho người khiếm thính. Ưu tiên chữ và tín hiệu trực quan.',
      nav: 'Điều hướng chính',
      button: (name) => name,
      card: (name) => name,
      service: (name) => name,
      task: (name) => name,
      field: (name) => name,
      kpi: (name) => name,
      table: (name) => name,
      region: (name) => name,
      form: 'Ô nhập liệu',
      status: 'Trạng thái'
    },
    id: {
      languageBar: 'Pilihan bahasa',
      selected: 'dipilih',
      gate: 'Pilih peran dan mode RailAgent',
      vision: 'Mode ramah tunanetra. Setelah aktif, arahkan kursor ke fungsi untuk membacakan namanya.',
      hearing: 'Mode ramah tunarungu. Mengutamakan teks dan petunjuk visual.',
      nav: 'Navigasi utama',
      button: (name) => name,
      card: (name) => name,
      service: (name) => name,
      task: (name) => name,
      field: (name) => name,
      kpi: (name) => name,
      table: (name) => name,
      region: (name) => name,
      form: 'Kolom input',
      status: 'Status'
    },
    th: {
      languageBar: 'เลือกภาษา',
      selected: 'เลือกอยู่',
      gate: 'เลือกบทบาทและโหมดของ RailAgent',
      vision: 'โหมดสำหรับผู้พิการทางสายตา เมื่อเปิดแล้ว ชี้เมาส์ไปที่ฟังก์ชันใด ระบบจะอ่านชื่อฟังก์ชันนั้น',
      hearing: 'โหมดสำหรับผู้พิการทางการได้ยิน เน้นข้อความและสัญญาณภาพ',
      nav: 'การนำทางหลัก',
      button: (name) => name,
      card: (name) => name,
      service: (name) => name,
      task: (name) => name,
      field: (name) => name,
      kpi: (name) => name,
      table: (name) => name,
      region: (name) => name,
      form: 'ช่องกรอกข้อมูล',
      status: 'สถานะ'
    }
  };

  function textOf(element) {
    return (element && element.textContent ? element.textContent : '').replace(/\s+/g, ' ').trim();
  }

  function chipInfoForText(text) {
    const clean = (text || '').trim();
    return languageChips.find((chip) => chip.match.test(clean)) || null;
  }

  function activeLanguageInfo() {
    const activeChip = document.querySelector('.mp-lang-chip.active, .mp-lang-chip[aria-pressed="true"]');
    return chipInfoForText(textOf(activeChip)) || languageChips[0];
  }

  function currentCopy() {
    const active = activeLanguageInfo();
    return uiCopy[active.code] || uiCopy.zh;
  }

  function setLabel(element, label) {
    if (!element || !label) return;
    element.setAttribute('aria-label', label);
  }

  function firstMeaningfulText(element) {
    if (!element) return '';
    const candidates = [
      '.mp-access-btn-text',
      'h1',
      'h2',
      'h3',
      'strong',
      '.mp-status',
      '.mp-tag',
      '.mp-chip',
      'label'
    ];
    for (const selector of candidates) {
      const candidate = element.matches && element.matches(selector) ? element : element.querySelector(selector);
      const text = textOf(candidate);
      if (text) return text;
    }
    return textOf(element).slice(0, 80);
  }

  function languageChipSpeech(element) {
    const chip = element && element.closest ? element.closest('.mp-lang-chip') : null;
    if (!chip) return null;
    const info = chipInfoForText(textOf(chip));
    if (!info) return null;
    return { text: info.spoken, lang: info.lang };
  }

  function targetForSpeech(element) {
    if (!element || !element.closest) return null;
    return element.closest(
      '.mp-lang-chip, .mp-access-btn, button, a, input, textarea, select, .mp-service, .mp-list-item, .mp-card, .mp-kpi, .mp-field, [aria-label]'
    );
  }

  function speechFor(element) {
    const chipSpeech = languageChipSpeech(element);
    if (chipSpeech) return chipSpeech;

    const target = targetForSpeech(element);
    if (!target) return null;

    const active = activeLanguageInfo();
    if (target.matches('input, textarea, select')) {
      const text = target.getAttribute('aria-label') || target.getAttribute('placeholder') || target.getAttribute('name') || '';
      return { text, lang: active.lang };
    }

    const visible = firstMeaningfulText(target);
    const label = visible || target.getAttribute('aria-label') || '';
    return { text: label, lang: active.lang };
  }

  let talkbackEnabled = false;
  let lastSpoken = '';
  let lastSpokenAt = 0;
  const nativeSpeech = window.speechSynthesis && window.speechSynthesis.speak
    ? window.speechSynthesis.speak.bind(window.speechSynthesis)
    : null;
  let allowA11ySpeech = false;

  if (window.speechSynthesis && nativeSpeech) {
    window.speechSynthesis.speak = function railAgentSpeechGuard(utterance) {
      if (!allowA11ySpeech) return;
      nativeSpeech(utterance);
    };
  }

  function speak(payload) {
    const text = typeof payload === 'string' ? payload : payload && payload.text;
    const lang = (payload && payload.lang) || activeLanguageInfo().lang;
    const cleanText = (text || '').replace(/\s+/g, ' ').trim();
    if (!cleanText || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;

    const now = Date.now();
    if (cleanText === lastSpoken && now - lastSpokenAt < 700) return;
    lastSpoken = cleanText;
    lastSpokenAt = now;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    utterance.rate = 0.95;
    allowA11ySpeech = true;
    window.speechSynthesis.speak(utterance);
    allowA11ySpeech = false;
  }

  function hideElement(element) {
    if (!element) return;
    element.hidden = true;
    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('tabindex', '-1');
    element.style.setProperty('display', 'none', 'important');
  }

  function showElement(element) {
    if (!element) return;
    element.hidden = false;
    element.removeAttribute('aria-hidden');
    element.removeAttribute('tabindex');
    element.style.removeProperty('display');
  }

  function restoreAppContainers() {
    document.querySelectorAll('#root, .mp-shell, .mp-shell-gate, .mp-gate, .mp-gate-hero, .mp-gate-cards, .mp-access-footer').forEach(showElement);
  }

  function restoreVisionFriendlyControl() {
    document.querySelectorAll('.mp-access-vision, .mp-access-btn').forEach((element) => {
      const label = textOf(element);
      if (!/視障|vision|TalkBack/i.test(label) && !element.classList.contains('mp-access-vision')) return;
      showElement(element);
    });
  }

  function removeLegacyVoiceControls() {
    restoreAppContainers();
    restoreVisionFriendlyControl();

    document.querySelectorAll('.mp-voice-actions, .mp-voice-bar, .mp-voice-btn, .mp-voice-live').forEach((element) => {
      const panel = element.closest('.mp-card, .mp-notice, article');
      if (panel && !panel.matches('#root, .mp-shell, .mp-shell-gate, .mp-gate')) {
        hideElement(panel);
      }
      hideElement(element);
    });

    document.querySelectorAll('button').forEach((button) => {
      const label = textOf(button);
      const isVisionFriendly = button.matches('.mp-access-vision, .mp-access-btn') || button.closest('.mp-access-vision, .mp-access-btn');
      if (/語音|朗讀|voice|speech|speak/i.test(label) && !isVisionFriendly) {
        hideElement(button);
      }
    });
  }

  function enableTalkbackSimulation() {
    talkbackEnabled = true;
    document.documentElement.setAttribute('data-railagent-talkback', 'on');
    const vision = document.querySelector('.mp-access-vision');
    speak(speechFor(vision) || { text: '視障友善', lang: activeLanguageInfo().lang });
  }

  function maybeSpeakFromEvent(event) {
    if (!talkbackEnabled) return;
    const speech = speechFor(event.target);
    if (speech && speech.text) speak(speech);
  }

  function labelLanguageChips(copy) {
    document.querySelectorAll('.mp-lang-row, .mp-lang-bar').forEach((element) => {
      element.setAttribute('role', 'group');
      setLabel(element, copy.languageBar);
    });

    document.querySelectorAll('.mp-lang-chip').forEach((button) => {
      const info = chipInfoForText(textOf(button));
      const spoken = info ? info.spoken : textOf(button);
      const isSelected = button.classList.contains('active') || button.getAttribute('aria-pressed') === 'true';
      setLabel(button, `${spoken}${isSelected ? `, ${copy.selected}` : ''}`);
      if (info) button.setAttribute('lang', info.lang);
    });
  }

  function enhance() {
    const active = activeLanguageInfo();
    const copy = currentCopy();
    document.documentElement.lang = active.lang;
    removeLegacyVoiceControls();
    labelLanguageChips(copy);

    document.querySelectorAll('.mp-gate, .mp-shell-gate').forEach((element) => setLabel(element, copy.gate));
    document.querySelectorAll('.mp-access-vision').forEach((element) => setLabel(element, copy.vision));
    document.querySelectorAll('.mp-access-hearing').forEach((element) => setLabel(element, copy.hearing));

    document.querySelectorAll('.mp-bottom-nav').forEach((nav) => {
      nav.setAttribute('role', 'navigation');
      setLabel(nav, copy.nav);
    });

    document.querySelectorAll('button, a').forEach((element) => {
      if (element.classList.contains('mp-lang-chip')) return;
      const name = firstMeaningfulText(element);
      setLabel(element, copy.button(name));
    });

    document.querySelectorAll('.mp-service, .mp-service-list > *').forEach((element) => {
      setLabel(element, copy.service(firstMeaningfulText(element)));
    });

    document.querySelectorAll('.mp-list-item').forEach((element) => {
      setLabel(element, copy.task(firstMeaningfulText(element)));
    });

    document.querySelectorAll('.mp-card').forEach((element) => {
      setLabel(element, copy.card(firstMeaningfulText(element)));
    });

    document.querySelectorAll('.mp-kpi').forEach((element) => {
      setLabel(element, copy.kpi(firstMeaningfulText(element)));
    });

    document.querySelectorAll('.mp-field').forEach((field) => {
      const label = textOf(field.querySelector('label')) || firstMeaningfulText(field) || copy.form;
      setLabel(field, copy.field(label));
      field.querySelectorAll('input, textarea, select').forEach((input) => setLabel(input, copy.field(label)));
    });

    document.querySelectorAll('.mp-input, input, textarea, select').forEach((input) => {
      const label = input.getAttribute('aria-label') || input.getAttribute('placeholder') || input.getAttribute('name') || copy.form;
      setLabel(input, copy.field(label));
    });

    document.querySelectorAll('.mp-data-table, table').forEach((table) => {
      const name = firstMeaningfulText(table.closest('section, article')) || copy.table('');
      setLabel(table, copy.table(name));
    });

    document.querySelectorAll('.mp-status, .mp-notice, .mp-error').forEach((element) => {
      if (!element.hasAttribute('role')) element.setAttribute('role', 'status');
      setLabel(element, `${copy.status}: ${textOf(element)}`);
    });

    document.querySelectorAll('section').forEach((section) => {
      setLabel(section, copy.region(firstMeaningfulText(section)));
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
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'aria-pressed']
  });
})();
