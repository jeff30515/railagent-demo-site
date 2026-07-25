import { describe, expect, it } from 'vitest';

import { downloadSources } from './downloader.js';

describe('transport knowledge downloader', () => {
  it('catalogues a failed public source while returning successful files', async () => {
    const downloadedAt = '2026-07-25T14:00:00.000Z';
    const fetchCalls: string[] = [];
    const fetch = async (input: string | URL | Request, init?: RequestInit) => {
      const url = input.toString();
      fetchCalls.push(url);

      if (url.includes('data.taipei')) {
        return new Response('{"stations":[{"name":"Taipei Main Station"}]}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.includes('railway.gov.tw')) {
        return new Response('service unavailable', { status: 503, statusText: 'Service Unavailable' });
      }

      return new Response('<html><body>accessible station services</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    };

    const result = await downloadSources({
      fetch,
      now: () => new Date(downloadedAt),
    });

    const failedTraEntry = result.catalog.entries.find((entry) => entry.id === 'tra-official-accessibility');
    expect(failedTraEntry).toMatchObject({
      sourceUrl: 'https://www.railway.gov.tw/tra-tip-web/tip/tip00H/tipH41/view',
      downloadedAt,
      format: 'html',
      status: 'failed',
      error: 'HTTP 503 Service Unavailable',
    });
    expect(failedTraEntry?.relativePath).toBeUndefined();

    const downloadedTaipeiEntry = result.catalog.entries.find((entry) => entry.id === 'taipei-metro-od-stations');
    expect(downloadedTaipeiEntry).toMatchObject({
      downloadedAt,
      format: 'json',
      status: 'downloaded',
      relativePath: 'transport-raw/taipei-metro/taipei-metro-od-stations.json',
    });
    expect(result.files).toContainEqual({
      relativePath: 'transport-raw/taipei-metro/taipei-metro-od-stations.json',
      contents: '{"stations":[{"name":"Taipei Main Station"}]}',
    });
    expect(result.files.length).toBeGreaterThan(1);
    expect(fetchCalls.some((url) => url.includes('railway.gov.tw'))).toBe(true);
  });

  it('skips TDX requests and catalog entries when extra credential-shaped options are supplied', async () => {
    const downloadedAt = '2026-07-25T15:00:00.000Z';
    const fetchCalls: string[] = [];
    const fetch = async (input: string | URL | Request) => {
      const url = input.toString();
      fetchCalls.push(url);
      return new Response('public source', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      });
    };

    const result = await downloadSources({
      fetch,
      now: () => new Date(downloadedAt),
      tdxClientId: 'ignored-client-id',
      tdxClientSecret: 'ignored-client-secret',
    } as Parameters<typeof downloadSources>[0]);

    expect(result.catalog.entries.filter((entry) => entry.id.startsWith('tdx-'))).toHaveLength(0);
    expect(result.files.filter((file) => file.relativePath.includes('/tdx'))).toHaveLength(0);
    expect(fetchCalls.every((url) => !url.includes('tdx.transportdata.tw'))).toBe(true);
  });
});
