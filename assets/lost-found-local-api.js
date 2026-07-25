(() => {
  'use strict';

  const apiBaseUrl = new URLSearchParams(window.location.search).get('apiBaseUrl');
  if (!apiBaseUrl) return;

  let lostFoundEndpoint;
  let chatEndpoint;
  try {
    lostFoundEndpoint = new URL('/api/lost-found/match', apiBaseUrl).toString();
    chatEndpoint = new URL('/api/passenger-chat', apiBaseUrl).toString();
  } catch {
    return;
  }

  const copy = {
    askRailAgent: '\u554f RailAgent',
    chatSubtitle: '\u672c\u6a5f AI \u5c0d\u8a71\u5354\u52a9',
    close: '\u95dc\u9589',
    chatPlaceholder: '\u8f38\u5165\u60a8\u7684\u554f\u984c\u2026',
    send: '\u50b3\u9001',
    thinking: 'RailAgent \u6b63\u5728\u601d\u8003\u2026',
    chatError: '\u76ee\u524d\u7121\u6cd5\u9023\u7dda\u81f3\u672c\u6a5f AI\uff0c\u8acb\u78ba\u8a8d API \u8207 Ollama \u6b63\u5728\u57f7\u884c\u5f8c\u518d\u8a66\u4e00\u6b21\u3002',
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
    contact: '\u806f\u7d61\u65b9\u5f0f'
  };

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
    `;
    document.head.appendChild(style);
  }

  function markDemoContent() {
    document.querySelectorAll('article[aria-label]').forEach((element) => {
      if ((element.getAttribute('aria-label') || '').includes('\u65e2\u6709\u5354\u5c0b\u6848\u4ef6')) {
        element.dataset.railagentLocalHidden = 'true';
      }
    });
    document.querySelectorAll('p').forEach((element) => {
      const text = element.textContent || '';
      if (text.includes('\u793a\u7bc4\u8cc7\u6599\u4f9d\u7167') || text.includes('Demo records follow')) {
        element.dataset.railagentLocalHidden = 'true';
      }
    });
  }

  function installChatLauncher() {
    const facilityButton = [...document.querySelectorAll('button')].find((button) =>
      button.offsetParent !== null && button.textContent.trim().includes('\u670d\u52d9\u8a2d\u65bd\u56de\u5831')
    );
    if (!facilityButton) return;

    [...document.querySelectorAll('button')].forEach((button) => {
      const text = button.textContent.trim();
      if (text === '\u5feb\u901f\u6c42\u52a9' || text === '\u66f4\u591a\u670d\u52d9') {
        button.dataset.railagentLocalHidden = 'true';
      }
    });

    if (document.getElementById('railagent-local-chat-launcher')) return;
    const launcher = document.createElement('button');
    launcher.id = 'railagent-local-chat-launcher';
    launcher.type = 'button';
    launcher.innerHTML = `<span><strong>${copy.askRailAgent}</strong><small>${copy.chatSubtitle}</small></span>`;
    facilityButton.insertAdjacentElement('afterend', launcher);
  }

  function syncLocalModeUi() {
    installStyles();
    markDemoContent();
    installChatLauncher();
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
    if (button.id === 'railagent-local-chat-launcher') {
      event.preventDefault();
      event.stopImmediatePropagation();
      openChat();
      return;
    }
    if (!searchLabels.includes(button.textContent.trim())) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void search(button);
  }, true);

  async function search(button) {
    const panel = button.closest('section');
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
    const cards = candidates.length ? candidates.map(candidateCard).join('') : `<article class="mp-card"><p>${copy.noMatch}</p></article>`;
    result.innerHTML = `<h3 class="mp-section-title">${copy.searchTitle}（${candidates.length}）</h3><p class="mp-footnote">${metadata}</p>${cards}`;
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
