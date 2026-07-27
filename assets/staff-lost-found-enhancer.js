(() => {
  'use strict';

  const apiConfig = window.RailAgentApiConfig;
  const apiBaseUrl = apiConfig.resolveApiBaseUrl(location.search);
  const accounts = {
    'ntmetro-staff-banqiao': { unitId: 'station-banqiao', station: '板橋' },
    'tymetro-staff-qingpu': { unitId: 'station-qingpu', station: '桃園青埔' }
  };
  const fixedRecentFoundItems = [
    { itemId: 'TRA-20230717-2217', stationName: '車次 283', itemType: '黑色背包有衣物', color: '黑色', features: '4-24 豐原找', foundLocation: '車次 283', foundAt: '2023-07-17', trainNumber: '283' },
    { itemId: 'TRA-20230717-2040', stationName: '車次 149', itemType: '新竹找 Sugar 近金色手機', color: '近金色', features: '明顯使用痕跡，僅清水套包覆，無蓋手機套', foundLocation: '車次 149', foundAt: '2023-07-17', trainNumber: '149' },
    { itemId: 'TRA-20230717-1925', stationName: '車次 135', itemType: '黑色皮短夾', color: '黑色', features: '含多國貨幣、身分證與信用卡', foundLocation: '車次 135', foundAt: '2023-07-17', trainNumber: '135' }
  ];
  let liveTasks = [];
  let recentFoundItems = fixedRecentFoundItems;
  let token;
  let loading;
  let loadedAccountId;

  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  function staff() {
    return accounts[localStorage.getItem('railagent.mobile.account')];
  }

  function staffPage() {
    return Boolean(document.querySelector('[aria-label="站務首頁"], [aria-label="登記拾獲物"], [aria-label="staff task pool"]'));
  }

  async function api(path, init = {}) {
    const url = new URL(path, apiBaseUrl);
    const response = await fetch(url, {
      ...init,
      headers: apiConfig.withApiHeaders(url, init.headers),
    });
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
    title.textContent = '最新任務';
    originalCard.append(title);
    if (liveTasks.length) liveTasks.slice(0, 3).forEach((task) => originalCard.append(taskCard(task)));
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
    card.innerHTML = `<div class="mp-meta"><span class="mp-status">${escape(item.itemId)}</span><span>${escape(item.stationName)}</span></div><h3>${escape(item.itemType || item.color || '拾獲物')}</h3><p class="mp-footnote">${escape(details || item.foundAt || '尚無補充資訊')}</p>`;
    return card;
  }

  function replaceRecentFoundItems(panel) {
    const heading = Array.from(panel.querySelectorAll('h3')).find((node) => node.textContent.trim().startsWith('本單位近期拾獲'));
    const section = heading?.parentElement;
    if (!section) return;
    const signature = recentFoundItems.map((item) => item.itemId).join('|');
    if (section.dataset.staffFoundSignature === signature) return;
    section.dataset.staffFoundSignature = signature;
    heading.textContent = `本單位近期拾獲（${recentFoundItems.length}）`;
    const cards = Array.from(section.querySelectorAll(':scope > article'));
    recentFoundItems.slice(0, 3).forEach((item, index) => {
      const card = cards[index];
      if (!card) return;
      card.innerHTML = foundItemCard(item).innerHTML;
    });
    cards.slice(recentFoundItems.length).forEach((card) => card.remove());
  }

  function removeFriendlyTransfer() {
    document.getElementById('railagent-friendly-transfer-tools')?.remove();
    document.querySelectorAll('button').forEach((button) => {
      if (button.textContent.trim() === '友善轉乘協助') button.remove();
    });
    document.querySelectorAll('.railagent-transfer-route').forEach((section) => section.remove());
    document.querySelectorAll('h2, h3').forEach((heading) => {
      if (heading.textContent.trim() === '轉乘路線') heading.closest('.mp-card')?.remove();
    });
  }

  function enhanceFoundRegister() {
    const panel = document.querySelector('[aria-label="登記拾獲物"]');
    if (!panel) return;
    const fields = Array.from(panel.querySelectorAll('.mp-field')).filter((field) => !field.dataset.staffFoundDate);
    const [itemType, color, brand, features, location, train] = fields;
    setField(itemType, '物品類型', 'text');
    setField(color, '顏色', 'text');
    setField(brand, '品牌', 'text');
    setField(features, '特徵', 'text');
    setField(location, '拾獲地點', 'text');
    setField(train, '拾獲車次', 'text');
    if (!panel.querySelector('[data-staff-found-date]') && location) {
      const dateField = document.createElement('div');
      dateField.className = 'mp-field';
      dateField.dataset.staffFoundDate = 'true';
      const dateLabel = document.createElement('span');
      dateLabel.textContent = '拾獲日期';
      const dateInputWrap = document.createElement('div');
      dateInputWrap.className = 'mp-input';
      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.setAttribute('aria-label', '拾獲日期');
      dateInputWrap.append(dateInput);
      dateField.append(dateLabel, dateInputWrap);
      location.before(dateField);
    }
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
    const accountId = localStorage.getItem('railagent.mobile.account');
    if (!staff() && !staffPage()) return;
    if (staff() && loadedAccountId !== accountId) {
      void refresh();
      return;
    }
    document.documentElement.lang = 'zh-TW';
    enhanceHome();
    enhanceFoundRegister();
    enhanceTaskPool();
    removeFriendlyTransfer();
  }

  let enhanceTimer;
  function scheduleEnhance() {
    clearTimeout(enhanceTimer);
    enhanceTimer = setTimeout(enhance, 0);
  }

  async function refresh(force = false) {
    if (loading) return loading;
    const accountId = localStorage.getItem('railagent.mobile.account');
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
      if (accountId !== localStorage.getItem('railagent.mobile.account')) return;
      liveTasks = (result.tasks || []).filter((task) => task.type === 'lost_item' && task.caseId && task.lostItem);
      recentFoundItems = fixedRecentFoundItems;
      loadedAccountId = accountId;
      enhance();
    })().catch(() => {
      if (accountId !== localStorage.getItem('railagent.mobile.account')) return;
      liveTasks = [];
      recentFoundItems = [];
      loadedAccountId = accountId;
      enhance();
    }).finally(() => { loading = undefined; });
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

  document.addEventListener('click', scheduleEnhance);
  window.addEventListener('railagent:tracked-cases-changed', () => {
    loadedAccountId = undefined;
    if (staff()) void refresh(true);
  });
  addEventListener('load', () => {
    scheduleEnhance();
    refresh();
  });
  new MutationObserver(scheduleEnhance).observe(document.body, { childList: true, subtree: true });
})();
