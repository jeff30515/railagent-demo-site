(function () {
  const TRACKED_CASES_KEY = 'railagent-tracked-lost-found-cases';

  function trackedRecords(list) {
    try {
      const records = JSON.parse(list.dataset.signature || '[]');
      return Array.isArray(records) ? records : [];
    } catch {
      return [];
    }
  }

  function recordIdForArticle(list, article) {
    const index = Array.from(list.querySelectorAll('article.mp-list-item')).indexOf(article);
    return trackedRecords(list)[index]?.id || '';
  }

  function removeTrackedCase(recordId) {
    if (!recordId) return;
    try {
      const records = JSON.parse(window.localStorage.getItem(TRACKED_CASES_KEY) || '[]');
      if (!Array.isArray(records)) return;
      const remaining = records.filter((entry) => entry.id !== recordId);
      window.localStorage.setItem(TRACKED_CASES_KEY, JSON.stringify(remaining));
    } catch {
      // Keep the visible cancellation state even if browser storage is unavailable.
    }
  }

  function caseId(article) {
    const meta = article.querySelector('.mp-meta');
    const labels = meta ? Array.from(meta.querySelectorAll('span')) : [];
    return labels[1] ? labels[1].textContent.trim() : '';
  }

  function renderStatus(section, eventId) {
    let status = section.querySelector('[data-passenger-unfollow-status]');
    if (!status) {
      status = document.createElement('p');
      status.className = 'mp-status';
      status.setAttribute('data-passenger-unfollow-status', '');
      section.append(status);
    }
    status.textContent = '已取消追蹤 ' + eventId;
  }

  function enhancePassengerCases(root) {
    const scope = root || document;
    const section = scope.querySelector('section[aria-label="public own case list"]');
    if (!section) return false;

    const list =
      section.querySelector('#railagent-tracked-lost-found-cases') ||
      Array.from(section.querySelectorAll('.mp-list')).find((candidate) => candidate.querySelector('article.mp-list-item'));
    if (!list) return false;

    Array.from(list.querySelectorAll('article.mp-list-item')).forEach((article) => {
      const eventId = caseId(article);
      if (!eventId) return;
      const recordId = recordIdForArticle(list, article);
      if (article.querySelector('[data-passenger-unfollow]')) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mp-secondary';
      button.textContent = '取消追蹤';
      button.setAttribute('data-passenger-unfollow', '');
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeTrackedCase(recordId);
        article.remove();
        renderStatus(section, eventId);
      });
      article.append(button);
    });

    return true;
  }

  window.PassengerCaseUnfollow = { enhancePassengerCases };
  const observer = new MutationObserver(() => enhancePassengerCases(document));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhancePassengerCases(document);
})();
