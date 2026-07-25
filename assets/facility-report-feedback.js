(function () {
  const COPY = {
    en: ['Describe the issue on site', 'Please describe the issue before submitting.', 'Thank you for your feedback!'],
    ja: ['現場の問題を説明してください', '送信前に現場の問題を入力してください。', 'フィードバックありがとうございます！'],
    ko: ['현장 문제를 설명해 주세요', '제출하기 전에 현장 문제를 입력해 주세요.', '의견을 보내주셔서 감사합니다!'],
    vi: ['Mô tả vấn đề tại hiện trường', 'Vui lòng mô tả vấn đề trước khi gửi.', 'Cảm ơn phản hồi của bạn!'],
    id: ['Jelaskan masalah di lokasi', 'Masukkan masalah di lokasi sebelum mengirim.', 'Terima kasih atas masukan Anda!'],
    th: ['อธิบายปัญหาหน้างาน', 'กรุณาอธิบายปัญหาก่อนส่ง', 'ขอบคุณสำหรับข้อเสนอแนะ!'],
    'zh-TW': ['\u8acb\u63cf\u8ff0\u73fe\u5834\u554f\u984c', '\u8acb\u8f38\u5165\u73fe\u5834\u554f\u984c\u5f8c\u518d\u9001\u51fa\u3002', '\u611f\u8b1d\u60a8\u7684\u56de\u994b!'],
    nan: ['\u8acb\u63cf\u8ff0\u73fe\u5834\u554f\u984c', '\u8acb\u8f38\u5165\u73fe\u5834\u554f\u984c\u5f8c\u518d\u9001\u51fa\u3002', '\u611f\u8b1d\u60a8\u7684\u56de\u994b!'],
    hak: ['\u8acb\u63cf\u8ff0\u73fe\u5834\u554f\u984c', '\u8acb\u8f38\u5165\u73fe\u5834\u554f\u984c\u5f8c\u518d\u9001\u51fa\u3002', '\u611f\u8b1d\u60a8\u7684\u56de\u994b!'],
  };

  function copy() {
    const language = (document.documentElement.lang || '').toLowerCase();
    const key = language.startsWith('zh') ? 'zh-TW' : language.split('-')[0];
    const [issueLabel, requiredMessage, thankYouMessage] = COPY[key] || COPY.en;
    return { issueLabel, requiredMessage, thankYouMessage };
  }

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

    const localized = copy();
    const form = createElement('form', { className: 'mp-stack', noValidate: true });
    const label = createElement('label', { htmlFor: 'facility-issue', textContent: localized.issueLabel });
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
        error.textContent = localized.requiredMessage;
        error.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }

      card.replaceChildren(
        createElement('p', {
          className: 'facility-report-feedback__success',
          role: 'status',
          textContent: localized.thankYouMessage,
          style: 'margin: 0; text-align: center; color: #0f766e; font-weight: 700; line-height: 1.6;',
        }),
      );
    });
  }

  const observer = new MutationObserver(enhanceFacilityReport);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhanceFacilityReport();
})();
