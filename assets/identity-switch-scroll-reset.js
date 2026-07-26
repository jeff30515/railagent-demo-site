(() => {
  'use strict';

  function resetProductShellScroll() {
    const shell = document.querySelector('main.mobile-app.mobile-product');
    if (!shell) return;

    shell.scrollTop = 0;
    shell.scrollLeft = 0;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  let wasAtIdentityGate = false;

  function resetWhenReturningToIdentityGate() {
    const isAtIdentityGate = Boolean(document.querySelector(
      'main.mobile-app.mobile-product.mp-phase-gate',
    ));

    if (isAtIdentityGate && !wasAtIdentityGate) {
      requestAnimationFrame(resetProductShellScroll);
    }

    wasAtIdentityGate = isAtIdentityGate;
  }

  document.addEventListener('DOMContentLoaded', () => {
    resetProductShellScroll();
    wasAtIdentityGate = Boolean(document.querySelector(
      'main.mobile-app.mobile-product.mp-phase-gate',
    ));
    new MutationObserver(resetWhenReturningToIdentityGate).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  });
})();
