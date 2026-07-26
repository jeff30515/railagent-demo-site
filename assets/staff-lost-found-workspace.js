(() => {
  'use strict';

  const apiBaseStorageKey = 'railagent.api-base-url';
  const queryBase = new URLSearchParams(location.search).get('apiBaseUrl');
  if (queryBase) localStorage.setItem(apiBaseStorageKey, queryBase);
  const accounts = {
    'ntmetro-staff-banqiao': { label: '板橋站務', unitId: 'station-banqiao', station: '板橋' },
    'tymetro-staff-qingpu': { label: '桃園青埔站務', unitId: 'station-qingpu', station: '桃園青埔' }
  };

  let host;

  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  const api = async (path, init = {}) => {
    const base = queryBase || localStorage.getItem(apiBaseStorageKey);
    if (!base) throw new Error('尚未連接遺失物系統');
    const response = await fetch(new URL(path, base), init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
  };

  function currentUser() {
    return accounts[localStorage.getItem('railagent.mobile.account')];
  }

  function taskCard(task) {
    const item = task.lostItem || {};
    return `<article class="mp-list-item"><div class="mp-meta"><span class="mp-status">待處理</span><span>${escape(task.stationName)}</span></div><h3>${escape(item.title || task.aiSummary || task.description)}</h3><p class="mp-footnote">遺失日期：${escape(item.pickupDate || '未提供')} · 案件編號：${escape(task.caseId || task.taskId)}</p><p class="mp-meta">${escape(task.description || '旅客已追蹤此遺失物，請協助確認。')}</p></article>`;
  }

  function foundItemCard(item) {
    const details = [item.color, item.brand, item.features, item.trainNumber ? `車次 ${item.trainNumber}` : '']
      .filter(Boolean)
      .map(escape)
      .join(' · ');
    return `<article class="mp-list-item"><div class="mp-meta"><span class="mp-status">${escape(item.stationName)}</span><span>${escape(String(item.foundAt).slice(0, 16))}</span></div><h3>${escape(item.color || '')}${escape(item.itemType)}</h3><p class="mp-footnote">拾獲位置：${escape(item.foundLocation)}${details ? ` · ${details}` : ''}</p></article>`;
  }

  function field(label, name, options = {}) {
    const type = options.type || 'text';
    const required = options.required ? ' required' : '';
    return `<label class="mp-input"><span>${label}</span><input name="${name}" type="${type}"${required} placeholder="${options.placeholder || ''}"></label>`;
  }

  function renderLoading(user) {
    host.innerHTML = `<main class="mobile-app mobile-product mp-phase-workspace mobile-app-staff" aria-label="站務遺失物工作區"><div class="mp-workspace-bg" aria-hidden="true"></div><div class="mp-shell mp-shell-workspace mp-stack"><div class="mp-hero-block"><h2>站務遺失物工作區</h2><p>${user.label} · 固定使用繁體中文</p></div><p class="mp-card">正在載入案件與本站拾獲物…</p></div></main>`;
  }

  function renderWorkspace(user, tasks, foundItems) {
    const taskRows = tasks.length ? tasks.map(taskCard).join('') : '<p class="mp-footnote">目前尚無旅客追蹤後建立的遺失物案件。</p>';
    const foundRows = foundItems.length ? foundItems.map(foundItemCard).join('') : '<p class="mp-footnote">目前尚無本站登記的拾獲物。</p>';
    host.innerHTML = `<main class="mobile-app mobile-product mp-phase-workspace mobile-app-staff" aria-label="站務遺失物工作區"><div class="mp-workspace-bg" aria-hidden="true"></div><div class="mp-shell mp-shell-workspace mp-stack"><div class="mp-hero-block"><h2>站務遺失物工作區</h2><p>${user.label} · 固定使用繁體中文</p></div><section class="mp-card mp-stack" aria-label="優先任務"><h3>優先任務</h3>${taskRows}</section><section class="mp-card mp-stack" aria-label="任務"><h3>任務</h3>${taskRows}</section><section class="mp-card mp-stack" aria-label="本單位近期拾獲"><h3>本單位近期拾獲</h3>${foundRows}</section><section class="mp-card mp-stack" aria-label="登記拾獲物"><h3>登記拾獲物</h3><p class="mp-footnote">欄位依遺失物資料庫格式登記。</p><form id="staff-found-item-form" class="mp-stack">${field('物品類型', 'itemType', { required: true, placeholder: '例如：後背包' })}${field('顏色', 'color', { placeholder: '例如：黑色' })}${field('品牌', 'brand', { placeholder: '例如：品牌名稱' })}${field('特徵', 'features', { placeholder: '例如：側邊有白色標籤' })}${field('拾獲位置', 'foundLocation', { required: true, placeholder: '例如：月台 2' })}${field('拾獲時間', 'foundAt', { type: 'datetime-local', required: true })}${field('車次', 'trainNumber', { placeholder: '若非車上拾獲可留空' })}<button class="mp-primary" type="submit">送出登記</button></form></section></div></main>`;
    host.querySelector('#staff-found-item-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const fields = Object.fromEntries(new FormData(form));
      try {
        await api('/api/lost-found/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-demo-user-id': host.dataset.token },
          body: JSON.stringify({ ...fields, stationName: user.station })
        });
        await loadWorkspace(user, true);
      } catch (error) {
        const button = form.querySelector('button');
        button.insertAdjacentHTML('beforebegin', `<p class="mp-notice">登記失敗：${escape(error.message)}</p>`);
      }
    });
  }

  async function loadWorkspace(user, force = false) {
    if (!force && host?.dataset.unit === user.unitId) return;
    if (!host) {
      host = document.createElement('div');
      host.id = 'staff-lost-found-workspace';
    }
    host.dataset.unit = user.unitId;
    document.documentElement.lang = 'zh-TW';
    const root = document.getElementById('root');
    if (!root) return;
    root.hidden = false;
    const originalApplication = Array.from(root.children).find((child) => child !== host);
    if (originalApplication) originalApplication.hidden = true;
    if (!host.isConnected) root.append(host);
    renderLoading(user);
    try {
      const login = await api('/api/auth/demo-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: localStorage.getItem('railagent.mobile.account') })
      });
      host.dataset.token = login.demoToken;
      const headers = { 'x-demo-user-id': login.demoToken };
      const [taskResponse, foundResponse] = await Promise.all([
        api('/api/tasks', { headers }),
        api(`/api/lost-found/items?unitId=${encodeURIComponent(user.unitId)}`, { headers })
      ]);
      const tasks = (taskResponse.tasks || [])
        .filter((task) => task.type === 'lost_item' && task.caseId && task.lostItem)
        .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
      renderWorkspace(user, tasks, (foundResponse.items || []).slice(0, 6));
    } catch (error) {
      host.innerHTML = `<main class="mobile-app mobile-product mp-phase-workspace mobile-app-staff"><div class="mp-workspace-bg" aria-hidden="true"></div><div class="mp-shell mp-shell-workspace mp-stack"><div class="mp-hero-block"><h2>站務遺失物工作區</h2><p>${user.label} · 固定使用繁體中文</p></div><p class="mp-notice">目前無法載入資料：${escape(error.message)}</p></div></main>`;
    }
  }

  function syncWorkspace() {
    const root = document.getElementById('root');
    const user = currentUser();
    if (!root) return;
    if (!user) {
      root.hidden = false;
      host?.remove();
      Array.from(root.children).forEach((child) => { child.hidden = false; });
      host = undefined;
      return;
    }
    loadWorkspace(user);
  }

  addEventListener('load', syncWorkspace);
  setInterval(syncWorkspace, 250);
})();
