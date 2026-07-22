(function () {
  const languageChips = [
    { code: 'zh', lang: 'zh-Hant-TW', voiceLangs: ['zh-TW', 'zh-Hant-TW', 'zh'], match: /繁中|繁體|中文|zh/i, spoken: '繁體中文' },
    { code: 'tw', lang: 'zh-Hant-TW', voiceLangs: ['zh-TW', 'zh-Hant-TW', 'zh'], match: /臺語|台語|taigi|tw/i, spoken: '臺語' },
    { code: 'hak', lang: 'zh-Hant-TW', voiceLangs: ['zh-TW', 'zh-Hant-TW', 'zh'], match: /客語|hakka/i, spoken: '客語' },
    { code: 'en', lang: 'en-US', voiceLangs: ['en-US', 'en-GB', 'en'], match: /^en$|english/i, spoken: 'English' },
    { code: 'ja', lang: 'ja-JP', voiceLangs: ['ja-JP', 'ja'], match: /日本語|日文|japanese|ja/i, spoken: '日本語' },
    { code: 'ko', lang: 'ko-KR', voiceLangs: ['ko-KR', 'ko'], match: /한국어|韓文|korean|ko/i, spoken: '한국어' },
    { code: 'vi', lang: 'vi-VN', voiceLangs: ['vi-VN', 'vi'], match: /^vi$|vietnam|tiếng việt|越南/i, spoken: 'Tiếng Việt' },
    { code: 'id', lang: 'id-ID', voiceLangs: ['id-ID', 'id'], match: /^id$|indonesia|印尼/i, spoken: 'Bahasa Indonesia' },
    { code: 'th', lang: 'th-TH', voiceLangs: ['th-TH', 'th'], match: /^th$|thai|泰語|ภาษาไทย/i, spoken: 'ภาษาไทย' }
  ];

  const roleLabels = {
    passenger: {
      zh: '我是旅客',
      tw: 'Guá sī lú-kheh',
      hak: 'Ngai he li-hak',
      en: 'Passenger',
      ja: '乗客',
      ko: '승객',
      vi: 'Hành khách',
      id: 'Penumpang',
      th: 'ผู้โดยสาร'
    },
    staff: {
      zh: '站務 / 主管',
      tw: 'Chām-bū / chú-koán',
      hak: 'Zam-vu / zhu-gon',
      en: 'Station staff / supervisor',
      ja: '駅係員 / 管理者',
      ko: '역무원 / 관리자',
      vi: 'Nhân viên nhà ga / giám sát',
      id: 'Petugas stasiun / supervisor',
      th: 'เจ้าหน้าที่สถานี / หัวหน้างาน'
    }
  };

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

  function roleTypeFor(element) {
    const service = element && element.closest ? element.closest('.mp-service') : null;
    if (!service) return null;
    const label = textOf(service).toLowerCase();
    if (/旅客|passenger|hành khách|penumpang|ผู้โดยสาร|乗客|승객/i.test(label)) return 'passenger';
    if (/站務|主管|station staff|supervisor|nhân viên|giám sát|petugas|เจ้าหน้าที่|หัวหน้างาน|駅係員|管理者|역무원|관리자/i.test(label)) return 'staff';
    return null;
  }

  function allowedSpeechTarget(element) {
    if (!element || !element.closest) return null;

    const chip = element.closest('.mp-lang-chip');
    if (chip) return { type: 'language', element: chip };

    const access = element.closest('.mp-access-vision, .mp-access-hearing');
    if (access) return { type: access.classList.contains('mp-access-vision') ? 'vision' : 'hearing', element: access };

    const roleType = roleTypeFor(element);
    if (roleType) return { type: roleType, element: element.closest('.mp-service') };

    return null;
  }

  function speechFor(element) {
    const chipSpeech = languageChipSpeech(element);
    if (chipSpeech) return chipSpeech;

    const active = activeLanguageInfo();
    const allowed = allowedSpeechTarget(element);
    if (!allowed) return null;

    if (allowed.type === 'passenger' || allowed.type === 'staff') {
      return {
        text: (roleLabels[allowed.type] && roleLabels[allowed.type][active.code]) || firstMeaningfulText(allowed.element),
        lang: active.lang
      };
    }

    const visible = firstMeaningfulText(allowed.element);
    const label = visible || allowed.element.getAttribute('aria-label') || '';
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

  function preferredVoiceFor(lang) {
    if (!window.speechSynthesis || typeof window.speechSynthesis.getVoices !== 'function') return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return null;
    const langLower = (lang || '').toLowerCase();
    const active = languageChips.find((chip) => chip.lang.toLowerCase() === langLower);
    const candidates = active ? active.voiceLangs : [lang];
    for (const candidate of candidates) {
      const normalized = candidate.toLowerCase();
      const exact = voices.find((voice) => (voice.lang || '').toLowerCase() === normalized);
      if (exact) return exact;
    }
    for (const candidate of candidates) {
      const prefix = candidate.toLowerCase().split('-')[0];
      const prefixMatch = voices.find((voice) => (voice.lang || '').toLowerCase().split('-')[0] === prefix);
      if (prefixMatch) return prefixMatch;
    }
    return null;
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
    if (typeof window.speechSynthesis.resume === 'function') {
      window.speechSynthesis.resume();
    }
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    const voice = preferredVoiceFor(lang);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    allowA11ySpeech = true;
    window.speechSynthesis.speak(utterance);
    allowA11ySpeech = false;
  }

  function unlockSpeechEngine() {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
    if (typeof window.speechSynthesis.resume === 'function') {
      window.speechSynthesis.resume();
    }
    const utterance = new SpeechSynthesisUtterance('');
    utterance.lang = activeLanguageInfo().lang;
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
    unlockSpeechEngine();
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

    document.querySelectorAll('.mp-service').forEach((element) => {
      const roleType = roleTypeFor(element);
      if (!roleType) return;
      const text = (roleLabels[roleType] && roleLabels[roleType][active.code]) || firstMeaningfulText(element);
      setLabel(element, copy.service(text));
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
      enableTalkbackSimulation();
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
