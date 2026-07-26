(function () {
  'use strict';

  const TOTAL_FOUND_ITEMS = 23919;
  const TRACKED_CASES_KEY = 'railagent-tracked-lost-found-cases';
  const STARTUP_DELAYS = [0, 100, 300, 800];
  const CLICK_DELAYS = [0, 50, 150, 400, 1000, 2000];
  let trackedCount = null;
  let trackedRequest = null;
  let historySnapshot = null;
  let historyRequest = null;

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

  function cardByText(root, matcher) {
    return [...root.querySelectorAll('article.mp-card, article, .mp-card')]
      .find((node) => matcher.test(text(node))) || null;
  }

  function hideNode(node) {
    if (!node) return;
    if (!node.matches?.('[data-supervisor-metrics],[data-supervisor-workforce],[data-supervisor-history]')) {
      node.dataset.supervisorHidden = 'true';
    }
    node.hidden = true;
    node.style.display = 'none';
    node.setAttribute('aria-hidden', 'true');
  }

  function showNode(node) {
    if (!node) return;
    node.hidden = false;
    node.style.display = '';
    node.removeAttribute('aria-hidden');
    delete node.dataset.supervisorHidden;
  }

  function clearEnhancerNode(node) {
    while (node?.firstChild) node.removeChild(node.firstChild);
  }

  function restoreReactNodes(root) {
    root.querySelectorAll('[data-supervisor-hidden="true"]').forEach(showNode);
    root.querySelectorAll('[data-supervisor-metrics],[data-supervisor-workforce],[data-supervisor-history]')
      .forEach(hideNode);
  }

  function activeSupervisorTab(root) {
    if (!root) return 'realtime';
    const buttons = [...root.querySelectorAll('button[aria-pressed]')];
    const history = buttons.find((button) => /歷史服務品質分析/.test(text(button)));
    const realtime = buttons.find((button) => /即時營運監控/.test(text(button)));
    if (history?.getAttribute('aria-pressed') === 'true') return 'history';
    if (realtime?.getAttribute('aria-pressed') === 'true') return 'realtime';
    return 'realtime';
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

  function card(title, children) {
    const item = document.createElement('article');
    item.className = 'mp-card mp-stack';
    const heading = document.createElement('h3');
    heading.style.margin = '0';
    heading.textContent = title;
    item.append(heading, ...children);
    return item;
  }

  function totalFor(values) {
    return Object.values(values || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  }

  function renderCalendar(analytics) {
    const lostItems = analytics?.lostItems || {};
    const daily = lostItems.daily || {};
    const calendar = document.createElement('div');
    calendar.className = 'supervisor-calendar';
    calendar.setAttribute('aria-label', '2023 年 7 月拾獲日曆');

    ['日', '一', '二', '三', '四', '五', '六'].forEach((label) => {
      const header = document.createElement('span');
      header.className = 'supervisor-calendar-weekday';
      header.textContent = label;
      calendar.append(header);
    });

    for (let blank = 0; blank < 6; blank += 1) {
      const cell = document.createElement('span');
      cell.className = 'supervisor-calendar-day is-empty';
      cell.setAttribute('aria-hidden', 'true');
      calendar.append(cell);
    }

    for (let day = 1; day <= 31; day += 1) {
      const key = `2023-07-${String(day).padStart(2, '0')}`;
      const unavailable = day >= 18;
      const cell = document.createElement('span');
      cell.className = unavailable ? 'supervisor-calendar-day is-unavailable' : 'supervisor-calendar-day';
      const dayLabel = document.createElement('em');
      dayLabel.textContent = String(day);
      const dayValue = document.createElement('strong');
      dayValue.textContent = unavailable ? '—' : String(daily[key] ?? 0);
      cell.append(dayLabel, dayValue);
      calendar.append(cell);
    }

    return calendar;
  }

  function summaryText(value) {
    return Number(value || 0).toLocaleString('en-US');
  }

  function historyKpiGroup(totals) {
    const row = document.createElement('div');
    row.className = 'mp-kpi-row';
    row.append(
      metric('本週', summaryText(totals?.week), false),
      metric('本月', summaryText(totals?.month), false),
      metric('本年', summaryText(totals?.year), false)
    );
    return row;
  }

  function feedbackGrid(feedback) {
    const row = document.createElement('div');
    row.className = 'supervisor-feedback-grid';
    [1, 2, 3, 4, 5].forEach((score) => {
      const item = document.createElement('div');
      item.className = 'mp-kpi supervisor-score-cell';
      const label = document.createElement('em');
      label.textContent = `${score} 分`;
      const value = document.createElement('strong');
      value.textContent = summaryText(feedback?.[score]);
      item.append(label, value);
      row.append(item);
    });
    return row;
  }

  function renderHistory(root, analytics) {
    const legacyHistory = cardByText(root, /歷史服務品質分析/);
    hideNode(legacyHistory);
    [
      /^跨運具交接與遺失物/,
      /^類型／語言／無障礙分布/,
      /^SLA 違約主因/,
      /^近 30 日事件量趨勢/,
      /^分析方法與 metadata 價值/
    ].forEach((matcher) => hideNode(cardFor(findByText(root, matcher))));

    const lostItems = analytics?.lostItems || {};
    const existing = root.querySelector(':scope > [data-supervisor-history]');
    const container = existing || document.createElement('section');
    if (existing) {
      showNode(existing);
      clearEnhancerNode(container);
    } else {
      container.className = 'mp-stack supervisor-history';
      container.dataset.supervisorHistory = 'true';
      container.setAttribute('aria-label', '主管歷史服務品質四卡');
    }

    const calendarMeta = document.createElement('p');
    calendarMeta.className = 'mp-footnote';
    calendarMeta.textContent = `資料範圍至 ${String(lostItems.coverageEnd || '2023-07-17').replaceAll('-', '/')} · 總計 ${summaryText(lostItems.total || totalFor(lostItems.daily))} 件`;

    container.append(
      card('本月事件量趨勢', [calendarMeta, renderCalendar(analytics)]),
      card('RailAgent 使用次數統計', [historyKpiGroup(analytics?.railAgent?.totals)]),
      card('服務設施回報次數', [historyKpiGroup(analytics?.facilityReports?.totals)]),
      card('服務回饋統計', [feedbackGrid(analytics?.feedback?.totals)])
    );

    if (!existing) root.append(container);
  }

  async function historyAnalytics() {
    if (historySnapshot) return historySnapshot;
    if (historyRequest) return historyRequest;
    const snapshot = window.RailAgentSupervisorHistory?.snapshot;
    if (!snapshot) return null;
    historyRequest = snapshot()
      .then((snapshot) => {
        historySnapshot = snapshot;
        return snapshot;
      })
      .catch(() => null)
      .finally(() => {
        historyRequest = null;
      });
    return historyRequest;
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
    restoreReactNodes(root);
    const tab = activeSupervisorTab(root);

    if (tab === 'realtime') {
      removeObsoletePanels(root);
      replaceKpis(root);
      replaceWorkforce(root);
    }

    if (tab === 'history') {
      historyAnalytics().then((analytics) => {
        if (analytics && activeSupervisorTab(root) === 'history') renderHistory(root, analytics);
      });
    }
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
  window.addEventListener('railagent:analytics-updated', () => {
    historySnapshot = null;
    if (activeSupervisorTab(dashboard()) === 'history') scheduleEnhance(0);
  });
  STARTUP_DELAYS.forEach(scheduleEnhance);
})();
