(() => {
  'use strict';

  const profiles = {
    'ntmetro-staff-banqiao': { unit: '板橋站務員', account: 'ntmetro-staff-banqiao' },
    'ntmetro-supervisor': { unit: '新北捷運值班主管', account: 'ntmetro-supervisor' },
    'tymetro-staff-qingpu': { unit: '桃捷青埔站務員', account: 'tymetro-staff-qingpu' }
  };

  function accountSection() {
    return document.querySelector('section[aria-label="帳戶"]') ||
      [...document.querySelectorAll('section.mp-stack')].find((section) =>
        [...section.querySelectorAll('button')].some((button) => button.textContent.includes('返回身分選擇'))
      );
  }

  function enhanceAccount() {
    const profile = profiles[localStorage.getItem('railagent.mobile.account')];
    const section = accountSection();
    if (!profile || !section || section.dataset.roleAccountProfile === profile.account) return;

    const returnButton = [...section.querySelectorAll('button')].find((button) =>
      button.textContent.includes('返回身分選擇')
    );
    if (!returnButton) return;

    const card = document.createElement('article');
    card.className = 'mp-card mp-stack';
    const unit = document.createElement('h3');
    unit.textContent = profile.unit;
    const account = document.createElement('p');
    account.className = 'mp-footnote';
    account.textContent = `帳號：${profile.account}`;
    card.append(unit, account);

    section.dataset.roleAccountProfile = profile.account;
    section.replaceChildren(card, returnButton);
  }

  const scheduleEnhance = () => window.setTimeout(enhanceAccount, 0);
  window.addEventListener('load', scheduleEnhance);
  document.addEventListener('click', scheduleEnhance);
  new MutationObserver(scheduleEnhance).observe(document.documentElement, { childList: true, subtree: true });
  scheduleEnhance();
})();
