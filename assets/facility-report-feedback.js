(function () {
  const ISSUE_LABEL = '\u8acb\u63cf\u8ff0\u73fe\u5834\u554f\u984c';
  const REQUIRED_MESSAGE = '\u8acb\u8f38\u5165\u73fe\u5834\u554f\u984c\u5f8c\u518d\u9001\u51fa\u3002';
  const THANK_YOU_MESSAGE = '\u611f\u8b1d\u60a8\u7684\u56de\u994b!';

  function createElement(name, options) {
    const element = document.createElement(name);
    Object.assign(element, options);
    return element;
  }

  function enhanceFacilityReport() {
    const page = document.querySelector('[data-service-page="facility-report"]');
    if (!page || page.querySelector('#facility-issue')) return;

    const card = page.querySelector('.mp-card.mp-stack');
    const submitButton = card && card.querySelector('button.mp-primary');
    if (!card || !submitButton) return;

    const form = createElement('form', { className: 'mp-stack', noValidate: true });
    const label = createElement('label', { htmlFor: 'facility-issue', textContent: ISSUE_LABEL });
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
      if (!input.value.trim()) {
        error.textContent = REQUIRED_MESSAGE;
        error.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }

      card.replaceChildren(
        createElement('p', {
          className: 'facility-report-feedback__success',
          role: 'status',
          textContent: THANK_YOU_MESSAGE,
          style: 'margin: 0; text-align: center; color: #0f766e; font-weight: 700; line-height: 1.6;',
        }),
      );
    });
  }

  const observer = new MutationObserver(enhanceFacilityReport);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhanceFacilityReport();
})();
