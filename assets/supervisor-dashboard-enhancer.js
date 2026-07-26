(function () {
  'use strict';

  const TOTAL_FOUND_ITEMS = 23919;
  const TRACKED_CASES_KEY = 'railagent-tracked-lost-found-cases';
  const STARTUP_DELAYS = [0, 100, 300, 800];
  const CLICK_DELAYS = [0, 50, 150, 400, 1000, 2000];
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

  function hideNode(node) {
    if (!node) return;
    node.hidden = true;
    node.style.display = 'none';
    node.setAttribute('aria-hidden', 'true');
  }

  function showNode(node) {
    if (!node) return;
    node.hidden = false;
    node.style.display = '';
    node.removeAttribute('aria-hidden');
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

  function metric(label, value, tracked) {
    const item = document.createElement('div');
    item.className = 'mp-kpi';
    const caption = document.createElement('em');
    caption.textContent = label;
    const amount = document.createElement('strong');
    amount.textContent = String(value);
    if (tracked) amount.setAttribute('data-supervisor-tracked-count', 'true');
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

    panel.querySelectorAll('.mp-kpi-row').forEach((row) => {
      if (!row.closest('[data-supervisor-metrics]')) hideNode(row);
    });
    [...panel.children]
      .filter((child) => !child.matches('[data-supervisor-metrics]'))
      .forEach(hideNode);
    const existing = panel.querySelector(':scope > [data-supervisor-metrics]');
    if (existing) {
      showNode(existing);
      return;
    }

    const content = document.createElement('div');
    content.className = 'mp-stack';
    content.dataset.supervisorMetrics = 'true';
    const title = document.createElement('strong');
    title.textContent = '跨運具服務事件即時營運監控';
    const row = document.createElement('div');
    row.className = 'mp-kpi-row';
    row.append(
      metric('拾獲物品', TOTAL_FOUND_ITEMS, false),
      metric('旅客追蹤', trackedCount ?? localTrackedCount(), true)
    );
    content.append(title, row);
    panel.append(content);
  }

  function removeObsoletePanels(root) {
    hideNode(findByText(root, /核心差異：跨大眾運輸資訊/));

    [/^狀態佇列/, /^時段熱點$/].forEach((matcher) => {
      hideNode(cardFor(findByText(root, matcher)));
    });

    const queue = root.querySelector('section[aria-label="即時佇列"]');
    hideNode(queue);
    hideNode(findByText(root, /^優先佇列/));
    hideNode(findByText(root, /^開啟待辦 drill-down$/));
  }

  function workforceItem(name, station, estimate) {
    const item = document.createElement('article');
    item.className = 'mp-list-item';
    const meta = document.createElement('div');
    meta.className = 'mp-meta';
    const status = document.createElement('span');
    status.className = 'mp-status';
    status.textContent = '現有人力';
    const title = document.createElement('span');
    title.textContent = name;
    meta.append(status, title);
    const description = document.createElement('p');
    description.className = 'mp-footnote';
    description.textContent = `${station} · 估算人力：約 ${estimate} 人`;
    item.append(meta, description);
    return item;
  }

  function replaceWorkforce(root) {
    const heading = findByText(root, /^站務人力/);
    const panel = cardFor(heading);
    if (!panel) return;

    [...panel.children]
      .filter((child) => !child.matches('[data-supervisor-workforce]'))
      .forEach(hideNode);
    const existing = panel.querySelector(':scope > [data-supervisor-workforce]');
    if (existing) {
      showNode(existing);
      return;
    }

    const content = document.createElement('div');
    content.className = 'mp-stack';
    content.dataset.supervisorWorkforce = 'true';
    const title = document.createElement('h3');
    title.style.margin = '0';
    title.textContent = '站務人力';
    const note = document.createElement('p');
    note.className = 'mp-footnote';
    note.textContent = '依公開旅運量與三班輪值基本配置推估，非營運單位正式編制。';
    content.append(
      title,
      note,
      workforceItem('板橋站務', '板橋站', 36),
      workforceItem('桃園青埔站務', 'A18 高鐵桃園站', 12)
    );
    panel.append(content);
  }

  function enhance() {
    const root = dashboard();
    if (!root) return;
    removeObsoletePanels(root);
    replaceKpis(root);
    replaceWorkforce(root);
    loadTrackedCount();
  }

  function scheduleEnhance(delay) {
    window.setTimeout(enhance, delay);
  }

  window.addEventListener('load', () => {
    STARTUP_DELAYS.forEach(scheduleEnhance);
  });
  document.addEventListener('click', () => {
    CLICK_DELAYS.forEach(scheduleEnhance);
  });
  STARTUP_DELAYS.forEach(scheduleEnhance);
})();
