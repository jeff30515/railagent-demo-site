(() => {
  'use strict';
  const apiConfig = window.RailAgentApiConfig;
  const base = apiConfig.resolveApiBaseUrl(location.search);
  const accounts = {
    'ntmetro-staff-banqiao': { label: '板橋站務', companyId: 'ntmetro', unitId: 'station-banqiao', station: '板橋' },
    'tymetro-staff-qingpu': { label: '桃園青埔站務', companyId: 'tymetro', unitId: 'station-qingpu', station: '桃園青埔' }
  };
  const api = (path, init = {}) => {
    const url = new URL(path, base);
    return fetch(url, { ...init, headers: apiConfig.withApiHeaders(url, init.headers) }).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
    });
  };
  function account() { return accounts[localStorage.getItem('railagent.mobile.account')]; }
  function chinese() { document.documentElement.lang = 'zh-TW'; }
  function taskCard(task) {
    return `<article class="mp-list-item"><div class="mp-meta"><span class="mp-status">待處理</span><span>${escape(task.stationName)}</span></div><h3>${escape(task.aiSummary || task.description)}</h3><p class="mp-footnote">${escape(task.description)}</p><p class="mp-meta">案件：${escape(task.taskId)} · 建立：${escape(String(task.createdAt).slice(0,16))}</p></article>`;
  }
  const escape = (value) => String(value || '').replace(/[&<>\"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  async function render() {
    const user = account(); if (!user) return;
    chinese();
    const root = document.getElementById('root'); if (!root || root.dataset.staffRuntime === user.unitId) return;
    root.dataset.staffRuntime = user.unitId;
    root.innerHTML = '<main class="mp-shell"><section class="mp-stack"><div class="mp-hero-block"><h2>站務案件中心</h2><p>固定使用繁體中文 · ' + user.label + '</p></div><p class="mp-card">載入案件資料中…</p></section></main>';
    try {
      const login = await api('/api/auth/demo-login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ accountId: localStorage.getItem('railagent.mobile.account') }) });
      const data = await api('/api/tasks', { headers:{'x-demo-user-id': login.demoToken} });
      const tasks = (data.tasks || []).filter((task) => task.type === 'lost_item' && task.caseId && task.lostItem);
      root.innerHTML = `<main class="mp-shell"><section class="mp-stack" aria-label="站務案件中心"><div class="mp-hero-block"><h2>站務案件中心</h2><p>${user.label} · 固定繁體中文</p></div><section class="mp-card mp-stack"><h3>優先任務</h3>${tasks.length ? tasks.map(taskCard).join('') : '<p>目前沒有旅客追蹤後建立的遺失物案件。</p>'}</section><section class="mp-card mp-stack"><h3>任務</h3>${tasks.length ? tasks.map(taskCard).join('') : '<p>目前沒有案件。</p>'}</section><section class="mp-card mp-stack"><h3>本單位近期拾獲</h3><div id="staff-found-items">載入中…</div></section><section class="mp-card mp-stack"><h3>登記拾獲物</h3><form id="staff-found-form" class="mp-stack"><input name="itemType" required placeholder="物品類型"><input name="color" placeholder="顏色"><input name="brand" placeholder="品牌"><input name="features" placeholder="特徵"><input name="foundLocation" required placeholder="拾獲位置"><input name="foundAt" type="datetime-local" required><input name="trainNumber" placeholder="車次（如適用）"><button class="mp-primary">送出登記</button></form></section></section></main>`;
      const found = await api(`/api/lost-found/items?unitId=${encodeURIComponent(user.unitId)}`, { headers:{'x-demo-user-id':login.demoToken} });
      const holder = document.getElementById('staff-found-items'); holder.innerHTML = (found.items || []).map((item) => `<p>${escape(item.color)}${escape(item.itemType)} · ${escape(item.foundLocation)} · ${escape(item.foundAt)}</p>`).join('') || '<p>目前沒有本單位登錄資料。</p>';
      document.getElementById('staff-found-form').addEventListener('submit', async (event) => { event.preventDefault(); const fields = Object.fromEntries(new FormData(event.currentTarget)); await api('/api/lost-found/items', {method:'POST',headers:{'Content-Type':'application/json','x-demo-user-id':login.demoToken},body:JSON.stringify({...fields,stationName:user.station})}); root.dataset.staffRuntime=''; render(); });
    } catch (error) {
      root.innerHTML = '<main class="mp-shell"><section class="mp-stack"><div class="mp-hero-block"><h2>站務案件中心</h2><p>固定使用繁體中文 · ' + user.label + '</p></div><p class="mp-card">無法連線至遺失物系統：' + escape(error.message) + '。請確認 ngrok 與本機 API 正在運作，再重新由旅客入口開啟。</p></section></main>';
      console.warn('RailAgent staff API is unavailable.', error);
    }
  }
  new MutationObserver(render).observe(document.documentElement, { childList:true, subtree:true });
  addEventListener('storage', render); addEventListener('load', render);
})();
