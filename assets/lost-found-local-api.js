(() => {
  'use strict';

  // Keep the same passenger UI available in every language even when the
  // optional local API URL has not been supplied. Do not use the static
  // GitHub Pages origin as an API fallback: it has no local-AI endpoints.
  const apiBaseUrl = new URLSearchParams(window.location.search).get('apiBaseUrl');

  let lostFoundEndpoint;
  let chatEndpoint;
  let stationEndpoint;
  let routeEndpoint;
  if (apiBaseUrl) {
    try {
      lostFoundEndpoint = new URL('/api/lost-found/match', apiBaseUrl).toString();
      chatEndpoint = new URL('/api/passenger-chat', apiBaseUrl).toString();
      stationEndpoint = new URL('/api/friendly-transfer/station', apiBaseUrl).toString();
      routeEndpoint = new URL('/api/friendly-transfer/route', apiBaseUrl).toString();
    } catch {
      // The UI stays available and reports the missing or invalid local API URL.
    }
  }

  const baseCopy = {
    askRailAgent: '\u554f RailAgent',
    chatSubtitle: '\u672c\u6a5f AI \u5c0d\u8a71\u5354\u52a9',
    close: '\u95dc\u9589',
    chatPlaceholder: '\u8f38\u5165\u60a8\u7684\u554f\u984c\u2026',
    send: '\u50b3\u9001',
    thinking: 'RailAgent \u6b63\u5728\u601d\u8003\u2026',
    chatError: '\u76ee\u524d\u7121\u6cd5\u9023\u7dda\u81f3\u672c\u6a5f AI\uff0c\u8acb\u78ba\u8a8d API \u8207 Ollama \u6b63\u5728\u57f7\u884c\u5f8c\u518d\u8a66\u4e00\u6b21\u3002',
    apiNotConnected: '\u672c\u6a5f API \u5c1a\u672a\u9023\u7dda\u3002\u8acb\u4f7f\u7528 ?apiBaseUrl=http://127.0.0.1:7071 \u958b\u555f\u672c\u9801\u3002',
    missingInput: '\u8acb\u81f3\u5c11\u586b\u5beb\u7269\u54c1\u985e\u578b\u6216\u7279\u5fb5\u95dc\u9375\u5b57\u3002',
    searching: '\u6b63\u5728\u4ee5\u672c\u6a5f Ollama \u641c\u5c0b\u53ef\u80fd\u76f8\u7b26\u7684\u907a\u5931\u7269\u2026',
    searchError: '\u672c\u6a5f AI \u641c\u5c0b\u5931\u6557\uff1a',
    searchTitle: '\u672c\u6a5f AI \u641c\u5c0b\u7d50\u679c',
    noMatch: '\u672a\u627e\u5230\u53ef\u80fd\u76f8\u7b26\u7684\u907a\u5931\u7269\u3002',
    snapshot: '\u672c\u6a5f\u8cc7\u6599\u5feb\u7167\u81f3',
    mode: '\u6a21\u5f0f',
    similar: '\u76f8\u4f3c',
    pickupDate: '\u62fe\u7372\u65e5\u671f',
    unknown: '\u672a\u77e5',
    unknownItem: '\u672a\u77e5\u7269\u54c1',
    contact: '\u806f\u7d61\u65b9\u5f0f',
    trackItem: '\u8ffd\u8e64\u6b64\u7269\u4ef6',
    tracked: '\u5df2\u8ffd\u8e64',
    tracking: '\u8ffd\u8e64\u4e2d',
    feedback: '\u670d\u52d9\u56de\u994b',
    thankYou: '\u611f\u8b1d\u60a8\u7684\u56de\u994b!'
    ,transferHelp: '\u8f49\u4e58\u5354\u52a9'
    ,transferRoute: '\u8f49\u4e58\u8def\u7dda\u5efa\u8b70'
    ,transferRouteLead: '\u8f38\u5165\u73fe\u5728\u5730\u9ede\u8207\u76ee\u7684\u5730\uff0c\u7531\u672c\u6a5f AI \u63d0\u4f9b\u53c3\u8003\u3002'
    ,callTitle: '\u547c\u53eb\u7ad9\u52d9\u4eba\u54e1\u5354\u52a9'
    ,callLead: '\u8acb\u8aaa\u51fa\u6216\u8f38\u5165\u60a8\u76ee\u524d\u6240\u5728\u7684\u8eca\u7ad9\u3002'
    ,stationPlaceholder: '\u4f8b\u5982\uff1a\u6211\u5728\u53f0\u5317\u8eca\u7ad9'
    ,startVoice: '\u958b\u59cb\u8a9e\u97f3\u8f38\u5165'
    ,findStation: '\u78ba\u8a8d\u8eca\u7ad9'
    ,calling: '\u64a5\u6253\u7ad9\u52d9\u4eba\u54e1\u96fb\u8a71'
    ,stationError: '\u7121\u6cd5\u8fa8\u8b58\u8eca\u7ad9\uff0c\u8acb\u91cd\u65b0\u8aaa\u51fa\u6216\u8f38\u5165\u7ad9\u540d\u3002'
    ,voiceUnavailable: '\u6b64\u700f\u89bd\u5668\u7121\u6cd5\u4f7f\u7528\u8a9e\u97f3\u8f38\u5165\uff0c\u8acb\u76f4\u63a5\u8f38\u5165\u7ad9\u540d\u3002'
    ,routeOrigin: '\u73fe\u5728\u5730\u9ede'
    ,routeDestination: '\u8981\u524d\u5f80\u7684\u5730\u9ede'
    ,routePlaceholderOrigin: '\u4f8b\u5982\uff1a\u81fa\u5317\u8eca\u7ad9'
    ,routePlaceholderDestination: '\u4f8b\u5982\uff1a\u5357\u6e2f\u8eca\u7ad9'
    ,routeSubmit: '\u53d6\u5f97\u8f49\u4e58\u5efa\u8b70'
    ,routeThinking: '\u6b63\u5728\u5411\u672c\u6a5f AI \u8a62\u554f\u8f49\u4e58\u5efa\u8b70\u2026'
    ,routeError: '\u672c\u6a5f AI \u76ee\u524d\u7121\u6cd5\u63d0\u4f9b\u8f49\u4e58\u5efa\u8b70\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002'
    ,transferPageGuide: '\u53cb\u5584\u8f49\u4e58\u5354\u52a9\u3002\u5982\u9700\u7ad9\u52d9\u4eba\u54e1\u5354\u52a9\uff0c\u8acb\u9078\u64c7\u8f49\u4e58\u5354\u52a9\u3002\u5982\u8981\u67e5\u8a62\u8def\u7dda\uff0c\u8acb\u5148\u8f38\u5165\u73fe\u5728\u5730\u9ede\uff0c\u518d\u8f38\u5165\u8981\u524d\u5f80\u7684\u5730\u9ede\u3002'
    ,routeOriginGuide: '\u73fe\u5728\u5730\u9ede\u3002\u8acb\u8f38\u5165\u60a8\u73fe\u5728\u6240\u5728\u7684\u8eca\u7ad9\u6216\u5730\u9ede\u3002'
    ,routeDestinationGuide: '\u8981\u524d\u5f80\u7684\u5730\u9ede\u3002\u8acb\u8f38\u5165\u60a8\u7684\u76ee\u7684\u5730\u3002'
    ,voicePrompt: '\u8acb\u8aaa\u51fa\u60a8\u76ee\u524d\u6240\u5728\u7684\u8eca\u7ad9\u3002'
    ,voiceRecognized: '\u5df2\u8fa8\u8b58\uff1a'
    ,stationThinking: '\u6b63\u5728\u78ba\u8a8d\u8eca\u7ad9\u8207\u7ad9\u52d9\u96fb\u8a71\u3002'
  };

  const localizedCopy = {
    en: {
      askRailAgent: 'Ask RailAgent', chatSubtitle: 'Local AI chat support', close: 'Close', chatPlaceholder: 'Type your question…', send: 'Send', thinking: 'RailAgent is thinking…',
      transferHelp: 'Transfer assistance', transferRoute: 'Transfer route suggestion', transferRouteLead: 'Enter where you are and where you want to go for a local-AI reference.',
      routeOrigin: 'Current location', routeDestination: 'Destination', routePlaceholderOrigin: 'Example: Taipei Main Station', routePlaceholderDestination: 'Example: Nangang Station', routeSubmit: 'Get transfer suggestion',
      callTitle: 'Call station staff for assistance', callLead: 'Tell us or type the station where you are now.', stationPlaceholder: 'Example: I am at Taipei Main Station', startVoice: 'Start voice input', findStation: 'Confirm station', calling: 'Call station staff',
    },
    ja: { askRailAgent: 'RailAgent に質問', chatSubtitle: 'ローカル AI 対話支援', close: '閉じる', chatPlaceholder: '質問を入力…', send: '送信', thinking: 'RailAgent が考えています…', transferHelp: '乗換支援', transferRoute: '乗換ルートの提案', transferRouteLead: '現在地と目的地を入力すると、ローカル AI が参考情報を提示します。', routeOrigin: '現在地', routeDestination: '目的地', routeSubmit: '乗換提案を取得', callTitle: '駅係員に支援を依頼', callLead: '現在いる駅を入力または話してください。', startVoice: '音声入力を開始', findStation: '駅を確認', calling: '駅係員に電話' },
    ko: { askRailAgent: 'RailAgent에게 문의', chatSubtitle: '로컬 AI 대화 지원', close: '닫기', chatPlaceholder: '질문을 입력하세요…', send: '보내기', thinking: 'RailAgent가 생각 중입니다…', transferHelp: '환승 지원', transferRoute: '환승 경로 제안', transferRouteLead: '현재 위치와 목적지를 입력하면 로컬 AI가 참고 정보를 제공합니다.', routeOrigin: '현재 위치', routeDestination: '목적지', routeSubmit: '환승 제안 받기', callTitle: '역무원 지원 요청', callLead: '현재 있는 역을 입력하거나 말해 주세요.', startVoice: '음성 입력 시작', findStation: '역 확인', calling: '역무원에게 전화' },
    vi: { askRailAgent: 'Hỏi RailAgent', chatSubtitle: 'Hỗ trợ trò chuyện AI cục bộ', close: 'Đóng', chatPlaceholder: 'Nhập câu hỏi của bạn…', send: 'Gửi', thinking: 'RailAgent đang xử lý…', transferHelp: 'Hỗ trợ chuyển tuyến', transferRoute: 'Gợi ý tuyến chuyển', routeOrigin: 'Vị trí hiện tại', routeDestination: 'Điểm đến', routeSubmit: 'Lấy gợi ý chuyển tuyến', callTitle: 'Gọi nhân viên nhà ga hỗ trợ', callLead: 'Nhập hoặc nói tên ga bạn đang ở.', startVoice: 'Bắt đầu nhập bằng giọng nói', findStation: 'Xác nhận ga', calling: 'Gọi nhân viên nhà ga' },
    id: { askRailAgent: 'Tanya RailAgent', chatSubtitle: 'Bantuan chat AI lokal', close: 'Tutup', chatPlaceholder: 'Masukkan pertanyaan Anda…', send: 'Kirim', thinking: 'RailAgent sedang memproses…', transferHelp: 'Bantuan transit', transferRoute: 'Saran rute transit', routeOrigin: 'Lokasi saat ini', routeDestination: 'Tujuan', routeSubmit: 'Dapatkan saran transit', callTitle: 'Hubungi petugas stasiun', callLead: 'Ketik atau ucapkan stasiun Anda saat ini.', startVoice: 'Mulai masukan suara', findStation: 'Konfirmasi stasiun', calling: 'Hubungi petugas stasiun' },
    th: { askRailAgent: 'ถาม RailAgent', chatSubtitle: 'ผู้ช่วยสนทนา AI ในเครื่อง', close: 'ปิด', chatPlaceholder: 'พิมพ์คำถามของคุณ…', send: 'ส่ง', thinking: 'RailAgent กำลังประมวลผล…', transferHelp: 'ช่วยเหลือการต่อรถ', transferRoute: 'แนะนำเส้นทางต่อรถ', routeOrigin: 'ตำแหน่งปัจจุบัน', routeDestination: 'ปลายทาง', routeSubmit: 'รับคำแนะนำการต่อรถ', callTitle: 'ติดต่อเจ้าหน้าที่สถานี', callLead: 'พิมพ์หรือพูดชื่อสถานีที่คุณอยู่', startVoice: 'เริ่มป้อนด้วยเสียง', findStation: 'ยืนยันสถานี', calling: 'โทรหาเจ้าหน้าที่สถานี' },
  };

  function activeLanguage() {
    const language = (document.documentElement.lang || '').toLowerCase();
    if (language.startsWith('zh')) return 'zh-TW';
    return language.split('-')[0];
  }

  function getCopy() {
    return { ...baseCopy, ...(localizedCopy[activeLanguage()] || {}) };
  }

  let copy = getCopy();

  const searchLabels = [
    '\u641c\u5c0b\u53ef\u80fd\u76f8\u7b26\u7269\u54c1',
    '\u641c\u5c0b\u53ef\u80fd\u76f8\u7b26\u7684\u907a\u5931\u7269',
    '\u641c\u5c0b\u53ef\u80fd\u76f8\u7b26\u907a\u5931\u7269',
    'Search for possible matches'
  ];

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
    const lostPage = findLostItemPage();
    if (!lostPage) return;
    // The original notice and seeded case are part of the old lost-item UI.
    // Remove them instead of hiding them, so React redraws cannot make them
    // reappear in Taiwanese, Hakka, or any other language.
    lostPage.querySelectorAll('.mp-notice').forEach((element) => element.remove());
    lostPage.querySelectorAll('article').forEach((element) => {
      if (element.querySelector('h3') && !element.querySelector('input, textarea, button.railagent-track-lost-found')) {
        element.remove();
      }
    });
  }

  function servicePage(name) {
    return document.querySelector(`[data-service-page="${name}"]`);
  }

  function isVisible(element) {
    return Boolean(element && element.offsetParent !== null);
  }

  function visibleWorkspaceSections() {
    return [...document.querySelectorAll('main .mp-shell > section')].filter(isVisible);
  }

  function findLostItemPage() {
    return servicePage('lost-item') || visibleWorkspaceSections().find((section) =>
      section.querySelectorAll('input').length >= 7
    ) || null;
  }

  function findFriendlyTransferPage() {
    return servicePage('friendly-transfer') || visibleWorkspaceSections().find((section) => {
      const tags = section.querySelectorAll('.mp-tags .mp-tag').length;
      return tags >= 4 && Boolean(section.querySelector('button.mp-primary'));
    }) || null;
  }

  function installChatLauncher() {
    const homeServiceList = document.querySelector('.mp-service-list');
    if (!homeServiceList) {
      document.getElementById('railagent-local-chat-launcher')?.remove();
      return;
    }

    // These two legacy actions are only present on the old three-card home.
    // Use the React speech cue rather than a translated visible label so every
    // language gets the same four-card home layout.
    document
      .querySelectorAll('[data-railagent-speech-cue="quick-help"], [data-railagent-speech-cue="more-services"]')
      .forEach((button) => button.remove());

    if (document.getElementById('railagent-local-chat-launcher')) return;
    const launcher = document.createElement('button');
    launcher.id = 'railagent-local-chat-launcher';
    launcher.type = 'button';
    launcher.innerHTML = `<span><strong>${copy.askRailAgent}</strong><small>${copy.chatSubtitle}</small></span>`;
    homeServiceList.appendChild(launcher);
  }

  function installFriendlyTransferTools() {
    const panel = findFriendlyTransferPage();
    if (!panel) return;

    panel.querySelectorAll('.mp-card').forEach((card) => {
      if (card.querySelector('.mp-tags')) card.remove();
    });
    if (document.getElementById('railagent-friendly-transfer-tools')) return;

    const tools = document.createElement('section');
    tools.id = 'railagent-friendly-transfer-tools';
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
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const origin = form.querySelector('#railagent-route-origin').value.trim();
      const destination = form.querySelector('#railagent-route-destination').value.trim();
      const submit = form.querySelector('button[type="submit"]');
      const answer = form.querySelector('.railagent-transfer-answer');
      if (!origin || !destination || submit.disabled) return;
      if (!routeEndpoint) {
        answer.hidden = false;
        answer.textContent = copy.apiNotConnected;
        return;
      }
      submit.disabled = true;
      answer.hidden = false;
      answer.textContent = copy.routeThinking;
      announceTransfer(copy.routeThinking, 'route-thinking');
      try {
        const response = await fetch(routeEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin, destination })
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
        answer.textContent = body.answer || copy.routeError;
        announceTransfer(answer.textContent, 'route-answer');
      } catch (error) {
        answer.textContent = `${copy.routeError}\n${error.message}`;
        announceTransfer(answer.textContent, 'route-error');
      } finally {
        submit.disabled = false;
      }
    });
  }

  function openFriendlyTransferDialog() {
    let overlay = document.getElementById('railagent-transfer-dialog');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'railagent-transfer-dialog';
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
      voice.addEventListener('click', () => startSpeechRecognition(input, status));
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const spokenStation = input.value.trim();
        if (!spokenStation) return;
        if (!stationEndpoint) {
          status.textContent = copy.apiNotConnected;
          return;
        }
        status.textContent = copy.stationThinking;
        announceTransfer(copy.stationThinking, 'station-thinking');
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
          call.textContent = `${copy.calling} ${body.phone || ''}`;
          call.setAttribute('data-railagent-transfer-control', 'call-staff');
          call.setAttribute('data-railagent-speech-text', `${copy.calling} ${body.phone || ''}`);
          callResult.appendChild(call);
        } catch (error) {
          status.textContent = `${copy.stationError}\n${error.message}`;
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

  function startSpeechRecognition(input, status) {
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
  const LEGACY_BACKPACK_SUMMARY = '\u9ed1\u8272\u80cc\u5305\u907a\u5931\u7269\uff0c\u9700\u8981\u7ad9\u52d9\u5148\u6bd4\u5c0d\u5019\u9078\u62fe\u7372\u7269\u3002';
  const LEGACY_FEEDBACK_NOTE = '\u7d50\u6848\u5f8c\u56de\u994b\u6703\u5beb\u5165\u672c\u6a5f\u4e8b\u4ef6\u76ee\u9304\uff0c\u4f9b\u6b77\u53f2\u54c1\u8cea\u5206\u6790\u3002';

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
    [...document.querySelectorAll('article')].forEach((article) => {
      if ((article.textContent || '').includes(LEGACY_BACKPACK_SUMMARY)) article.remove();
    });
  }

  function syncPublicFeedbackCopy() {
    const feedback = document.querySelector('article[aria-label="\u670d\u52d9\u56de\u994b"]');
    if (!feedback) return;
    const heading = feedback.querySelector('h3');
    if (heading && heading.textContent !== copy.feedback) heading.textContent = copy.feedback;
    [...feedback.querySelectorAll('p')].forEach((paragraph) => {
      if ((paragraph.textContent || '').includes(LEGACY_FEEDBACK_NOTE)) paragraph.remove();
      if ((paragraph.textContent || '').startsWith('\u5df2\u8a18\u9304\u56de\u994b\u65bc')) paragraph.textContent = copy.thankYou;
    });
  }

  function renderTrackedCases() {
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
    copy = getCopy();
    installStyles();
    markDemoContent();
    installChatLauncher();
    installFriendlyTransferTools();
    clearStaleLostFoundResult();
    removeLegacyBackpackCase();
    renderTrackedCases();
    syncPublicFeedbackCopy();
    if (!findFriendlyTransferPage()) clearFriendlyTransferUi();
  }

  function clearStaleLostFoundResult() {
    const hasVisibleLostFoundSearch = [...document.querySelectorAll('button')].some((button) =>
      isLostFoundSearchButton(button)
    );
    if (!hasVisibleLostFoundSearch) {
      document.getElementById('railagent-local-lost-found-result')?.remove();
    }
  }

  function isLostFoundSearchButton(button) {
    if (!button || !isVisible(button)) return false;
    if (searchLabels.includes(button.textContent.trim())) return true;
    const panel = findLostItemPage();
    return Boolean(
      panel &&
      [...panel.querySelectorAll('button')].includes(button) &&
      button.matches('button.mp-primary') &&
      panel.querySelectorAll('input').length >= 7
    );
  }

  function addChatMessage(messages, kind, text) {
    const message = document.createElement('div');
    message.className = `railagent-chat-message railagent-chat-${kind}`;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  }

  function openChat() {
    let overlay = document.getElementById('railagent-local-chat');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'railagent-local-chat';
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
        if (!chatEndpoint) {
          addChatMessage(messages, 'assistant', copy.apiNotConnected);
          return;
        }
        addChatMessage(messages, 'user', question);
        input.value = '';
        send.disabled = true;
        const status = addChatMessage(messages, 'status', copy.thinking);
        try {
          const response = await fetch(chatEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: question })
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
          status.remove();
          addChatMessage(messages, 'assistant', body.answer || copy.chatError);
        } catch (error) {
          status.remove();
          addChatMessage(messages, 'assistant', `${copy.chatError}\n${error.message}`);
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
    if (buttonText === '\u2190 \u8fd4\u56de' || buttonText === '\u9996\u9801') {
      document.getElementById('railagent-local-lost-found-result')?.remove();
      clearFriendlyTransferUi();
    }
    if (button.id === 'railagent-transfer-help-button') {
      event.preventDefault();
      event.stopImmediatePropagation();
      openFriendlyTransferDialog();
      return;
    }
    if (button.id === 'railagent-local-chat-launcher') {
      event.preventDefault();
      event.stopImmediatePropagation();
      openChat();
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
    if (!isLostFoundSearchButton(button)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void search(button);
  }, true);

  async function search(button) {
    const panel = findLostItemPage() || button.closest('section');
    const inputs = [...(panel?.querySelectorAll('input') ?? [])].filter((input) => input.offsetParent !== null);
    if (inputs.length < 7) {
      render(button, null, copy.missingInput);
      return;
    }
    const [itemType, color, brand, features, lostDate, stationName, trainNumber] = inputs;
    const request = { itemType: itemType.value.trim(), color: color.value.trim(), brand: brand.value.trim(), features: features.value.trim(), lostDate: lostDate.value.trim(), stationName: stationName.value.trim(), trainNumber: trainNumber.value.trim() };
    if (!request.itemType && !request.features) {
      render(button, null, copy.missingInput);
      return;
    }
    if (!lostFoundEndpoint) {
      render(button, null, copy.apiNotConnected);
      return;
    }
    button.disabled = true;
    render(button, null, copy.searching);
    try {
      const response = await fetch(lostFoundEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
      render(button, body, null);
    } catch (error) {
      render(button, null, `${copy.searchError}${error.message}`);
    } finally {
      button.disabled = false;
    }
  }

  function render(button, response, error) {
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
    const metadata = `${copy.snapshot} ${formatDate(response.sourceMaxPickupDate)} · ${copy.mode}：${escapeHtml(response.aiMode || 'unknown')}`;
    const cards = candidates.length ? candidates.map(trackedCandidateCard).join('') : `<article class="mp-card"><p>${copy.noMatch}</p></article>`;
    result.innerHTML = `<h3 class="mp-section-title">${copy.searchTitle}（${candidates.length}）</h3><p class="mp-footnote">${metadata}</p>${cards}`;
  }

  function trackedCandidateCard(candidate) {
    const item = candidate.item || {};
    const location = item.stationName || item.pickupLocation || copy.unknown;
    const record = {
      id: item.itemId || [item.propertyName || copy.unknownItem, location, item.pickupDate || ''].join('|'),
      title: item.propertyName || copy.unknownItem,
      stationName: location,
      pickupDate: formatDate(item.pickupDate),
      contactPhone: item.keepStationTel || copy.unknown,
      status: copy.tracking,
    };
    const tracked = readTrackedCases().some((entry) => entry.id === record.id);
    const data = escapeHtml(encodeURIComponent(JSON.stringify(record)));
    return `<article class="mp-list-item"><div class="mp-meta"><span class="mp-status">${escapeHtml(String(candidate.similarity ?? 0))}% ${copy.similar}</span><span>${escapeHtml(location)}</span></div><h3>${escapeHtml(record.title)}</h3><p class="mp-footnote">${copy.pickupDate}\uff1a${escapeHtml(record.pickupDate)}</p><p class="mp-footnote">${escapeHtml(candidate.reason || '')}</p><p class="mp-meta">${copy.contact}\uff1a${escapeHtml(item.keepStationTel || copy.unknown)}</p><button type="button" class="railagent-track-lost-found" data-railagent-tracked-case="${data}" ${tracked ? 'disabled' : ''}>${tracked ? copy.tracked : copy.trackItem}</button></article>`;
  }

  function candidateCard(candidate) {
    const item = candidate.item || {};
    const location = item.stationName || item.pickupLocation || copy.unknown;
    const detail = [item.propertyFeature, item.trainNumber ? `\u8eca\u6b21 ${item.trainNumber}` : ''].filter(Boolean).join(' · ');
    return `<article class="mp-list-item"><div class="mp-meta"><span class="mp-status">${escapeHtml(String(candidate.similarity ?? 0))}% ${copy.similar}</span><span>${escapeHtml(location)}</span></div><h3>${escapeHtml(item.propertyName || copy.unknownItem)}</h3><p class="mp-footnote">${copy.pickupDate}：${escapeHtml(formatDate(item.pickupDate))}${detail ? ` · ${escapeHtml(detail)}` : ''}</p><p class="mp-footnote">${escapeHtml(candidate.reason || '')}</p><p class="mp-meta">${copy.contact}：${escapeHtml(item.keepStationTel || copy.unknown)}${item.keepStationAddr ? ` · ${escapeHtml(item.keepStationAddr)}` : ''}</p></article>`;
  }

  function formatDate(value) { return value ? String(value).slice(0, 10) : copy.unknown; }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
})();
