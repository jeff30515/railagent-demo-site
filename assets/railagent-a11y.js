(function () {
  const languages = [
    {
      code: 'zh',
      lang: 'zh-Hant-TW',
      voiceLangs: ['zh-TW', 'zh-Hant-TW', 'zh'],
      match: /繁中|繁體|中文|zh/i,
      spoken: '繁體中文'
    },
    {
      code: 'tw',
      lang: 'nan-TW',
      voiceLangs: ['nan-TW', 'zh-TW', 'zh-Hant-TW'],
      match: /臺語|台語|taigi|tw/i,
      spoken: 'Tâi-gí'
    },
    {
      code: 'hak',
      lang: 'hak-TW',
      voiceLangs: ['hak-TW', 'zh-TW', 'zh-Hant-TW'],
      match: /客語|hakka/i,
      spoken: 'Hak-kâ-ngî'
    },
    {
      code: 'en',
      lang: 'en-US',
      voiceLangs: ['en-US', 'en-GB', 'en'],
      match: /^en$|english/i,
      spoken: 'English'
    },
    {
      code: 'ja',
      lang: 'ja-JP',
      voiceLangs: ['ja-JP', 'ja'],
      match: /日本語|日文|japanese|ja/i,
      spoken: '日本語'
    },
    {
      code: 'ko',
      lang: 'ko-KR',
      voiceLangs: ['ko-KR', 'ko'],
      match: /한국어|韓文|korean|ko/i,
      spoken: '한국어'
    },
    {
      code: 'vi',
      lang: 'vi-VN',
      voiceLangs: ['vi-VN', 'vi'],
      match: /^vi$|vietnam|tiếng việt|越南/i,
      spoken: 'Tiếng Việt'
    },
    {
      code: 'id',
      lang: 'id-ID',
      voiceLangs: ['id-ID', 'id'],
      match: /^id$|indonesia|印尼/i,
      spoken: 'Bahasa Indonesia'
    },
    {
      code: 'th',
      lang: 'th-TH',
      voiceLangs: ['th-TH', 'th'],
      match: /^th$|thai|泰語|ภาษาไทย/i,
      spoken: 'ภาษาไทย'
    }
  ];

  const roleLabels = {
    passenger: {
      zh: '我是旅客',
      tw: 'Guá sī lí-kheh',
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

  const languageGroupLabels = {
    zh: '語言選擇',
    tw: 'Gí-giân sóan-te̍k',
    hak: 'Ngî-ngièn sén-chak',
    en: 'Language selection',
    ja: '言語選択',
    ko: '언어 선택',
    vi: 'Chọn ngôn ngữ',
    id: 'Pilihan bahasa',
    th: 'เลือกภาษา'
  };

  function textOf(element) {
    return (element && element.textContent ? element.textContent : '').replace(/\s+/g, ' ').trim();
  }

  function languageForText(text) {
    const clean = (text || '').trim();
    return languages.find((language) => language.match.test(clean)) || null;
  }

  function activeLanguage() {
    const selected = document.querySelector('.mp-lang-chip.active, .mp-lang-chip[aria-pressed="true"]');
    return languageForText(textOf(selected)) || languages[0];
  }

  function languageChipFor(element) {
    const chip = element && element.closest ? element.closest('.mp-lang-chip') : null;
    if (!chip) return null;
    const language = languageForText(textOf(chip));
    return language ? { element: chip, language } : null;
  }

  function roleFor(element) {
    const service = element && element.closest
      ? element.closest('.mp-gate-card-img.passenger, .mp-gate-card-img.staff, .mp-service')
      : null;
    if (!service) return null;

    if (service.classList.contains('passenger')) {
      return { element: service, role: 'passenger' };
    }
    if (service.classList.contains('staff')) {
      return { element: service, role: 'staff' };
    }

    const savedRole = service.getAttribute('data-railagent-speech-role');
    if (savedRole === 'passenger' || savedRole === 'staff') {
      return { element: service, role: savedRole };
    }

    const label = textOf(service);
    if (/旅客|passenger|hành khách|penumpang|ผู้โดยสาร|乗客|승객/i.test(label)) {
      return { element: service, role: 'passenger' };
    }
    if (/站務|主管|station staff|supervisor|nhân viên|giám sát|petugas|เจ้าหน้าที่|หัวหน้างาน|駅係員|管理者|역무원|관리자/i.test(label)) {
      return { element: service, role: 'staff' };
    }
    return null;
  }

  function speechFor(element) {
    const chip = languageChipFor(element);
    if (chip) {
      return { text: chip.language.spoken, lang: chip.language.lang };
    }

    const role = roleFor(element);
    if (!role) return null;
    const language = activeLanguage();
    return {
      text: roleLabels[role.role][language.code],
      lang: language.lang
    };
  }

  const synthesis = window.speechSynthesis;
  const nativeSpeak = synthesis && typeof synthesis.speak === 'function'
    ? synthesis.speak.bind(synthesis)
    : null;

  // The bundled app still calls its old narration function. Only this controller
  // may reach the browser speech engine, so legacy short and long narration stay silent.
  if (synthesis && nativeSpeak) {
    synthesis.cancel();
    synthesis.speak = function railAgentSpeechGate(utterance) {
      if (utterance && utterance.__railAgentTalkbackSpeech === true) {
        nativeSpeak(utterance);
      }
    };
  }

  function preferredVoice(language) {
    if (!synthesis || typeof synthesis.getVoices !== 'function') return null;
    const voices = synthesis.getVoices() || [];
    for (const candidate of language.voiceLangs) {
      const exact = voices.find((voice) => (voice.lang || '').toLowerCase() === candidate.toLowerCase());
      if (exact) return exact;
    }
    for (const candidate of language.voiceLangs) {
      const prefix = candidate.toLowerCase().split('-')[0];
      const match = voices.find((voice) => (voice.lang || '').toLowerCase().split('-')[0] === prefix);
      if (match) return match;
    }
    return null;
  }

  let lastSpeechKey = '';
  let lastSpeechAt = 0;

  function speak(payload) {
    if (!payload || !payload.text || !nativeSpeak || typeof window.SpeechSynthesisUtterance !== 'function') return;

    const now = Date.now();
    const speechKey = `${payload.lang}:${payload.text}`;
    if (speechKey === lastSpeechKey && now - lastSpeechAt < 550) return;
    lastSpeechKey = speechKey;
    lastSpeechAt = now;

    synthesis.cancel();
    if (typeof synthesis.resume === 'function') synthesis.resume();

    const utterance = new window.SpeechSynthesisUtterance(payload.text);
    utterance.__railAgentTalkbackSpeech = true;
    utterance.lang = payload.lang;
    const language = languages.find((item) => item.lang === payload.lang) || activeLanguage();
    const voice = preferredVoice(language);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.92;
    nativeSpeak(utterance);
  }

  function hide(element) {
    if (!element) return;
    element.hidden = true;
    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('tabindex', '-1');
    element.style.setProperty('display', 'none', 'important');
  }

  function removeLegacyVoiceUi() {
    document.querySelectorAll('.mp-voice-actions, .mp-voice-bar, .mp-voice-btn, .mp-voice-live').forEach((element) => {
      const panel = element.closest('.mp-card, .mp-notice, article');
      if (panel && !panel.matches('#root, .mp-shell, .mp-shell-gate, .mp-gate')) hide(panel);
      hide(element);
    });

    document.querySelectorAll('button').forEach((button) => {
      if (button.closest('.mp-access-btn.vision, .mp-access-vision')) return;
      if (/語音指令|再講一次|停止語音|朗讀|voice command|speak again|stop speech/i.test(textOf(button))) {
        hide(button);
      }
    });
  }

  function labelControls() {
    const selectedLanguage = activeLanguage();
    document.documentElement.lang = selectedLanguage.lang;
    document.documentElement.setAttribute('data-railagent-talkback', 'on');

    document.querySelectorAll('.mp-lang-row, .mp-lang-bar').forEach((group) => {
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', languageGroupLabels[selectedLanguage.code]);
    });

    document.querySelectorAll('.mp-lang-chip').forEach((chip) => {
      const language = languageForText(textOf(chip));
      if (!language) return;
      chip.setAttribute('aria-label', language.spoken);
      chip.setAttribute('lang', language.lang);
    });

    document.querySelectorAll('.mp-gate-card-img.passenger, .mp-gate-card-img.staff, .mp-gate .mp-service, .mp-shell-gate .mp-service').forEach((service, index) => {
      const role = roleFor(service)?.role || (index === 0 ? 'passenger' : index === 1 ? 'staff' : null);
      if (!role) return;
      service.setAttribute('data-railagent-speech-role', role);
      service.setAttribute('aria-label', roleLabels[role][selectedLanguage.code]);
      service.setAttribute('lang', selectedLanguage.lang);
    });

    document.querySelectorAll('.mp-access-btn.vision, .mp-access-vision').forEach((control) => {
      control.hidden = false;
      control.removeAttribute('aria-hidden');
      control.style.removeProperty('display');
      if (control.getAttribute('aria-pressed') !== 'true') {
        control.setAttribute('aria-pressed', 'true');
      }
      control.setAttribute('data-talkback-enabled', 'true');
    });

    removeLegacyVoiceUi();
  }

  function announceEvent(event) {
    const payload = speechFor(event.target);
    if (payload) speak(payload);
  }

  let enhancementScheduled = false;
  function scheduleEnhancement() {
    if (enhancementScheduled) return;
    enhancementScheduled = true;
    window.requestAnimationFrame(() => {
      enhancementScheduled = false;
      labelControls();
    });
  }

  document.documentElement.setAttribute('data-railagent-talkback', 'on');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleEnhancement, { once: true });
  } else {
    scheduleEnhancement();
  }

  document.addEventListener('mouseover', announceEvent, true);
  document.addEventListener('focusin', announceEvent, true);
  document.addEventListener('click', (event) => {
    if (event.target && event.target.closest && event.target.closest('.mp-access-btn.vision, .mp-access-vision')) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      scheduleEnhancement();
      return;
    }
    announceEvent(event);
    window.setTimeout(scheduleEnhancement, 0);
  }, true);

  new MutationObserver(scheduleEnhancement).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'aria-pressed']
  });
})();
