(function () {
  'use strict';

  // The checked-in TRA dataset currently contains this many lost-and-found records.
  const TOTAL_FOUND_ITEMS = 23919;
  const TRACKED_CASES_KEY = 'railagent-tracked-lost-found-cases';
  let trackedCount = null;
  let trackedRequest = null;

  function text(node) {
    return (node?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function dashboard() {
    return document.querySelector('[aria-label="主管營運駕駛艙"]');
  }

  function cardFor(node) {
    return node?.closest('article.mp-card, article, .mp-card') || null;
  }

  function findByText(root, matcher) {
    return [...root.querySelectorAll('h2, h3, strong, p, button')].find((node) => matcher.test(text(node)));
  }

  function localTrackedCount() {
    try {
      const records = JSON.parse(window.localStorage.getItem(TRACKED_CASES_KEY) || '[]');
      return Array.isArray(records) ? records.length : 0;
    } catch {
      return 0;
    }
  }

  function apiBaseUrl() {
    const queryValue = new URLSearchParams(window.location.search).get('apiBaseUrl');
    return (queryValue || window.localStorage.getItem('railagent.api-base-url') || '').replace(/\/$/, '');
  }

  async function loadTrackedCount() {
    if (trackedRequest) return trackedRequest;
    const baseUrl = apiBaseUrl();
    if (!baseUrl) return localTrackedCount();

    trackedRequest = (async () => {
      try {
        const loginResponse = await fetch(`${baseUrl}/api/auth/demo-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: 'ntmetro-supervisor' })
        });
        if (!loginResponse.ok) throw new Error('Unable to open the supervisor task feed.');
        const login = await loginResponse.json();
        const tasksResponse = await fetch(`${baseUrl}/api/tasks`, {
          headers: { 'x-demo-user-id': login.demoToken }
        });
        if (!tasksResponse.ok) throw new Error('Unable to read the supervisor task feed.');
        const result = await tasksResponse.json();
        const tasks = Array.isArray(result.tasks) ? result.tasks : [];
        return tasks.filter((task) => task?.type === 'lost_item').length;
      } catch {
        return localTrackedCount();
      }
    })();

    trackedCount = await trackedRequest;
    updateTrackedMetric();
    return trackedCount;
  }

  function metric(label, value, className) {
    const item = document.createElement('div');
    item.className = 'mp-kpi';
    const caption = document.createElement('em');
    caption.textContent = label;
    const amount = document.createElement('strong');
    amount.textContent = String(value);
    if (className) amount.className = className;
    item.append(caption, amount);
    return item;
  }

  function updateTrackedMetric() {
    document.querySelectorAll('[data-supervisor-tracked-count]').forEach((node) => {
      node.textContent = String(trackedCount ?? localTrackedCount());
    });
  }

  function replaceKpis(root) {
    const heading = findByText(root, /^跨運具服務事件即時營運監控/);
    const panel = cardFor(heading);
    if (!panel) return;

    heading.textContent = '跨運具服務事件即時營運監控';
    [...panel.querySelectorAll('p.mp-footnote')].forEach((node) => node.remove());

    const kpiRow = panel.querySelector('.mp-kpi-row');
    if (!kpiRow || kpiRow.dataset.supervisorMetrics === 'true') return;
    kpiRow.replaceChildren(
      metric('拾獲物品', TOTAL_FOUND_ITEMS),
      metric('旅客追蹤', trackedCount ?? localTrackedCount(), 'supervisor-tracked-count')
    );
    kpiRow.querySelector('.supervisor-tracked-count')?.setAttribute('data-supervisor-tracked-count', 'true');
    kpiRow.dataset.supervisorMetrics = 'true';
  }

  function removeObsoletePanels(root) {
    const notice = findByText(root, /核心差異：跨大眾運輸資訊/);
    notice?.remove();

    [/^狀態佇列/, /^時段熱點$/, /^優先佇列/, /^開啟待辦 drill-down$/].forEach((matcher) => {
      const node = findByText(root, matcher);
      if (!node) return;
      const panel = cardFor(node);
      if (panel && panel !== root) panel.remove();
      else node.remove();
    });
  }

  function replaceWorkforce(root) {
    const heading = findByText(root, /^站務人力/);
    const panel = cardFor(heading);
    if (!heading || !panel || panel.dataset.supervisorWorkforce === 'true') return;

    heading.textContent = '站務人力';
    [...panel.querySelectorAll('article.mp-list-item')].forEach((node) => node.remove());
    const teams = [
      ['板橋站務', '板橋站'],
      ['桃園青埔站務', '桃園青埔站']
    ];
    teams.forEach(([name, station]) => {
      const item = document.createElement('article');
      item.className = 'mp-list-item';
      const meta = document.createElement('div');
      meta.className = 'mp-meta';
      const status = document.createElement('span');
      status.className = 'mp-status';
      status.textContent = '可用';
      const title = document.createElement('span');
      title.textContent = name;
      meta.append(status, title);
      const description = document.createElement('p');
      description.className = 'mp-footnote';
      description.textContent = station;
      item.append(meta, description);
      panel.append(item);
    });
    panel.dataset.supervisorWorkforce = 'true';
  }

  function enhance() {
    const root = dashboard();
    if (!root) return;
    removeObsoletePanels(root);
    replaceKpis(root);
    replaceWorkforce(root);
    loadTrackedCount();
  }

  let pending = false;
  function scheduleEnhance() {
    if (pending) return;
    pending = true;
    window.setTimeout(() => {
      pending = false;
      enhance();
    }, 0);
  }

  window.addEventListener('load', scheduleEnhance);
  document.addEventListener('click', scheduleEnhance);
  scheduleEnhance();
})();
