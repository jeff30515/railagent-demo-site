(() => {
  'use strict';

  const apiBaseStorageKey = 'railagent.api-base-url';
  const queryBase = new URLSearchParams(location.search).get('apiBaseUrl');
  const accounts = {
    'ntmetro-staff-banqiao': { unitId: 'station-banqiao', station: '板橋' },
    'tymetro-staff-qingpu': { unitId: 'station-qingpu', station: '桃園青埔' }
  };
  let liveTasks = [];
  let recentFoundItems = [];
  let token;
  let loading;

  if (queryBase) localStorage.setItem(apiBaseStorageKey, queryBase);

  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  function staff() {
    return accounts[localStorage.getItem('railagent.mobile.account')];
  }

  async function api(path, init = {}) {
    const base = queryBase || localStorage.getItem(apiBaseStorageKey);
    if (!base) throw new Error('尚未連接遺失物系統');
    const response = await fetch(new URL(path, base), init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
  }

  function taskCard(task) {
    const item = task.lostItem || {};
    const card = document.createElement('article');
    card.className = 'mp-card mp-stack staff-live-task';
    card.innerHTML = `<div class="mp-meta"><span class="mp-status">待處理</span><span>${escape(task.caseId || task.taskId)}</span></div><h3>${escape(item.title || task.aiSummary || task.description)}</h3><p class="mp-footnote">${escape(task.description || '旅客已追蹤此遺失物，請協助確認。')}</p><p class="mp-meta">${escape(task.stationName)} · ${escape(item.pickupDate || '遺失日期未提供')}</p>`;
    return card;
  }

  function poolCard(task) {
    const item = task.lostItem || {};
    const card = document.createElement('article');
    card.className = 'mp-list-item';
    card.innerHTML = `<div class="mp-meta"><span class="mp-status">待處理</span><span>${escape(task.caseId || task.taskId)}</span><span>${escape(task.stationName)}</span></div><h3>${escape(item.title || task.aiSummary || task.description)}</h3><p class="mp-footnote">${escape(task.description || '旅客已追蹤此遺失物，請協助確認。')}</p>`;
    return card;
  }

  function removeObsoleteHomeActions(home) {
    home.querySelectorAll('button').forEach((button) => {
      if (['開啟完整任務池', '登記拾獲遺失物'].includes(button.textContent.trim())) button.remove();
    });
  }

  function enhanceHome() {
    const home = document.querySelector('[aria-label="站務首頁"]');
    if (!home) return;
    removeObsoleteHomeActions(home);
    const chipRow = home.querySelector('.mp-chip-row');
    const originalCard = chipRow?.nextElementSibling;
    if (!originalCard?.classList.contains('mp-card')) return;
    const signature = liveTasks.map((task) => task.caseId || task.taskId).join('|');
    if (originalCard.dataset.staffLiveSignature === signature) return;
    originalCard.dataset.staffLiveSignature = signature;
    originalCard.replaceChildren();
    originalCard.classList.add('staff-live-priority');
    const title = document.createElement('h3');
    title.textContent = '優先任務';
    originalCard.append(title);
    if (liveTasks.length) liveTasks.forEach((task) => originalCard.append(taskCard(task)));
    else {
      const empty = document.createElement('p');
      empty.className = 'mp-footnote';
      empty.textContent = '目前尚無旅客追蹤後建立的遺失物案件。';
      originalCard.append(empty);
    }
  }

  function setField(field, label, type) {
    if (!field) return;
    const labelText = field.querySelector('span');
    const input = field.querySelector('input');
    if (labelText) labelText.textContent = label;
    if (input && type) input.type = type;
  }

  function foundItemCard(item) {
    const card = document.createElement('article');
    card.className = 'mp-list-item';
    const details = [item.features, item.foundLocation, item.trainNumber && `車次 ${item.trainNumber}`].filter(Boolean).join(' · ');
    card.innerHTML = `<div class="mp-meta"><span class="mp-status">${escape(item.itemId)}</span><span>${escape(item.stationName)}</span></div><h3>${escape([item.color, item.itemType].filter(Boolean).join('') || '拾獲物')}</h3><p class="mp-footnote">${escape(details || item.foundAt || '尚無補充資訊')}</p>`;
    return card;
  }

  function replaceRecentFoundItems(panel) {
    const heading = Array.from(panel.querySelectorAll('h3')).find((node) => node.textContent.trim().startsWith('本單位近期拾獲'));
    const section = heading?.parentElement;
    if (!section) return;
    const signature = recentFoundItems.map((item) => item.itemId).join('|');
    if (section.dataset.staffFoundSignature === signature) return;
    section.dataset.staffFoundSignature = signature;
    section.replaceChildren();
    const title = document.createElement('h3');
    title.className = 'mp-section-title';
    title.textContent = `本單位近期拾獲（${recentFoundItems.length}）`;
    section.append(title);
    if (recentFoundItems.length) recentFoundItems.slice(0, 3).forEach((item) => section.append(foundItemCard(item)));
    else {
      const empty = document.createElement('p');
      empty.className = 'mp-footnote';
      empty.textContent = '目前沒有本單位已登記的拾獲物。';
      section.append(empty);
    }
  }

  function removeFriendlyTransfer() {
    document.querySelectorAll('button').forEach((button) => {
      if (button.textContent.trim() === '友善轉乘協助') button.remove();
    });
    document.querySelectorAll('h2, h3').forEach((heading) => {
      if (heading.textContent.trim() === '轉乘路線') heading.closest('.mp-card')?.remove();
    });
  }

  function enhanceFoundRegister() {
    const panel = document.querySelector('[aria-label="登記拾獲物"]');
    if (!panel) return;
    const fields = Array.from(panel.querySelectorAll('.mp-field')).filter((field) => !field.dataset.staffTrainField);
    const [itemType, color, brand, features, location, date] = fields;
    setField(itemType, '物品類型', 'text');
    setField(color, '顏色', 'text');
    setField(brand, '品牌', 'text');
    setField(features, '特徵', 'text');
    setField(location, '拾獲地點', 'text');
    setField(date, '拾獲日期', 'datetime-local');
    if (location && date && (location.compareDocumentPosition(date) & Node.DOCUMENT_POSITION_FOLLOWING)) location.before(date);
    if (panel.querySelector('[data-staff-train-field]') || !location) {
      replaceRecentFoundItems(panel);
      return;
    }
    const trainField = location.cloneNode(true);
    trainField.dataset.staffTrainField = 'true';
    setField(trainField, '拾獲車次', 'text');
    const trainInput = trainField.querySelector('input');
    if (trainInput) trainInput.value = '';
    location.after(trainField);
    replaceRecentFoundItems(panel);
  }

  function enhanceTaskPool() {
    const pool = document.querySelector('[aria-label="staff task pool"]');
    const list = pool?.querySelector('.mp-list');
    if (!list) return;
    const signature = liveTasks.map((task) => task.caseId || task.taskId).join('|');
    if (list.dataset.staffLiveSignature === signature) return;
    list.dataset.staffLiveSignature = signature;
    pool.querySelector('.mp-tags')?.remove();
    list.replaceChildren(...liveTasks.map(poolCard));
    if (!liveTasks.length) {
      const empty = document.createElement('p');
      empty.className = 'mp-card';
      empty.textContent = '目前尚無旅客追蹤中的遺失物案件。';
      list.append(empty);
    }
  }

  function enhance() {
    if (!staff()) return;
    document.documentElement.lang = 'zh-TW';
    enhanceHome();
    enhanceFoundRegister();
    enhanceTaskPool();
    removeFriendlyTransfer();
  }

  async function refresh(force = false) {
    if (loading && !force) return loading;
    const user = staff();
    if (!user) return;
    loading = (async () => {
      const login = await api('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: localStorage.getItem('railagent.mobile.account') })
      });
      token = login.demoToken;
      const [result, foundItems] = await Promise.all([
        api('/api/tasks', { headers: { 'x-demo-user-id': token } }),
        api(`/api/lost-found/items?unitId=${encodeURIComponent(user.unitId)}`, { headers: { 'x-demo-user-id': token } })
      ]);
      liveTasks = (result.tasks || []).filter((task) => task.type === 'lost_item' && task.caseId && task.lostItem);
      recentFoundItems = (foundItems.items || []).slice(0, 3);
      enhance();
    })().catch(() => { liveTasks = []; recentFoundItems = []; enhance(); }).finally(() => { loading = undefined; });
    return loading;
  }

  function fieldValue(panel, label) {
    return Array.from(panel.querySelectorAll('.mp-field')).find((field) => field.querySelector('span')?.textContent.trim() === label)?.querySelector('input')?.value || '';
  }

  document.addEventListener('click', async (event) => {
    const button = event.target.closest?.('button');
    const panel = document.querySelector('[aria-label="登記拾獲物"]');
    if (!staff() || !panel || button?.textContent.trim() !== '送出登記') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      const user = staff();
      if (!token) await refresh();
      if (!token) throw new Error('Unable to load the staff session');
      await api('/api/lost-found/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-id': token },
        body: JSON.stringify({
          itemType: fieldValue(panel, '物品類型'), color: fieldValue(panel, '顏色'), brand: fieldValue(panel, '品牌'),
          features: fieldValue(panel, '特徵'), foundLocation: fieldValue(panel, '拾獲地點'), foundAt: fieldValue(panel, '拾獲日期'),
          trainNumber: fieldValue(panel, '拾獲車次'), stationName: user.station
        })
      });
      await refresh(true);
    } catch (error) {
      const notice = document.createElement('p');
      notice.className = 'mp-notice';
      notice.textContent = `登記失敗：${error.message}`;
      panel.append(notice);
    }
  }, true);

  const observer = new MutationObserver(() => enhance());
  addEventListener('load', () => {
    observer.observe(document.getElementById('root'), { childList: true, subtree: true });
    refresh();
  });
})();
