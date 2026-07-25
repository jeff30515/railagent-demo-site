import { describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildQueryText, loadLostItemStore, rankByEmbedding, rankByRules } from './repository.js';

const records = [
  {
    id: 'bag',
    pickupDate: '2026-07-21T10:00:00+08:00',
    propertyName: '背包',
    pickupLocation: '台北站',
    propertyFeature: '黑色 Nike 拉鍊',
    stationName: '台北',
    sourceName: '臺鐵遺失物資料集',
    sourceUrl: 'official',
    searchableText: '背包 台北站 黑色 Nike 拉鍊'
  },
  {
    id: 'bottle',
    pickupDate: '2026-07-21T10:00:00+08:00',
    propertyName: '水瓶',
    pickupLocation: '車次: 123',
    trainNumber: '123',
    sourceName: '臺鐵遺失物資料集',
    sourceUrl: 'official',
    searchableText: '水瓶 車次 123'
  }
] as const;

describe('lost item repository', () => {
  it('ranks matching name, date, station, and train without excluding missing color', () => {
    const ranked = rankByRules({
      itemType: '背包',
      color: '黑色',
      brand: 'Nike',
      features: '',
      lostDate: '2026-07-20',
      stationName: '台北',
      trainNumber: ''
    }, [...records], 10);

    expect(ranked[0].record.id).toBe('bag');
    expect(ranked[0].matchedSignals).toEqual(expect.arrayContaining(['物品名稱', '日期', '車站']));
  });

  it('combines field score and cosine similarity', () => {
    const rules = rankByRules({
      itemType: '背包',
      color: '',
      brand: '',
      features: '拉鍊',
      lostDate: '',
      stationName: '',
      trainNumber: ''
    }, [...records], 10);

    const ranked = rankByEmbedding(rules, [1, 0], {
      model: 'bge-m3',
      generatedAt: 'now',
      sourceDownloadedAt: 'source',
      dimensions: 2,
      entries: [
        { id: 'bag', embedding: [1, 0] },
        { id: 'bottle', embedding: [0, 1] }
      ]
    }, 10);

    expect(ranked[0].record.id).toBe('bag');
    expect(ranked[0].similarity).toBeGreaterThan(80);
  });

  it('rejects records outside the pickup date window', () => {
    const ranked = rankByRules({
      itemType: '背包',
      color: '',
      brand: '',
      features: '',
      lostDate: '2026-07-20',
      stationName: '',
      trainNumber: ''
    }, [
      ...records,
      { ...records[0], id: 'before', pickupDate: '2026-07-19T23:59:59+08:00' },
      { ...records[0], id: 'too-late', pickupDate: '2026-08-20T00:00:01+08:00' }
    ], 10);

    expect(ranked.map(({ record }) => record.id)).not.toContain('before');
    expect(ranked.map(({ record }) => record.id)).not.toContain('too-late');
  });

  it('ignores embedding entries with missing ids or wrong dimensions', () => {
    const rules = rankByRules({
      itemType: '',
      color: '',
      brand: '',
      features: '',
      lostDate: '',
      stationName: '',
      trainNumber: '123'
    }, [...records], 10);

    const ranked = rankByEmbedding(rules, [1, 0], {
      model: 'bge-m3',
      generatedAt: 'now',
      sourceDownloadedAt: 'source',
      dimensions: 2,
      entries: [
        { id: 'bag', embedding: [1] },
        { id: 'missing', embedding: [1, 0] },
        { id: 'bottle', embedding: [0, 1] }
      ]
    }, 10);

    expect(ranked.map(({ record }) => record.id)).toEqual(['bottle']);
  });

  it('builds query text from non-empty input fields', () => {
    expect(buildQueryText({
      itemType: '背包',
      color: '',
      brand: 'Nike',
      features: '',
      lostDate: '2026-07-20',
      stationName: '',
      trainNumber: ''
    })).toBe('物品名稱 背包，品牌 Nike，遺失日期 2026-07-20');
  });

  it('loads the snapshot and matching embedding index from explicit paths', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'lost-item-repository-'));
    try {
      const snapshotPath = join(dir, 'snapshot.json');
      const indexPath = join(dir, 'index.json');
      await writeFile(snapshotPath, '\ufeff' + JSON.stringify({
        metadata: {
          sourceUrl: 'official',
          downloadedAt: 'source',
          sourceRecordCount: 2,
          sourceMaxPickupDate: '2026-07-21T10:00:00+08:00'
        },
        records
      }));
      await writeFile(indexPath, '\ufeff' + JSON.stringify({
        model: 'bge-m3',
        generatedAt: 'now',
        sourceDownloadedAt: 'source',
        dimensions: 2,
        entries: [{ id: 'bag', embedding: [1, 0] }]
      }));

      const store = await loadLostItemStore({ snapshot: snapshotPath, index: indexPath });

      expect(store.snapshot.records).toHaveLength(2);
      expect(store.index?.entries[0].id).toBe('bag');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('drops stale or missing embedding indexes while keeping the snapshot', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'lost-item-repository-'));
    try {
      const snapshotPath = join(dir, 'snapshot.json');
      const indexPath = join(dir, 'index.json');
      await writeFile(snapshotPath, JSON.stringify({
        metadata: {
          sourceUrl: 'official',
          downloadedAt: 'fresh',
          sourceRecordCount: 2,
          sourceMaxPickupDate: '2026-07-21T10:00:00+08:00'
        },
        records
      }));
      await writeFile(indexPath, JSON.stringify({
        model: 'bge-m3',
        generatedAt: 'now',
        sourceDownloadedAt: 'stale',
        dimensions: 2,
        entries: [{ id: 'bag', embedding: [1, 0] }]
      }));

      await expect(loadLostItemStore({ snapshot: snapshotPath, index: join(dir, 'missing.json') }))
        .resolves.toMatchObject({ index: null });
      await expect(loadLostItemStore({ snapshot: snapshotPath, index: indexPath }))
        .resolves.toMatchObject({ index: null });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
