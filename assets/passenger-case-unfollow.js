(function () {
  const hiddenTaskIds = new Set();

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
      if (hiddenTaskIds.has(eventId)) {
        article.remove();
        return;
      }
      if (article.querySelector('[data-passenger-unfollow]')) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mp-secondary';
      button.textContent = '取消追蹤';
      button.setAttribute('data-passenger-unfollow', '');
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        hiddenTaskIds.add(eventId);
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
