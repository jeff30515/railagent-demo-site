import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeSnapshot } from './storage.js';
import type { TransportCatalog } from './contracts.js';

const tempRoots: string[] = [];

describe('transport knowledge snapshot storage', () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it('writes the catalog and nested snapshot files inside the snapshot root', async () => {
    const root = await createTempRoot();
    const catalog: TransportCatalog = {
      generatedAt: '2026-07-25T14:00:00.000Z',
      entries: [
        {
          id: 'stations',
          title: 'Station metadata',
          sourceUrl: 'https://example.test/stations.json',
          downloadedAt: '2026-07-25T13:58:00.000Z',
          format: 'json',
          relativePath: 'raw/stations.json',
          status: 'downloaded'
        },
        {
          id: 'tdx-blocked',
          title: 'TDX protected feed',
          sourceUrl: 'https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/Station',
          downloadedAt: '2026-07-25T13:59:00.000Z',
          format: 'json',
          status: 'blocked',
          error: 'Credentials are not configured'
        }
      ]
    };

    await writeSnapshot(root, catalog, [
      { relativePath: 'raw/stations.json', contents: '{"stations":[]}' },
      { relativePath: 'derived/topics/stations.txt', contents: 'station topic text' }
    ]);

    await expect(readFile(join(root, 'transport-catalog.json'), 'utf8'))
      .resolves.toBe(`${JSON.stringify(catalog, null, 2)}\n`);
    await expect(readFile(join(root, 'raw', 'stations.json'), 'utf8'))
      .resolves.toBe('{"stations":[]}');
    await expect(readFile(join(root, 'derived', 'topics', 'stations.txt'), 'utf8'))
      .resolves.toBe('station topic text');
  });

  it('rejects snapshot file paths that resolve outside the snapshot root', async () => {
    const root = await createTempRoot();
    const escapedPath = join(root, '..', 'escaped.txt');

    await expect(writeSnapshot(root, { generatedAt: 'now', entries: [] }, [
      { relativePath: '../escaped.txt', contents: 'secret' }
    ])).rejects.toThrow(/outside snapshot root/);
    expect(existsSync(escapedPath)).toBe(false);
  });
});

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'transport-knowledge-'));
  tempRoots.push(root);
  return root;
}
