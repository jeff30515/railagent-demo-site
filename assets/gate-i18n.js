(function () {
  const DEFAULT_LANGUAGE = 'zh-TW';
  const SUPPORTED_LANGUAGES = ['zh-TW', 'nan', 'hak', 'en', 'ja', 'ko', 'vi', 'id', 'th'];
  const STORAGE_KEY = 'railagent.uiLanguage';
  const ACTIVE_CHIP_SELECTOR = '.mp-lang-chip.active, .mp-lang-chip[aria-pressed="true"]';
  const LANGUAGE_OPTIONS = [
    { value: 'zh-TW', short: '繁中', labels: { 'zh-TW': '繁體中文', en: 'Traditional Chinese' } },
    { value: 'nan', short: '台語', labels: { 'zh-TW': '台語', en: 'Taiwanese' }, aliases: ['臺語'] },
    { value: 'hak', short: '客家語', labels: { 'zh-TW': '客家語', en: 'Hakka' }, aliases: ['客語'] },
    { value: 'en', short: 'EN', labels: { 'zh-TW': '英文', en: 'English' } },
    { value: 'ja', short: '日本語', labels: { 'zh-TW': '日文', en: 'Japanese' } },
    { value: 'ko', short: '한국어', labels: { 'zh-TW': '韓文', en: 'Korean' } },
    { value: 'vi', short: 'VI', labels: { 'zh-TW': '越南文', en: 'Vietnamese' }, aliases: ['Tiếng Việt'] },
    { value: 'id', short: 'ID', labels: { 'zh-TW': '印尼文', en: 'Indonesian' }, aliases: ['Bahasa Indonesia'] },
    { value: 'th', short: 'TH', labels: { 'zh-TW': '泰文', en: 'Thai' }, aliases: ['ภาษาไทย'] },
  ];
  const LANGUAGE_ALIASES = {
    zh: 'zh-TW',
    'zh-tw': 'zh-TW',
    'zh-hant': 'zh-TW',
    'zh-hant-tw': 'zh-TW',
    tw: 'nan',
    'nan-tw': 'nan',
    'hak-tw': 'hak',
    'en-us': 'en',
    'ja-jp': 'ja',
    'ko-kr': 'ko',
    'vi-vn': 'vi',
    'id-id': 'id',
    'th-th': 'th',
  };
  const DOCUMENT_LANG = {
    'zh-TW': 'zh-Hant-TW',
    nan: 'nan-TW',
    hak: 'hak-TW',
    en: 'en-US',
    ja: 'ja-JP',
    ko: 'ko-KR',
    vi: 'vi-VN',
    id: 'id-ID',
    th: 'th-TH',
  };
  const COPY = {
    'zh-TW': {
      mainAria: 'RailAgent App 入口',
      title: '旅途中的服務夥伴',
      languageKicker: '語言',
      langAria: '語言友善 · 選擇介面語言',
      accessAria: '無障礙模式',
      hearingLabel: '聽障友善',
      hearingHint: '文字／視覺優先',
      hearingAria: '聽障友善 · 文字與視覺提醒優先',
      hearingTitle: '聽障友善 · 文字與視覺提醒優先（再按一次取消）',
      visionLabel: '視障友善',
      visionHint: '語音導讀',
      visionAria: '視障友善 · 語音導讀',
      visionTitle: '視障友善 · 語音導讀（再按一次取消）',
      footerProduct: 'RailAgent',
      version: 'v2025.3.2 · 繁體中文',
    },
    nan: {
      mainAria: 'RailAgent App 入口',
      title: '旅途中的服務夥伴',
      languageKicker: '語言',
      langAria: '語言友善 · 揀介面語言',
      accessAria: '無障礙模式',
      hearingLabel: '聽障友善',
      hearingHint: '文字／視覺優先',
      hearingAria: '聽障友善 · 文字佮視覺提醒優先',
      hearingTitle: '聽障友善 · 文字佮視覺提醒優先（閣撳一擺取消）',
      visionLabel: '視障友善',
      visionHint: '語音導讀',
      visionAria: '視障友善 · 語音導讀',
      visionTitle: '視障友善 · 語音導讀（閣撳一擺取消）',
      footerProduct: 'RailAgent',
      version: 'v2025.3.2 · 台語',
    },
    hak: {
      mainAria: 'RailAgent App 入口',
      title: '旅途中的服務夥伴',
      languageKicker: '語言',
      langAria: '語言友善 · 選擇介面語言',
      accessAria: '無障礙模式',
      hearingLabel: '聽障友善',
      hearingHint: '文字／視覺優先',
      hearingAria: '聽障友善 · 文字摎視覺提醒優先',
      hearingTitle: '聽障友善 · 文字摎視覺提醒優先（再按一次取消）',
      visionLabel: '視障友善',
      visionHint: '語音導讀',
      visionAria: '視障友善 · 語音導讀',
      visionTitle: '視障友善 · 語音導讀（再按一次取消）',
      footerProduct: 'RailAgent',
      version: 'v2025.3.2 · 客家語',
    },
    en: {
      mainAria: 'RailAgent app entry',
      title: 'Your travel service partner',
      languageKicker: 'Language',
      langAria: 'Language friendly · choose interface language',
      accessAria: 'Accessibility mode',
      hearingLabel: 'Hearing friendly',
      hearingHint: 'Text and visual first',
      hearingAria: 'Hearing friendly · prioritize text and visual alerts',
      hearingTitle: 'Hearing friendly · prioritize text and visual alerts (press again to cancel)',
      visionLabel: 'Vision friendly',
      visionHint: 'Voice guidance',
      visionAria: 'Vision friendly · voice guidance',
      visionTitle: 'Vision friendly · voice guidance (press again to cancel)',
      footerProduct: 'RailAgent',
      version: 'v2025.3.2 · English',
    },
    ja: {
      mainAria: 'RailAgent アプリ入口',
      title: '旅のサービスパートナー',
      languageKicker: '言語',
      langAria: '言語対応 · 表示言語を選択',
      accessAria: 'アクセシビリティモード',
      hearingLabel: '聴覚サポート',
      hearingHint: '文字と視覚を優先',
      hearingAria: '聴覚サポート · 文字と視覚通知を優先',
      hearingTitle: '聴覚サポート · 文字と視覚通知を優先（もう一度押すと解除）',
      visionLabel: '視覚サポート',
      visionHint: '音声案内',
      visionAria: '視覚サポート · 音声案内',
      visionTitle: '視覚サポート · 音声案内（もう一度押すと解除）',
      footerProduct: 'RailAgent',
      version: 'v2025.3.2 · 日本語',
    },
    ko: {
      mainAria: 'RailAgent 앱 입구',
      title: '여행 서비스 파트너',
      languageKicker: '언어',
      langAria: '언어 지원 · 인터페이스 언어 선택',
      accessAria: '접근성 모드',
      hearingLabel: '청각 지원',
      hearingHint: '문자와 시각 우선',
      hearingAria: '청각 지원 · 문자와 시각 알림 우선',
      hearingTitle: '청각 지원 · 문자와 시각 알림 우선(다시 누르면 해제)',
      visionLabel: '시각 지원',
      visionHint: '음성 안내',
      visionAria: '시각 지원 · 음성 안내',
      visionTitle: '시각 지원 · 음성 안내(다시 누르면 해제)',
      footerProduct: 'RailAgent',
      version: 'v2025.3.2 · 한국어',
    },
    vi: {
      mainAria: 'Lối vào ứng dụng RailAgent',
      title: 'Đồng hành dịch vụ trên hành trình',
      languageKicker: 'Ngôn ngữ',
      langAria: 'Hỗ trợ ngôn ngữ · chọn ngôn ngữ giao diện',
      accessAria: 'Chế độ tiếp cận',
      hearingLabel: 'Hỗ trợ nghe',
      hearingHint: 'Ưu tiên chữ và hình',
      hearingAria: 'Hỗ trợ nghe · ưu tiên cảnh báo chữ và hình',
      hearingTitle: 'Hỗ trợ nghe · ưu tiên cảnh báo chữ và hình (nhấn lại để hủy)',
      visionLabel: 'Hỗ trợ nhìn',
      visionHint: 'Hướng dẫn giọng nói',
      visionAria: 'Hỗ trợ nhìn · hướng dẫn giọng nói',
      visionTitle: 'Hỗ trợ nhìn · hướng dẫn giọng nói (nhấn lại để hủy)',
      footerProduct: 'RailAgent',
      version: 'v2025.3.2 · Tiếng Việt',
    },
    id: {
      mainAria: 'Pintu masuk aplikasi RailAgent',
      title: 'Mitra layanan perjalanan Anda',
      languageKicker: 'Bahasa',
      langAria: 'Ramah bahasa · pilih bahasa antarmuka',
      accessAria: 'Mode aksesibilitas',
      hearingLabel: 'Ramah pendengaran',
      hearingHint: 'Teks dan visual dulu',
      hearingAria: 'Ramah pendengaran · utamakan peringatan teks dan visual',
      hearingTitle: 'Ramah pendengaran · utamakan peringatan teks dan visual (tekan lagi untuk batal)',
      visionLabel: 'Ramah penglihatan',
      visionHint: 'Panduan suara',
      visionAria: 'Ramah penglihatan · panduan suara',
      visionTitle: 'Ramah penglihatan · panduan suara (tekan lagi untuk batal)',
      footerProduct: 'RailAgent',
      version: 'v2025.3.2 · Bahasa Indonesia',
    },
    th: {
      mainAria: 'ทางเข้าแอป RailAgent',
      title: 'คู่หูบริการตลอดการเดินทาง',
      languageKicker: 'ภาษา',
      langAria: 'เป็นมิตรด้านภาษา · เลือกภาษาหน้าจอ',
      accessAria: 'โหมดการเข้าถึง',
      hearingLabel: 'เป็นมิตรต่อผู้มีปัญหาการได้ยิน',
      hearingHint: 'ข้อความและภาพก่อน',
      hearingAria: 'เป็นมิตรต่อผู้มีปัญหาการได้ยิน · ให้ความสำคัญกับข้อความและภาพ',
      hearingTitle: 'เป็นมิตรต่อผู้มีปัญหาการได้ยิน · ให้ความสำคัญกับข้อความและภาพ (กดอีกครั้งเพื่อยกเลิก)',
      visionLabel: 'เป็นมิตรต่อผู้มีปัญหาการมองเห็น',
      visionHint: 'เสียงนำทาง',
      visionAria: 'เป็นมิตรต่อผู้มีปัญหาการมองเห็น · เสียงนำทาง',
      visionTitle: 'เป็นมิตรต่อผู้มีปัญหาการมองเห็น · เสียงนำทาง (กดอีกครั้งเพื่อยกเลิก)',
      footerProduct: 'RailAgent',
      version: 'v2025.3.2 · ภาษาไทย',
    },
  };

  let observing = false;
  let applying = false;

  function normalizeLanguage(language) {
    if (SUPPORTED_LANGUAGES.includes(language)) return language;
    const normalized = String(language || '').trim().toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(normalized)) return normalized;
    return LANGUAGE_ALIASES[normalized] || DEFAULT_LANGUAGE;
  }

  function getLanguageOption(language) {
    return LANGUAGE_OPTIONS.find((option) => option.value === normalizeLanguage(language)) || LANGUAGE_OPTIONS[0];
  }

  function optionFromLabel(label) {
    const normalized = String(label || '').trim();
    if (!normalized) return null;
    return LANGUAGE_OPTIONS.find((option) => {
      return (
        option.short === normalized ||
        (option.aliases || []).includes(normalized) ||
        Object.keys(option.labels).some((key) => option.labels[key] === normalized)
      );
    }) || null;
  }

  function readLanguageFromNode(node) {
    if (!node) return '';
    const datasetLanguage = node.dataset && (node.dataset.lang || node.dataset.language || node.dataset.passengerLanguage);
    if (datasetLanguage) return datasetLanguage;
    if (typeof node.getAttribute === 'function') {
      const attributeLanguage =
        node.getAttribute('data-lang') ||
        node.getAttribute('data-language') ||
        node.getAttribute('data-passenger-language') ||
        node.getAttribute('lang') ||
        '';
      if (attributeLanguage) return attributeLanguage;
      const ariaOption = optionFromLabel(node.getAttribute('aria-label'));
      if (ariaOption) return ariaOption.value;
    }
    const textOption = optionFromLabel(node.textContent);
    if (textOption) return textOption.value;
    return node.lang || '';
  }

  function findActiveChip(root) {
    return root && typeof root.querySelector === 'function' && root.querySelector(ACTIVE_CHIP_SELECTOR);
  }

  function storageLanguage() {
    try {
      return window.localStorage && window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return '';
    }
  }

  function getLanguage(root) {
    const documentRef = window.document || null;
    const scoped = root || (documentRef && documentRef.body);
    const chipLanguage = readLanguageFromNode(findActiveChip(scoped)) || readLanguageFromNode(findActiveChip(documentRef));
    if (chipLanguage) return normalizeLanguage(chipLanguage);
    const stored = storageLanguage();
    if (stored) return normalizeLanguage(stored);
    if (documentRef && documentRef.documentElement) return normalizeLanguage(readLanguageFromNode(documentRef.documentElement));
    return DEFAULT_LANGUAGE;
  }

  function text(node, value) {
    if (!node || node.textContent === value) return false;
    node.textContent = value;
    return true;
  }

  function attr(node, name, value) {
    if (!node || typeof node.setAttribute !== 'function' || node.getAttribute(name) === value) return false;
    node.setAttribute(name, value);
    return true;
  }

  function removeInjectedTagline(hero) {
    const tagline = hero && hero.querySelector && hero.querySelector('[data-gate-i18n-tagline]');
    if (!tagline || typeof tagline.remove !== 'function') return false;
    tagline.remove();
    return true;
  }

  function localizeLanguageChips(gate, language) {
    const row = gate && gate.querySelector && gate.querySelector('.mp-lang-row');
    if (!row || typeof row.querySelectorAll !== 'function') return false;
    let changed = false;
    if (!/\bmp-lang-row-fixed\b/.test(row.className || '')) {
      row.className = `${row.className || ''} mp-lang-row-fixed`.trim();
      changed = true;
    }
    const chips = row.querySelectorAll('.mp-lang-chip');
    LANGUAGE_OPTIONS.forEach((option, index) => {
      const chip = chips[index];
      if (!chip) return;
      const label = option.labels[language] || option.labels.en;
      changed = text(chip, option.short) || changed;
      changed = attr(chip, 'data-lang', option.value) || changed;
      changed = attr(chip, 'aria-label', label) || changed;
    });
    return changed;
  }

  function localizeAccess(gate, copy) {
    let changed = false;
    const access = gate && gate.querySelector && gate.querySelector('.mp-access-footer');
    changed = attr(access, 'aria-label', copy.accessAria) || changed;
    const hearing = gate && gate.querySelector && gate.querySelector('.mp-access-btn.hearing');
    changed = attr(hearing, 'aria-label', copy.hearingAria) || changed;
    changed = attr(hearing, 'title', copy.hearingTitle) || changed;
    changed = text(hearing && hearing.querySelector && hearing.querySelector('strong'), copy.hearingLabel) || changed;
    changed = text(hearing && hearing.querySelector && hearing.querySelector('small'), copy.hearingHint) || changed;
    const vision = gate && gate.querySelector && gate.querySelector('.mp-access-btn.vision');
    changed = attr(vision, 'aria-label', copy.visionAria) || changed;
    changed = attr(vision, 'title', copy.visionTitle) || changed;
    changed = text(vision && vision.querySelector && vision.querySelector('strong'), copy.visionLabel) || changed;
    changed = text(vision && vision.querySelector && vision.querySelector('small'), copy.visionHint) || changed;
    return changed;
  }

  function findGate(scope) {
    if (!scope) return null;
    if (typeof scope.querySelector === 'function') return scope.querySelector('.mp-phase-gate');
    return null;
  }

  function apply(root, language) {
    const documentRef = window.document || null;
    const scope = root || (documentRef && (documentRef.body || documentRef.documentElement));
    const gate = findGate(scope);
    if (!gate) return false;
    const normalizedLanguage = language === undefined ? getLanguage(scope) : normalizeLanguage(language);
    const copy = COPY[normalizedLanguage] || COPY[DEFAULT_LANGUAGE];
    let changed = false;
    applying = true;
    changed = attr(gate, 'aria-label', copy.mainAria) || changed;
    const hero = gate.querySelector('.mp-gate-hero');
    changed = text(hero && hero.querySelector && hero.querySelector('h1'), copy.title) || changed;
    changed = removeInjectedTagline(hero) || changed;
    changed = text(gate.querySelector('.mp-lang-kicker'), copy.languageKicker) || changed;
    changed = attr(gate.querySelector('.mp-lang-bar'), 'aria-label', copy.langAria) || changed;
    changed = localizeLanguageChips(gate, normalizedLanguage) || changed;
    changed = localizeAccess(gate, copy) || changed;
    changed = text(gate.querySelector('.mp-gate-footer strong'), copy.footerProduct) || changed;
    changed = text(gate.querySelector('.mp-gate-footer span'), copy.version) || changed;
    if (documentRef && documentRef.documentElement) documentRef.documentElement.lang = DOCUMENT_LANG[normalizedLanguage];
    applying = false;
    return changed;
  }

  function observe() {
    const documentRef = window.document;
    if (!documentRef) return false;
    const root = documentRef.body || documentRef.documentElement;
    if (!root) return false;
    if (observing) return true;
    if (
      typeof documentRef.addEventListener !== 'function' &&
      typeof window.MutationObserver !== 'function'
    ) {
      return false;
    }
    let scheduled = false;
    let pendingLanguage;
    const scheduleApply = (language) => {
      pendingLanguage = language || pendingLanguage;
      if (scheduled) return;
      scheduled = true;
      const run = () => {
        scheduled = false;
        const languageToApply = pendingLanguage;
        pendingLanguage = undefined;
        apply(root, languageToApply);
      };
      if (typeof window.setTimeout === 'function') window.setTimeout(run, 0);
      else run();
    };
    scheduleApply();
    if (typeof documentRef.addEventListener === 'function') {
      documentRef.addEventListener('click', (event) => {
        const target = event && event.target;
        const chip = target && typeof target.closest === 'function' ? target.closest('.mp-lang-chip') : null;
        if (chip) scheduleApply(readLanguageFromNode(chip));
      });
    }
    observing = true;
    if (typeof window.MutationObserver !== 'function') return true;
    const observer = new window.MutationObserver(() => {
      if (!applying) scheduleApply();
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'aria-pressed', 'aria-label'],
    });
    return true;
  }

  window.GateI18n = {
    SUPPORTED_LANGUAGES,
    LANGUAGE_OPTIONS,
    COPY,
    getLanguageOption,
    getLanguage,
    apply,
    observe,
  };
  observe();
})();
