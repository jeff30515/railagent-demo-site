import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { refreshTransportKnowledge } from './refresh.js';
import type { TransportCatalog } from './contracts.js';

const tempRoots: string[] = [];

describe('transport knowledge refresh', () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it('downloads sources and writes the catalog plus derived station documents', async () => {
    const root = await createTempRoot();
    const downloadedAt = '2026-07-25T17:00:00.000Z';
    const fetch = async (input: string | URL | Request) => {
      const url = input.toString();

      if (url.includes('data.taipei')) {
        return Response.json({
          results: [
            {
              StationName: 'Taipei Main Station',
              StationAddress: 'No. 1',
            },
          ],
        });
      }

      if (url.includes('/auth/realms/TDXConnect/')) {
        return Response.json({ access_token: 'test-token' });
      }

      if (url.includes('/Rail/TRA/Station')) {
        return Response.json([
          {
            StationID: '1000',
            StationName: { Zh_tw: '?箏?' },
            StationAddress: 'No. 1',
          },
        ]);
      }

      if (url.includes('tdx.transportdata.tw')) {
        return Response.json([]);
      }

      return new Response('<html><body>official station accessibility</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    };

    await refreshTransportKnowledge({
      root,
      fetch,
      now: () => new Date(downloadedAt),
      tdxClientId: 'client-id',
      tdxClientSecret: 'client-secret',
    });

    const catalog = JSON.parse(await readFile(join(root, 'transport-catalog.json'), 'utf8')) as TransportCatalog;
    expect(catalog.entries).toContainEqual(
      expect.objectContaining({
        id: 'taipei-metro-od-stations',
        downloadedAt,
        status: 'downloaded',
        relativePath: 'transport-raw/taipei-metro/taipei-metro-od-stations.json',
      }),
    );

    const stationDocuments = await readFile(
      join(root, 'transport-knowledge', 'station-documents.jsonl'),
      'utf8',
    );
    expect(stationDocuments).toContain('?箏?');
  });
});

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'transport-knowledge-refresh-'));
  tempRoots.push(root);
  return root;
}
