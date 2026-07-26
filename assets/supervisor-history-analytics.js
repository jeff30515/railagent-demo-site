(function () {
  const CHAT_KEY = 'railagent.analytics.chat-uses.v1';
  const FACILITY_KEY = 'railagent.analytics.facility-reports.v1';
  const FEEDBACK_KEY = 'railagent.feedback.v1';
  const SNAPSHOT_URL = '/railagent-demo-site/data/supervisor-history-analytics.json';
  const UPDATE_EVENT = 'railagent:analytics-updated';

  let snapshotPromise = null;

  function parseDate(value) {
    if (typeof value !== 'string') return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function safeRecords(key) {
    try {
      const value = window.localStorage.getItem(key);
      if (!value) return [];
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((record) => record && parseDate(record.createdAt));
    } catch {
      return [];
    }
  }

  function storeRecord(key, createdAt) {
    const date = parseDate(createdAt);
    if (!date) return;
    const records = safeRecords(key);
    records.push({ createdAt });
    try {
      window.localStorage.setItem(key, JSON.stringify(records));
    } catch {
      return;
    }
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { key } }));
  }

  function startOfMondayWeek(date) {
    const start = new Date(date);
    const day = start.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + offset);
    return start;
  }

  function isSameMonth(left, right) {
    return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
  }

  function countsForWindows(records, anchor) {
    const anchorDate = parseDate(anchor);
    const now = new Date();
    const weekStart = startOfMondayWeek(now);
    return records.reduce(
      (totals, record) => {
        const createdAt = parseDate(record.createdAt);
        if (!createdAt || (anchorDate && createdAt <= anchorDate)) return totals;
        if (createdAt.getFullYear() === now.getFullYear()) totals.year += 1;
        if (isSameMonth(createdAt, now)) totals.month += 1;
        if (createdAt >= weekStart) totals.week += 1;
        return totals;
      },
      { week: 0, month: 0, year: 0 },
    );
  }

  function mergeSeed(seed, additions) {
    return {
      week: seed.week + additions.week,
      month: seed.month + additions.month,
      year: seed.year + additions.year,
    };
  }

  function feedbackTotals(seed) {
    return safeRecords(FEEDBACK_KEY).reduce(
      (totals, record) => {
        const score = String(record.score);
        if (Object.prototype.hasOwnProperty.call(totals, score)) totals[score] += 1;
        return totals;
      },
      { ...seed },
    );
  }

  async function loadSnapshot() {
    if (!snapshotPromise) {
      snapshotPromise = fetch(SNAPSHOT_URL).then((response) => {
        if (!response.ok) throw new Error(`Unable to load supervisor analytics snapshot: ${response.status}`);
        return response.json();
      });
    }
    return snapshotPromise;
  }

  async function snapshot() {
    const seed = await loadSnapshot();
    const railAgentAdditions = countsForWindows(safeRecords(CHAT_KEY), seed.railAgent.anchor);
    const facilityAdditions = countsForWindows(safeRecords(FACILITY_KEY), seed.facilityReports.anchor);

    return {
      ...seed,
      railAgent: {
        ...seed.railAgent,
        totals: mergeSeed(seed.railAgent.seed, railAgentAdditions),
      },
      facilityReports: {
        ...seed.facilityReports,
        totals: mergeSeed(seed.facilityReports.seed, facilityAdditions),
      },
      feedback: {
        ...seed.feedback,
        totals: feedbackTotals(seed.feedback.seed),
      },
    };
  }

  window.RailAgentSupervisorHistory = {
    snapshot,
    recordRailAgentUse(createdAt = new Date().toISOString()) {
      storeRecord(CHAT_KEY, createdAt);
    },
    recordFacilityReport(createdAt = new Date().toISOString()) {
      storeRecord(FACILITY_KEY, createdAt);
    },
  };
})();
