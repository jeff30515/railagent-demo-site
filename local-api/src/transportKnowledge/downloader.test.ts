import { describe, expect, it } from 'vitest';

import { downloadSources } from './downloader.js';

describe('transport knowledge downloader', () => {
  it('catalogues a failed public source while returning successful files', async () => {
    const downloadedAt = '2026-07-25T14:00:00.000Z';
    const fetchCalls: string[] = [];
    const tdxDataAuthorizations: Array<string | undefined> = [];
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

      if (url.includes('/auth/realms/TDXConnect/')) {
        return Response.json({ access_token: 'test-token' });
      }

      if (url.includes('tdx.transportdata.tw')) {
        tdxDataAuthorizations.push((init?.headers as Record<string, string> | undefined)?.Authorization);
        return Response.json({ source: 'tdx', url });
      }

      return new Response('<html><body>accessible station services</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    };

    const result = await downloadSources({
      fetch,
      now: () => new Date(downloadedAt),
      tdxClientId: 'client-id',
      tdxClientSecret: 'client-secret',
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
    expect(JSON.stringify(result)).not.toContain('client-secret');
    expect(tdxDataAuthorizations).toContain('Bearer test-token');
    expect(fetchCalls.some((url) => url.includes('railway.gov.tw'))).toBe(true);
  });

  it('blocks every TDX source without credentials and does not request TDX hosts', async () => {
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
    });

    const tdxEntries = result.catalog.entries.filter((entry) => entry.id.startsWith('tdx-'));
    expect(tdxEntries).toHaveLength(6);
    expect(tdxEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'tdx-tra-stations', status: 'blocked', error: 'Missing TDX credentials' }),
        expect.objectContaining({ id: 'tdx-tra-timetables', status: 'blocked', error: 'Missing TDX credentials' }),
        expect.objectContaining({ id: 'tdx-thsr-stations', status: 'blocked', error: 'Missing TDX credentials' }),
        expect.objectContaining({ id: 'tdx-thsr-timetables', status: 'blocked', error: 'Missing TDX credentials' }),
        expect.objectContaining({ id: 'tdx-trtc-stations', status: 'blocked', error: 'Missing TDX credentials' }),
        expect.objectContaining({ id: 'tdx-trtc-lines-transfers', status: 'blocked', error: 'Missing TDX credentials' }),
      ]),
    );
    expect(tdxEntries.every((entry) => entry.downloadedAt === downloadedAt)).toBe(true);
    expect(tdxEntries.every((entry) => entry.relativePath === undefined)).toBe(true);
    expect(fetchCalls.every((url) => !url.includes('tdx.transportdata.tw'))).toBe(true);
  });

  it('does not expose TDX credentials when token fetch throws credential-bearing text', async () => {
    const downloadedAt = '2026-07-25T16:00:00.000Z';
    const sentinelClientId = 'sentinel-client-id-9bb89a';
    const sentinelClientSecret = 'sentinel-client-secret-0d784c';
    const fetch = async (input: string | URL | Request) => {
      const url = input.toString();

      if (url.includes('/auth/realms/TDXConnect/')) {
        throw new Error(`token request failed for ${sentinelClientId} using ${sentinelClientSecret}`);
      }

      return new Response('public source', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      });
    };

    const result = await downloadSources({
      fetch,
      now: () => new Date(downloadedAt),
      tdxClientId: sentinelClientId,
      tdxClientSecret: sentinelClientSecret,
    });

    const serializedResult = JSON.stringify(result);
    expect(serializedResult).not.toContain(sentinelClientId);
    expect(serializedResult).not.toContain(sentinelClientSecret);
    expect(result.catalog.entries.filter((entry) => entry.id.startsWith('tdx-'))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'tdx-tra-stations', status: 'failed', error: 'TDX OAuth request failed' }),
        expect.objectContaining({ id: 'tdx-thsr-stations', status: 'failed', error: 'TDX OAuth request failed' }),
        expect.objectContaining({ id: 'tdx-trtc-stations', status: 'failed', error: 'TDX OAuth request failed' }),
      ]),
    );
  });
});
