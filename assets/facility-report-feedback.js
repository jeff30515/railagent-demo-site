(function () {
  function createElement(name, options) {
    const element = document.createElement(name);
    Object.assign(element, options);
    return element;
  }

  function currentCopy() {
    return window.RailAgentPassengerRuntimeLocales.getRuntimeCopy(document.documentElement.lang);
  }

  function syncMountedCopy(page) {
    const copy = currentCopy();
    const input = page.querySelector('#facility-issue');
    if (!input) return copy;

    const label = page.querySelector('label');
    if (label && label.textContent !== copy.facilityIssue) {
      label.textContent = copy.facilityIssue;
      label.append(input);
    }

    return copy;
  }

  function enhanceFacilityReport() {
    const page = document.querySelector('[data-service-page="facility-report"]');
    if (!page) return;
    if (page.querySelector('#facility-issue')) {
      syncMountedCopy(page);
      return;
    }

    const card = page.querySelector('.mp-card.mp-stack');
    const submitButton = card && card.querySelector('button.mp-primary');
    if (!card || !submitButton) return;

    const copy = currentCopy();
    const form = createElement('form', { className: 'mp-stack', noValidate: true });
    const label = createElement('label', { htmlFor: 'facility-issue', textContent: copy.facilityIssue });
    const input = createElement('textarea', {
      id: 'facility-issue',
      name: 'facility-issue',
      rows: 4,
      required: true,
    });
    const error = createElement('p', { role: 'alert', hidden: true });
    const submit = createElement('button', {
      type: 'submit',
      className: submitButton.className,
      textContent: submitButton.textContent,
    });

    label.append(input);
    form.append(label, error, submit);
    card.replaceChildren(form);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const activeCopy = currentCopy();
      if (!input.value.trim()) {
        error.textContent = activeCopy.facilityRequired;
        error.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }

      window.RailAgentSupervisorHistory?.recordFacilityReport(new Date().toISOString());
      card.replaceChildren(
        createElement('p', {
          className: 'facility-report-feedback__success',
          role: 'status',
          textContent: activeCopy.facilityThanks,
          style: 'margin: 0; text-align: center; color: #0f766e; font-weight: 700; line-height: 1.6;',
        }),
      );
    });
  }

  const observer = new MutationObserver(enhanceFacilityReport);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'], childList: true, subtree: true });
  enhanceFacilityReport();
})();
