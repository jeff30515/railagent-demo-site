(() => {
  'use strict';

  const apiBaseUrl = new URLSearchParams(window.location.search).get('apiBaseUrl');
  if (!apiBaseUrl) return;

  let endpoint;
  try {
    endpoint = new URL('/api/lost-found/match', apiBaseUrl).toString();
  } catch {
    return;
  }

  const searchLabels = ['搜尋可能相符物品', '搜尋可能符合的物品', '搜尋可能符合个物品', 'Search for possible matches'];

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || !searchLabels.includes(button.textContent.trim())) return;

    // Capture phase prevents the bundled demo matcher from replacing local API results.
    event.preventDefault();
    event.stopImmediatePropagation();
    void search(button);
  }, true);

  async function search(button) {
    const panel = button.closest('section');
    const inputs = [...(panel?.querySelectorAll('input') ?? [])].filter((input) => input.offsetParent !== null);
    if (inputs.length < 7) {
      render(button, null, '找不到遺失物表單欄位，請重新整理頁面後再試。');
      return;
    }

    const [itemType, color, brand, features, lostDate, stationName, trainNumber] = inputs;
    const request = {
      itemType: itemType.value.trim(),
      color: color.value.trim(),
      brand: brand.value.trim(),
      features: features.value.trim(),
      lostDate: lostDate.value.trim(),
      stationName: stationName.value.trim(),
      trainNumber: trainNumber.value.trim()
    };

    if (!request.itemType && !request.features) {
      render(button, null, '請至少填寫物品類型或特徵關鍵字。');
      return;
    }

    button.disabled = true;
    render(button, null, '正在以本機 Ollama 搜尋臺鐵本機資料快照…');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `本機服務回應 ${response.status}`);
      render(button, body, null);
    } catch (error) {
      render(button, null, `無法連線至本機遺失物服務：${error.message}`);
    } finally {
      button.disabled = false;
    }
  }

  function render(button, response, error) {
    let result = document.getElementById('railagent-local-lost-found-result');
    if (!result) {
      result = document.createElement('section');
      result.id = 'railagent-local-lost-found-result';
      result.className = 'mp-stack';
      result.setAttribute('aria-live', 'polite');
      button.closest('section')?.insertAdjacentElement('afterend', result);
    }

    if (error) {
      result.innerHTML = `<h3 class="mp-section-title">本機 AI 搜尋結果</h3><article class="mp-card"><p>${escapeHtml(error)}</p></article>`;
      return;
    }

    const candidates = Array.isArray(response.candidates) ? response.candidates : [];
    const metadata = `本機資料快照至 ${formatDate(response.sourceMaxPickupDate)} · 模式：${escapeHtml(response.aiMode || 'unknown')}`;
    const cards = candidates.length
      ? candidates.map(candidate => candidateCard(candidate)).join('')
      : '<article class="mp-card"><p>本機資料快照中沒有達到門檻的候選物品。</p></article>';

    result.innerHTML = `<h3 class="mp-section-title">本機 AI 搜尋結果（${candidates.length}）</h3><p class="mp-footnote">${metadata}</p>${cards}`;
  }

  function candidateCard(candidate) {
    const item = candidate.item || {};
    const location = item.stationName || item.pickupLocation || '未提供地點';
    const detail = [item.propertyFeature, item.trainNumber ? `車次 ${item.trainNumber}` : ''].filter(Boolean).join(' · ');
    return `<article class="mp-list-item"><div class="mp-meta"><span class="mp-status">${escapeHtml(String(candidate.similarity ?? 0))}% 相似</span><span>${escapeHtml(location)}</span></div><h3>${escapeHtml(item.propertyName || '未命名物品')}</h3><p class="mp-footnote">拾獲日期：${escapeHtml(formatDate(item.pickupDate))}${detail ? ` · ${escapeHtml(detail)}` : ''}</p><p class="mp-footnote">${escapeHtml(candidate.reason || '')}</p><p class="mp-meta">保管電話：${escapeHtml(item.keepStationTel || '請洽臺鐵')}${item.keepStationAddr ? ` · ${escapeHtml(item.keepStationAddr)}` : ''}</p></article>`;
  }

  function formatDate(value) {
    return value ? String(value).slice(0, 10) : '未提供';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  }
})();
