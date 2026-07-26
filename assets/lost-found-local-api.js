(() => {
  'use strict';

  const DEFAULT_API_BASE_URL = 'http://127.0.0.1:7071';

  function resolveApiBaseUrl(search) {
    const configured = new URLSearchParams(search).get('apiBaseUrl');
    try {
      return new URL(configured || DEFAULT_API_BASE_URL).toString();
    } catch {
      return new URL(DEFAULT_API_BASE_URL).toString();
    }
  }

  const apiBaseUrl = resolveApiBaseUrl(window.location.search);
  const lostFoundEndpoint = new URL('/api/lost-found/match', apiBaseUrl).toString();
  const chatEndpoint = new URL('/api/passenger-chat', apiBaseUrl).toString();
  const stationEndpoint = new URL('/api/friendly-transfer/station', apiBaseUrl).toString();
  const routeEndpoint = new URL('/api/friendly-transfer/route', apiBaseUrl).toString();

  const localeApi = window.RailAgentPassengerRuntimeLocales;

  function currentLocale() {
    const language = document.documentElement.lang;
    return {
      language: localeApi.normalizeLanguage(language),
      copy: localeApi.getRuntimeCopy(language),
      pageLabels: localeApi.getPageLabels(language),
    };
  }

  function installStyles() {
    if (document.getElementById('railagent-local-api-style')) return;
    const style = document.createElement('style');
    style.id = 'railagent-local-api-style';
    style.textContent = `
      [data-railagent-local-hidden="true"] { display: none !important; }
      .railagent-track-lost-found { background: #127d82; border: 0; border-radius: 12px; color: #fff; cursor: pointer; font: inherit; font-weight: 700; margin-top: 12px; min-height: 42px; padding: 9px 14px; }
      .railagent-track-lost-found:disabled { cursor: default; opacity: .72; }
      #railagent-local-chat-launcher {
        align-items: center; background: #ffffff; border: 0; border-radius: 22px;
        box-shadow: 0 9px 24px rgba(15, 55, 82, .12); color: #123052;
        cursor: pointer; display: flex; gap: 14px; margin-top: 14px; min-height: 94px;
        padding: 18px 20px; text-align: left; width: 100%;
      }
      #railagent-local-chat-launcher:before {
        align-items: center; background: #168b8d; border-radius: 15px; color: white;
        content: "AI"; display: flex; font-size: 14px; font-weight: 800;
        height: 48px; justify-content: center; width: 48px;
      }
      #railagent-local-chat-launcher strong { display: block; font-size: 17px; }
      #railagent-local-chat-launcher small { color: #64748b; display: block; font-size: 13px; margin-top: 4px; }
      #railagent-local-chat[hidden] { display: none; }
      #railagent-local-chat { align-items: center; background: rgba(8, 20, 31, .48); display: flex; inset: 0; justify-content: center; padding: 20px; position: fixed; z-index: 10000; }
      .railagent-chat-panel { background: #f8f6f0; border-radius: 24px; box-shadow: 0 24px 64px rgba(0,0,0,.28); display: flex; flex-direction: column; height: min(720px, calc(100vh - 40px)); max-width: 420px; overflow: hidden; width: 100%; }
      .railagent-chat-header { align-items: center; background: #127d82; color: white; display: flex; justify-content: space-between; padding: 17px 18px; }
      .railagent-chat-header h2 { font-size: 19px; margin: 0; }
      .railagent-chat-header p { font-size: 12px; margin: 3px 0 0; opacity: .85; }
      .railagent-chat-close { background: transparent; border: 0; color: white; cursor: pointer; font-size: 16px; font-weight: 700; padding: 8px; }
      .railagent-chat-messages { display: flex; flex: 1; flex-direction: column; gap: 12px; overflow-y: auto; padding: 18px; }
      .railagent-chat-message { border-radius: 16px; line-height: 1.5; max-width: 86%; padding: 11px 13px; white-space: pre-wrap; word-break: break-word; }
      .railagent-chat-user { align-self: flex-end; background: #167f84; color: white; }
      .railagent-chat-assistant { align-self: flex-start; background: white; box-shadow: 0 2px 10px rgba(15, 55, 82, .09); color: #18334c; }
      .railagent-chat-status { color: #64748b; font-size: 13px; }
      .railagent-chat-form { background: white; border-top: 1px solid #e6e9e7; display: flex; gap: 8px; padding: 12px; }
      .railagent-chat-form textarea { border: 1px solid #cbd5e1; border-radius: 12px; font: inherit; min-height: 44px; padding: 10px; resize: none; width: 100%; }
      .railagent-chat-form button { background: #127d82; border: 0; border-radius: 12px; color: white; cursor: pointer; font-weight: 700; padding: 0 15px; }
      .railagent-chat-form button:disabled { opacity: .6; }
      #railagent-friendly-transfer-tools { display: grid; gap: 14px; margin-top: 16px; }
      .railagent-transfer-help { align-items: center; background: #127d82; border: 0; border-radius: 18px; box-shadow: 0 10px 22px rgba(18, 125, 130, .22); color: #fff; cursor: pointer; display: flex; font: inherit; font-size: 18px; font-weight: 800; justify-content: center; min-height: 76px; padding: 18px; width: 100%; }
      .railagent-transfer-route { background: #fff; border-radius: 18px; box-shadow: 0 8px 20px rgba(15, 55, 82, .08); padding: 18px; }
      .railagent-transfer-route h3 { color: #123052; font-size: 17px; margin: 0; }
      .railagent-transfer-route p { color: #64748b; font-size: 13px; line-height: 1.5; margin: 6px 0 14px; }
      .railagent-transfer-field { display: grid; gap: 6px; margin-top: 12px; }
      .railagent-transfer-field label { color: #123052; font-size: 14px; font-weight: 700; }
      .railagent-transfer-field input { border: 1px solid #cbd5e1; border-radius: 12px; font: inherit; min-height: 46px; padding: 0 12px; }
      .railagent-transfer-route button, .railagent-transfer-dialog button { background: #127d82; border: 0; border-radius: 12px; color: #fff; cursor: pointer; font: inherit; font-weight: 700; min-height: 46px; padding: 10px 14px; }
      .railagent-transfer-route button { margin-top: 14px; width: 100%; }
      .railagent-transfer-answer { background: #eef9f8; border-radius: 12px; color: #18334c; line-height: 1.6; margin-top: 14px; padding: 12px; white-space: pre-wrap; }
      #railagent-transfer-dialog[hidden] { display: none; }
      #railagent-transfer-dialog { align-items: center; background: rgba(8, 20, 31, .48); display: flex; inset: 0; justify-content: center; padding: 20px; position: fixed; z-index: 10001; }
      .railagent-transfer-dialog { background: #f8f6f0; border-radius: 22px; box-shadow: 0 24px 64px rgba(0, 0, 0, .28); max-width: 420px; padding: 22px; width: 100%; }
      .railagent-transfer-dialog h2 { color: #123052; font-size: 20px; margin: 0; }
      .railagent-transfer-dialog p { color: #52677b; line-height: 1.55; }
      .railagent-transfer-dialog input { border: 1px solid #cbd5e1; border-radius: 12px; box-sizing: border-box; font: inherit; min-height: 48px; padding: 0 12px; width: 100%; }
      .railagent-transfer-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
      .railagent-transfer-actions .railagent-transfer-secondary { background: #fff; border: 1px solid #127d82; color: #127d82; }
      .railagent-transfer-call { background: #127d82; border-radius: 12px; color: #fff; display: block; font-weight: 700; margin-top: 14px; padding: 13px; text-align: center; text-decoration: none; }
      .railagent-transfer-close { background: transparent !important; color: #52677b !important; float: right; min-height: auto !important; padding: 4px !important; }
    `;
    document.head.appendChild(style);
  }

  function markDemoContent() {
    document.querySelectorAll('article[aria-label]').forEach((element) => {
      if ((element.getAttribute('aria-label') || '').includes('\u65e2\u6709\u5354\u5c0b\u6848\u4ef6')) {
        element.dataset.railagentLocalHidden = 'true';
      }
    });
  }

  function removeLostItemSourceNotice() {
    const page = document.querySelector('[data-service-page="lost-item"]');
    if (!page) return;

    const sourceLink = [...page.querySelectorAll('a')].find((link) =>
      /railway\.gov\.tw\/tra-tip-web\/tip\/tip00E\/tipE11\/query/i.test(link.href)
    );
    if (sourceLink) sourceLink.closest('p')?.remove();
  }

  function installChatLauncher(copy, pageLabels, language) {
    const serviceButtons = [...document.querySelectorAll('.mp-service-list button.mp-service')];
    const facilityButton = serviceButtons.find((button) =>
      button.textContent.trim().includes(pageLabels.facilityTitle)
    );
    if (!facilityButton) return;

    const passengerHome = facilityButton.closest('section.mp-stack');
    [...(passengerHome?.children || [])].forEach((element) => {
      if (element.matches('button.mp-primary') || element.matches('button.mp-secondary')) {
        element.remove();
      }
    });

    const existing = document.getElementById('railagent-local-chat-launcher');
    if (existing) {
      if (existing.dataset.locale !== language) {
        existing.dataset.locale = language;
        existing.innerHTML = `<span><strong>${copy.askRailAgent}</strong><small>${copy.chatSubtitle}</small></span>`;
      }
      return;
    }
    const launcher = document.createElement('button');
    launcher.id = 'railagent-local-chat-launcher';
    launcher.type = 'button';
    launcher.dataset.locale = language;
    launcher.innerHTML = `<span><strong>${copy.askRailAgent}</strong><small>${copy.chatSubtitle}</small></span>`;
    facilityButton.insertAdjacentElement('afterend', launcher);
  }

  function friendlyTransferPanel(pageLabels) {
    const heading = [...document.querySelectorAll('.mp-hero-block h2')].find(
      (element) => element.textContent.trim() === pageLabels.friendlyTitle,
    );
    const page = heading?.closest('section.mp-stack');
    return page?.querySelector(':scope > section.mp-card.mp-stack') ? page : null;
  }

  function installFriendlyTransferTools(copy, pageLabels, language) {
    const panel = friendlyTransferPanel(pageLabels);
    if (!panel) return;

    [...panel.querySelectorAll('button')].forEach((button) => {
      if (button.textContent.trim() === '\u5efa\u7acb\u5354\u52a9') button.dataset.railagentLocalHidden = 'true';
    });
    [...panel.querySelectorAll('p')].forEach((paragraph) => {
      if ((paragraph.textContent || '').includes('Demo')) paragraph.dataset.railagentLocalHidden = 'true';
    });
    [...panel.querySelectorAll('.mp-card')].forEach((card) => {
      if (card.querySelector('.mp-tags')) card.dataset.railagentLocalHidden = 'true';
    });
    [...panel.querySelectorAll('button')].forEach((button) => {
      if (['\u7e41\u9ad4\u4e2d\u6587', '\u8f2a\u6905', '\u907f\u958b\u6a13\u68af', '\u8f49\u4e58\u9ad8\u9435'].includes(button.textContent.trim())) {
        button.parentElement?.setAttribute('data-railagent-local-hidden', 'true');
      }
    });
    [...panel.querySelectorAll('.mp-tags')].forEach((tagList) => {
      const labels = [...tagList.querySelectorAll('.mp-tag')].map((tag) => tag.textContent.trim());
      if (labels.length === 4 && labels.includes('繁體中文') && labels.includes('輪椅') && labels.includes('避開樓梯') && labels.includes('轉乘高鐵')) {
        tagList.setAttribute('data-railagent-local-hidden', 'true');
        const wrapper = tagList.parentElement;
        if (wrapper && [...wrapper.children].length === 1) {
          wrapper.setAttribute('data-railagent-local-hidden', 'true');
        }
      }
    });
    const legacyTransferTags = [
      String.fromCharCode(0x7e41, 0x9ad4, 0x4e2d, 0x6587),
      String.fromCharCode(0x8f2a, 0x6905),
      String.fromCharCode(0x907f, 0x958b, 0x6a13, 0x68af),
      String.fromCharCode(0x8f49, 0x4e58, 0x9ad8, 0x9435)
    ];
    [...document.querySelectorAll('.mp-tags')].forEach((tagList) => {
      const labels = [...tagList.querySelectorAll('.mp-tag')].map((tag) => tag.textContent.trim());
      if (labels.length === legacyTransferTags.length && legacyTransferTags.every((label) => labels.includes(label))) {
        tagList.closest('.mp-card')?.setAttribute('data-railagent-local-hidden', 'true');
      }
    });
    const existing = document.getElementById('railagent-friendly-transfer-tools');
    if (existing?.dataset.locale === language) return;
    existing?.remove();

    const tools = document.createElement('section');
    tools.id = 'railagent-friendly-transfer-tools';
    tools.dataset.locale = language;
    tools.setAttribute('aria-label', copy.transferHelp);
    tools.innerHTML = `
      <button type="button" class="railagent-transfer-help" id="railagent-transfer-help-button" data-railagent-transfer-control="transfer-help" data-railagent-speech-text="${copy.transferHelp}\uff0c\u9078\u64c7\u5f8c\u53ef\u4ee5\u8aaa\u51fa\u6240\u5728\u8eca\u7ad9\uff0c\u78ba\u8a8d\u5f8c\u986f\u793a\u7ad9\u52d9\u96fb\u8a71\u3002">${copy.transferHelp}</button>
      <form class="railagent-transfer-route" id="railagent-transfer-route-form">
        <h3>${copy.transferRoute}</h3>
        <p>${copy.transferRouteLead}</p>
        <div class="railagent-transfer-field"><label for="railagent-route-origin">${copy.routeOrigin}</label><input id="railagent-route-origin" data-railagent-transfer-control="route-origin" data-railagent-speech-text="${copy.routeOriginGuide}" maxlength="200" placeholder="${copy.routePlaceholderOrigin}" required></div>
        <div class="railagent-transfer-field"><label for="railagent-route-destination">${copy.routeDestination}</label><input id="railagent-route-destination" data-railagent-transfer-control="route-destination" data-railagent-speech-text="${copy.routeDestinationGuide}" maxlength="200" placeholder="${copy.routePlaceholderDestination}" required></div>
        <button type="submit" data-railagent-transfer-control="route-submit" data-railagent-speech-text="${copy.routeSubmit}\uff0c\u5c07\u4f7f\u7528\u672c\u6a5f AI \u63d0\u4f9b\u8f49\u4e58\u5efa\u8b70\u3002">${copy.routeSubmit}</button>
        <div class="railagent-transfer-answer" data-railagent-transfer-control="route-answer" aria-live="polite" hidden></div>
      </form>`;
    panel.appendChild(tools);
    announceTransfer(copy.transferPageGuide, 'transfer-page');

    const form = tools.querySelector('#railagent-transfer-route-form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const origin = form.querySelector('#railagent-route-origin').value.trim();
      const destination = form.querySelector('#railagent-route-destination').value.trim();
      const submit = form.querySelector('button[type="submit"]');
      const answer = form.querySelector('.railagent-transfer-answer');
      if (!origin || !destination || submit.disabled) return;
      submit.disabled = true;
      answer.hidden = false;
      const activeCopy = currentLocale().copy;
      answer.textContent = activeCopy.routeThinking;
      announceTransfer(activeCopy.routeThinking, 'route-thinking');
      try {
        const response = await fetch(routeEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin, destination })
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
        answer.textContent = body.answer || activeCopy.routeError;
        announceTransfer(answer.textContent, 'route-answer');
      } catch (error) {
        answer.textContent = `${activeCopy.routeError}\n${error.message}`;
        announceTransfer(answer.textContent, 'route-error');
      } finally {
        submit.disabled = false;
      }
    });
  }

  function openFriendlyTransferDialog(copy, language) {
    let overlay = document.getElementById('railagent-transfer-dialog');
    if (overlay?.dataset.locale !== language) {
      overlay?.remove();
      overlay = null;
    }
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'railagent-transfer-dialog';
      overlay.dataset.locale = language;
      overlay.hidden = true;
      overlay.innerHTML = `
        <section class="railagent-transfer-dialog" role="dialog" aria-modal="true" aria-labelledby="railagent-transfer-title">
          <button type="button" class="railagent-transfer-close" aria-label="${copy.close}" data-railagent-transfer-control="close" data-railagent-speech-text="${copy.close}\u8f49\u4e58\u5354\u52a9\u8996\u7a97\u3002">${copy.close}</button>
          <h2 id="railagent-transfer-title">${copy.callTitle}</h2>
          <p>${copy.callLead}</p>
          <form id="railagent-transfer-station-form">
            <label class="railagent-transfer-field" for="railagent-transfer-station"><span>${copy.callLead}</span><input id="railagent-transfer-station" data-railagent-transfer-control="station-input" data-railagent-speech-text="${copy.callLead}" maxlength="200" placeholder="${copy.stationPlaceholder}" required></label>
            <div class="railagent-transfer-actions">
              <button type="button" class="railagent-transfer-secondary" id="railagent-transfer-voice" data-railagent-transfer-control="start-voice" data-railagent-speech-text="${copy.startVoice}\uff0c\u9078\u64c7\u5f8c\u8acb\u8aaa\u51fa\u6240\u5728\u8eca\u7ad9\u3002">${copy.startVoice}</button>
              <button type="submit" data-railagent-transfer-control="find-station" data-railagent-speech-text="${copy.findStation}\uff0c\u78ba\u8a8d\u5f8c\u5c07\u67e5\u8a62\u7ad9\u52d9\u96fb\u8a71\u3002">${copy.findStation}</button>
            </div>
          </form>
          <div id="railagent-transfer-status" aria-live="polite"></div>
          <div id="railagent-transfer-call-result"></div>
        </section>`;
      document.body.appendChild(overlay);
      const close = overlay.querySelector('.railagent-transfer-close');
      const form = overlay.querySelector('#railagent-transfer-station-form');
      const input = overlay.querySelector('#railagent-transfer-station');
      const voice = overlay.querySelector('#railagent-transfer-voice');
      const status = overlay.querySelector('#railagent-transfer-status');
      const callResult = overlay.querySelector('#railagent-transfer-call-result');
      close.addEventListener('click', () => { stopSpeechRecognition(); overlay.hidden = true; });
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
          stopSpeechRecognition();
          overlay.hidden = true;
        }
      });
      if (!speechRecognitionConstructor()) {
        voice.hidden = true;
        status.textContent = copy.voiceUnavailable;
      }
      voice.addEventListener('click', () => startSpeechRecognition(input, status, currentLocale().copy));
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const spokenStation = input.value.trim();
        if (!spokenStation) return;
        const activeCopy = currentLocale().copy;
        status.textContent = activeCopy.stationThinking;
        announceTransfer(activeCopy.stationThinking, 'station-thinking');
        callResult.replaceChildren();
        try {
          const response = await fetch(stationEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spokenStation })
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
          status.textContent = body.confirmation || `${body.station} ${body.phone}`;
          announceTransfer(body.confirmation || status.textContent, 'station-confirmation');
          const call = document.createElement('a');
          call.className = 'railagent-transfer-call';
          call.href = `tel:${String(body.phone || '').replace(/[^+\\d]/g, '')}`;
          call.textContent = `${activeCopy.calling} ${body.phone || ''}`;
          call.setAttribute('data-railagent-transfer-control', 'call-staff');
          call.setAttribute('data-railagent-speech-text', `${activeCopy.calling} ${body.phone || ''}`);
          callResult.appendChild(call);
        } catch (error) {
          status.textContent = `${activeCopy.stationError}\n${error.message}`;
          announceTransfer(status.textContent, 'station-error');
        }
      });
    }
    overlay.hidden = false;
    overlay.querySelector('#railagent-transfer-station')?.focus();
    announceTransfer(copy.callLead, 'station-dialog');
  }

  function speechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition;
  }

  let activeSpeechRecognition = null;

  function startSpeechRecognition(input, status, copy) {
    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      status.textContent = copy.voiceUnavailable;
      return;
    }
    stopSpeechRecognition();
    pauseTalkback();
    const recognition = new Recognition();
    activeSpeechRecognition = recognition;
    let announcement = null;
    recognition.lang = 'zh-TW';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      input.value = event.results[0][0].transcript;
      status.textContent = `${copy.voiceRecognized}${input.value}`;
      announcement = { text: `${copy.voiceRecognized}${input.value}\u3002\u8acb\u9078\u64c7${copy.findStation}\u3002`, cue: 'voice-recognized' };
    };
    recognition.onerror = () => {
      status.textContent = copy.voiceUnavailable;
      announcement = { text: copy.voiceUnavailable, cue: 'voice-error' };
    };
    recognition.onend = () => {
      if (activeSpeechRecognition === recognition) activeSpeechRecognition = null;
      resumeTalkback();
      if (announcement) announceTransfer(announcement.text, announcement.cue);
    };
    status.textContent = copy.voicePrompt;
    try {
      recognition.start();
    } catch (error) {
      status.textContent = copy.voiceUnavailable;
      announcement = { text: copy.voiceUnavailable, cue: 'voice-error' };
      if (activeSpeechRecognition === recognition) activeSpeechRecognition = null;
      resumeTalkback();
      announceTransfer(announcement.text, announcement.cue);
    }
  }

  function stopSpeechRecognition() {
    if (!activeSpeechRecognition) return;
    activeSpeechRecognition.abort();
    activeSpeechRecognition = null;
  }

  function pauseTalkback() {
    window.dispatchEvent(new CustomEvent('railagent:pause-talkback'));
  }

  function resumeTalkback() {
    window.dispatchEvent(new CustomEvent('railagent:resume-talkback'));
  }

  function announceTransfer(text, cue) {
    if (!text) return;
    window.dispatchEvent(new CustomEvent('railagent:announce', { detail: { text, cue } }));
  }

  function clearFriendlyTransferUi() {
    document.getElementById('railagent-friendly-transfer-tools')?.remove();
    document.getElementById('railagent-transfer-dialog')?.remove();
  }

  const TRACKED_CASES_KEY = 'railagent-tracked-lost-found-cases';
  const LEGACY_BACKPACK_EVENT_ID = 'EVT-2026-BQ-0187';

  function readTrackedCases() {
    try {
      const records = JSON.parse(window.localStorage.getItem(TRACKED_CASES_KEY) || '[]');
      return Array.isArray(records) ? records : [];
    } catch {
      return [];
    }
  }

  function saveTrackedCase(record) {
    const records = readTrackedCases();
    if (records.some((entry) => entry.id === record.id)) return false;
    window.localStorage.setItem(TRACKED_CASES_KEY, JSON.stringify([...records, record]));
    return true;
  }

  function removeLegacyBackpackCase() {
    const page = document.querySelector('[aria-label="public own case list"]');
    page?.querySelectorAll('article').forEach((article) => {
      if ((article.textContent || '').includes(LEGACY_BACKPACK_EVENT_ID)) {
        article.remove();
      }
    });
  }

  function syncPublicFeedbackCopy(copy) {
    const page = document.querySelector('[aria-label="public own case list"]');
    const feedbackArticle = [...(page?.querySelectorAll('article') ?? [])].find((article) =>
      article.querySelector('input') && article.querySelector('button.mp-primary')
    );
    if (!feedbackArticle) return;
    const heading = feedbackArticle.querySelector('h3');
    if (heading && heading.textContent !== copy.feedback) heading.textContent = copy.feedback;
    const feedbackLead = feedbackArticle.querySelector('p');
    if (feedbackLead && !feedbackLead.className.split(/\s+/).includes('mp-status')) {
      feedbackArticle.querySelector('p')?.remove();
    }
    [...feedbackArticle.querySelectorAll('p')].forEach((paragraph) => {
      if ((paragraph.textContent || '').startsWith('\u5df2\u8a18\u9304\u56de\u994b\u65bc')) {
        paragraph.textContent = copy.thankYou;
      }
    });
  }

  function renderTrackedCases(copy) {
    const page = document.querySelector('[aria-label="public own case list"]');
    if (!page) return;
    const records = readTrackedCases();
    const signature = JSON.stringify(records);
    let container = document.getElementById('railagent-tracked-lost-found-cases');
    if (container?.dataset.signature === signature) return;
    if (!container) {
      container = document.createElement('section');
      container.id = 'railagent-tracked-lost-found-cases';
      container.className = 'mp-list';
      page.querySelector('.mp-list')?.insertAdjacentElement('afterend', container);
    }
    container.dataset.signature = signature;
    container.replaceChildren(...records.map((record) => {
      const card = document.createElement('article');
      card.className = 'mp-list-item';
      card.innerHTML = `<div class="mp-meta"><span class="mp-status">${copy.tracking}</span><span>${escapeHtml(record.stationName)}</span></div><h3>${escapeHtml(record.title)}</h3><p class="mp-footnote">${copy.pickupDate}\uff1a${escapeHtml(record.pickupDate)}</p><p class="mp-meta">${copy.contact}\uff1a${escapeHtml(record.contactPhone || copy.unknown)}</p>`;
      return card;
    }));
  }

  function syncLocalModeUi() {
    const { copy, pageLabels, language } = currentLocale();
    installStyles();
    markDemoContent();
    installChatLauncher(copy, pageLabels, language);
    installFriendlyTransferTools(copy, pageLabels, language);
    clearStaleLostFoundResult();
    removeLegacyBackpackCase();
    removeLostItemSourceNotice();
    renderTrackedCases(copy);
    syncPublicFeedbackCopy(copy);
    const hasFriendlyTransfer = Boolean(friendlyTransferPanel(pageLabels));
    if (!hasFriendlyTransfer) clearFriendlyTransferUi();
  }

  function clearStaleLostFoundResult() {
    const hasVisibleLostFoundSearch = Boolean(
      document.querySelector('[data-service-page="lost-item"] button.mp-primary')
    );
    if (!hasVisibleLostFoundSearch) {
      document.getElementById('railagent-local-lost-found-result')?.remove();
    }
  }

  function lostItemSearchPanel(button, page) {
    let panel = button.parentElement;
    while (panel && panel !== page) {
      const visibleInputs = [...panel.querySelectorAll('input')].filter((input) => input.offsetParent !== null);
      if (visibleInputs.length >= 7) return panel;
      panel = panel.parentElement;
    }
    return null;
  }

  function addChatMessage(messages, kind, text) {
    const message = document.createElement('div');
    message.className = `railagent-chat-message railagent-chat-${kind}`;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  }

  function openChat(copy, language) {
    let overlay = document.getElementById('railagent-local-chat');
    if (overlay?.dataset.locale !== language) {
      overlay?.remove();
      overlay = null;
    }
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'railagent-local-chat';
      overlay.dataset.locale = language;
      overlay.hidden = true;
      overlay.innerHTML = `
        <section class="railagent-chat-panel" role="dialog" aria-modal="true" aria-labelledby="railagent-chat-title">
          <header class="railagent-chat-header"><div><h2 id="railagent-chat-title">${copy.askRailAgent}</h2><p>${copy.chatSubtitle}</p></div><button class="railagent-chat-close" type="button" aria-label="${copy.close}">${copy.close}</button></header>
          <div class="railagent-chat-messages" aria-live="polite"></div>
          <form class="railagent-chat-form"><textarea maxlength="2000" aria-label="${copy.askRailAgent}" placeholder="${copy.chatPlaceholder}"></textarea><button type="submit">${copy.send}</button></form>
        </section>`;
      document.body.appendChild(overlay);

      const close = overlay.querySelector('.railagent-chat-close');
      const form = overlay.querySelector('.railagent-chat-form');
      const input = form.querySelector('textarea');
      const send = form.querySelector('button[type="submit"]');
      const messages = overlay.querySelector('.railagent-chat-messages');
      close.addEventListener('click', () => { overlay.hidden = true; });
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) overlay.hidden = true;
      });
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const question = input.value.trim();
        if (!question || send.disabled) return;
        addChatMessage(messages, 'user', question);
        input.value = '';
        send.disabled = true;
        const activeCopy = currentLocale().copy;
        const status = addChatMessage(messages, 'status', activeCopy.thinking);
        try {
          const response = await fetch(chatEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: question })
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
          status.remove();
          addChatMessage(messages, 'assistant', body.answer || activeCopy.chatError);
        } catch (error) {
          status.remove();
          addChatMessage(messages, 'assistant', `${activeCopy.chatError}\n${error.message}`);
        } finally {
          send.disabled = false;
          input.focus();
        }
      });
    }
    overlay.hidden = false;
    overlay.querySelector('textarea')?.focus();
  }

  document.addEventListener('DOMContentLoaded', () => {
    syncLocalModeUi();
    new MutationObserver(syncLocalModeUi).observe(document.body, { childList: true, subtree: true });
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const buttonText = button.textContent.trim();
    const { copy, language } = currentLocale();
    if (buttonText === '\u2190 \u8fd4\u56de' || buttonText === '\u9996\u9801') {
      document.getElementById('railagent-local-lost-found-result')?.remove();
      clearFriendlyTransferUi();
    }
    if (button.id === 'railagent-transfer-help-button') {
      event.preventDefault();
      event.stopImmediatePropagation();
      openFriendlyTransferDialog(copy, language);
      return;
    }
    if (button.id === 'railagent-local-chat-launcher') {
      event.preventDefault();
      event.stopImmediatePropagation();
      openChat(copy, language);
      return;
    }
    if (button.matches('.railagent-track-lost-found')) {
      event.preventDefault();
      const record = JSON.parse(decodeURIComponent(button.dataset.railagentTrackedCase || ''));
      saveTrackedCase(record);
      button.textContent = copy.tracked;
      button.disabled = true;
      syncLocalModeUi();
      return;
    }
    const lostItemPage = button.closest('[data-service-page="lost-item"]');
    const searchPanel = lostItemPage ? lostItemSearchPanel(button, lostItemPage) : null;
    const isLostItemSearch =
      lostItemPage &&
      button.matches('button.mp-primary') &&
      searchPanel &&
      !button.matches('.railagent-track-lost-found');

    if (!isLostItemSearch) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void search(button, copy);
  }, true);

  async function search(button, copy) {
    const panel = button.closest('section');
    const inputs = [...(panel?.querySelectorAll('input') ?? [])].filter((input) => input.offsetParent !== null);
    if (inputs.length < 7) {
      render(button, null, copy.missingInput, copy);
      return;
    }
    const [itemType, color, brand, features, lostDate, stationName, trainNumber] = inputs;
    const request = { itemType: itemType.value.trim(), color: color.value.trim(), brand: brand.value.trim(), features: features.value.trim(), lostDate: lostDate.value.trim(), stationName: stationName.value.trim(), trainNumber: trainNumber.value.trim() };
    if (!request.itemType && !request.features) {
      render(button, null, copy.missingInput, copy);
      return;
    }
    button.disabled = true;
    render(button, null, copy.searching, copy);
    try {
      const response = await fetch(lostFoundEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
      render(button, body, null, copy);
    } catch (error) {
      render(button, null, `${copy.searchError}${error.message}`, copy);
    } finally {
      button.disabled = false;
    }
  }

  function render(button, response, error, copy) {
    let result = document.getElementById('railagent-local-lost-found-result');
    if (!result) {
      result = document.createElement('section');
      result.id = 'railagent-local-lost-found-result';
      result.className = 'mp-stack';
      result.setAttribute('aria-live', 'polite');
      button.closest('section')?.insertAdjacentElement('afterend', result);
    }
    if (error) {
      result.innerHTML = `<h3 class="mp-section-title">${copy.searchTitle}</h3><article class="mp-card"><p>${escapeHtml(error)}</p></article>`;
      return;
    }
    const candidates = Array.isArray(response.candidates) ? response.candidates : [];
    const metadata = `${copy.snapshot} ${formatDate(response.sourceMaxPickupDate, copy)} · ${copy.mode}：${escapeHtml(response.aiMode || 'unknown')}`;
    const cards = candidates.length ? candidates.map((candidate) => trackedCandidateCard(candidate, copy)).join('') : `<article class="mp-card"><p>${copy.noMatch}</p></article>`;
    result.innerHTML = `<h3 class="mp-section-title">${copy.searchTitle}（${candidates.length}）</h3><p class="mp-footnote">${metadata}</p>${cards}`;
  }

  function trackedCandidateCard(candidate, copy) {
    const item = candidate.item || {};
    const location = item.stationName || item.pickupLocation || copy.unknown;
    const record = {
      id: item.itemId || [item.propertyName || copy.unknownItem, location, item.pickupDate || ''].join('|'),
      title: item.propertyName || copy.unknownItem,
      stationName: location,
      pickupDate: formatDate(item.pickupDate, copy),
      contactPhone: item.keepStationTel || copy.unknown,
      status: copy.tracking,
    };
    const tracked = readTrackedCases().some((entry) => entry.id === record.id);
    const data = escapeHtml(encodeURIComponent(JSON.stringify(record)));
    return `<article class="mp-list-item"><div class="mp-meta"><span class="mp-status">${escapeHtml(String(candidate.similarity ?? 0))}% ${copy.similar}</span><span>${escapeHtml(location)}</span></div><h3>${escapeHtml(record.title)}</h3><p class="mp-footnote">${copy.pickupDate}\uff1a${escapeHtml(record.pickupDate)}</p><p class="mp-footnote">${escapeHtml(candidate.reason || '')}</p><p class="mp-meta">${copy.contact}\uff1a${escapeHtml(item.keepStationTel || copy.unknown)}</p><button type="button" class="railagent-track-lost-found" data-railagent-tracked-case="${data}" ${tracked ? 'disabled' : ''}>${tracked ? copy.tracked : copy.trackItem}</button></article>`;
  }

  function candidateCard(candidate, copy) {
    const item = candidate.item || {};
    const location = item.stationName || item.pickupLocation || copy.unknown;
    const detail = [item.propertyFeature, item.trainNumber ? `\u8eca\u6b21 ${item.trainNumber}` : ''].filter(Boolean).join(' · ');
    return `<article class="mp-list-item"><div class="mp-meta"><span class="mp-status">${escapeHtml(String(candidate.similarity ?? 0))}% ${copy.similar}</span><span>${escapeHtml(location)}</span></div><h3>${escapeHtml(item.propertyName || copy.unknownItem)}</h3><p class="mp-footnote">${copy.pickupDate}：${escapeHtml(formatDate(item.pickupDate, copy))}${detail ? ` · ${escapeHtml(detail)}` : ''}</p><p class="mp-footnote">${escapeHtml(candidate.reason || '')}</p><p class="mp-meta">${copy.contact}：${escapeHtml(item.keepStationTel || copy.unknown)}${item.keepStationAddr ? ` · ${escapeHtml(item.keepStationAddr)}` : ''}</p></article>`;
  }

  function formatDate(value, copy) { return value ? String(value).slice(0, 10) : copy.unknown; }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
})();
