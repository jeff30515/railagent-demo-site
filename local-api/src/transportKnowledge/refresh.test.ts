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

  it('downloads sources and writes the catalog plus derived accessibility documents', async () => {
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

      return new Response('<html><body>official station accessibility</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    };

    await refreshTransportKnowledge({
      root,
      fetch,
      now: () => new Date(downloadedAt),
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

    const accessibilityDocuments = await readFile(
      join(root, 'transport-knowledge', 'accessibility-documents.jsonl'),
      'utf8',
    );
    expect(accessibilityDocuments).toContain('Taipei Main Station');
  });
});

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'transport-knowledge-refresh-'));
  tempRoots.push(root);
  return root;
}
