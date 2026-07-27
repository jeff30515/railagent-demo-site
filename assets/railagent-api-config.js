(() => {
  'use strict';

  const DEFAULT_API_BASE_URL = 'https://detergent-mower-squirt.ngrok-free.dev';

  function resolveApiBaseUrl(search) {
    const configured = new URLSearchParams(search).get('apiBaseUrl');
    try {
      return new URL(configured || DEFAULT_API_BASE_URL).toString();
    } catch {
      return new URL(DEFAULT_API_BASE_URL).toString();
    }
  }

  function withApiHeaders(url, headers = {}) {
    const hostname = new URL(String(url), DEFAULT_API_BASE_URL).hostname;
    if (!hostname.endsWith('.ngrok-free.dev')) return headers;
    return { ...headers, 'ngrok-skip-browser-warning': '1' };
  }

  window.RailAgentApiConfig = Object.freeze({
    DEFAULT_API_BASE_URL,
    resolveApiBaseUrl,
    withApiHeaders,
  });
})();
