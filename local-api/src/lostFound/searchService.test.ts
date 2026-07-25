import { describe, expect, it, vi } from 'vitest';
import type { LostFoundSearchInput, TraEmbeddingIndex, TraLostItemSnapshot } from './contracts.js';
import type { LostItemStore } from './repository.js';
import { createLostFoundSearchService } from './searchService.js';

const bagQuery = (): LostFoundSearchInput => ({
  itemType: 'bag',
  color: 'black',
  brand: 'Nike',
  features: 'zipper',
  lostDate: '2026-07-20',
  stationName: 'Taipei',
  trainNumber: '123'
});

const noMatchQuery = (): LostFoundSearchInput => ({
  itemType: 'umbrella',
  color: '',
  brand: '',
  features: '',
  lostDate: '',
  stationName: '',
  trainNumber: ''
});

const snapshotWithOneBag = (): TraLostItemSnapshot => ({
  metadata: {
    sourceUrl: 'https://official.example/lost-items',
    downloadedAt: '2026-07-24T12:00:00+08:00',
    sourceRecordCount: 1,
    sourceMaxPickupDate: '2026-07-21T10:00:00+08:00'
  },
  records: [{
    id: 'bag',
    pickupDate: '2026-07-21T10:00:00+08:00',
    propertyName: 'bag',
    propertyAmount: '1',
    pickupLocation: 'Taipei station train 123',
    keepStationTel: '02-1234-5678',
    keepStationAddr: 'Taipei keep office',
    propertyFeature: 'black Nike bag with zipper',
    category: 'bag',
    stationName: 'Taipei',
    trainNumber: '123',
    itemCode: 'TRA-BAG-1',
    status: 'found',
    sourceName: '?粹?箏仃?抵???',
    sourceUrl: 'https://official.example/lost-items/bag',
    searchableText: 'bag black Nike zipper Taipei train 123'
  }]
});

const freshIndex = (model = 'bge-m3'): TraEmbeddingIndex => ({
  model,
  generatedAt: '2026-07-24T12:10:00+08:00',
  sourceDownloadedAt: '2026-07-24T12:00:00+08:00',
  dimensions: 2,
  entries: [{ id: 'bag', embedding: [1, 0] }]
});

const storeWithOneBagAndIndex = (index: TraEmbeddingIndex | null = freshIndex()): LostItemStore => ({
  snapshot: snapshotWithOneBag(),
  index
});

describe('lost-found search service', () => {
  it('returns ollama mode when embedding and reranking succeed', async () => {
    const service = createLostFoundSearchService({
      loadStore: vi.fn().mockResolvedValue(storeWithOneBagAndIndex()),
      ollama: {
        embed: vi.fn().mockResolvedValue([[1, 0]]),
        rerank: vi.fn().mockResolvedValue([{ id: 'bag', similarity: 92, reason: 'strong model match' }])
      }
    });

    const result = await service.search(bagQuery());

    expect(result.aiMode).toBe('ollama');
    expect(result.notice).toBe('以下為可能符合的候選，請聯絡保管單位並由站務人員確認。');
    expect(result.candidates[0]).toMatchObject({ id: 'bag', similarity: 92, reason: 'strong model match' });
    expect(result.candidates[0].item.propertyName).toBe('bag');
  });

  it('falls back to embedding-only when Gemma fails', async () => {
    const service = createLostFoundSearchService({
      loadStore: vi.fn().mockResolvedValue(storeWithOneBagAndIndex()),
      ollama: {
        embed: vi.fn().mockResolvedValue([[1, 0]]),
        rerank: vi.fn().mockRejectedValue(new Error('timeout'))
      }
    });

    const result = await service.search(bagQuery());

    expect(result.aiMode).toBe('embedding-only');
    expect(result.fallbackReason).toContain('Gemma');
    expect(result.candidates[0]).toMatchObject({ id: 'bag' });
  });

  it('falls back to rules when the index is unavailable', async () => {
    const service = createLostFoundSearchService({
      loadStore: vi.fn().mockResolvedValue(storeWithOneBagAndIndex(null)),
      ollama: { embed: vi.fn(), rerank: vi.fn() }
    });

    const result = await service.search(bagQuery());

    expect(result.aiMode).toBe('rules');
    expect(result.candidates).toHaveLength(1);
  });

  it('does not call Ollama when rules return no candidates', async () => {
    const ollama = {
      embed: vi.fn().mockResolvedValue([[1, 0]]),
      rerank: vi.fn()
    };
    const service = createLostFoundSearchService({
      loadStore: vi.fn().mockResolvedValue(storeWithOneBagAndIndex()),
      ollama
    });

    const result = await service.search(noMatchQuery());

    expect(result.aiMode).toBe('rules');
    expect(result.candidates).toEqual([]);
    expect(ollama.embed).not.toHaveBeenCalled();
    expect(ollama.rerank).not.toHaveBeenCalled();
  });

  it('treats stale indexes as missing indexes', async () => {
    const staleIndex = { ...freshIndex(), sourceDownloadedAt: '2026-07-23T00:00:00+08:00' };
    const ollama = { embed: vi.fn(), rerank: vi.fn() };
    const service = createLostFoundSearchService({
      loadStore: vi.fn().mockResolvedValue(storeWithOneBagAndIndex(staleIndex)),
      ollama
    });

    const result = await service.search(bagQuery());

    expect(result.aiMode).toBe('rules');
    expect(result.fallbackReason).toContain('stale');
    expect(ollama.embed).not.toHaveBeenCalled();
  });

  it('falls back to rules when embedding fails', async () => {
    const service = createLostFoundSearchService({
      loadStore: vi.fn().mockResolvedValue(storeWithOneBagAndIndex()),
      ollama: {
        embed: vi.fn().mockRejectedValue(new Error('embedding service unavailable')),
        rerank: vi.fn()
      }
    });

    const result = await service.search(bagQuery());

    expect(result.aiMode).toBe('rules');
    expect(result.fallbackReason).toContain('bge-m3');
    expect(result.candidates).toHaveLength(1);
  });

  it('preserves official fields when Gemma reranks a candidate', async () => {
    const service = createLostFoundSearchService({
      loadStore: vi.fn().mockResolvedValue(storeWithOneBagAndIndex()),
      ollama: {
        embed: vi.fn().mockResolvedValue([[1, 0]]),
        rerank: vi.fn().mockResolvedValue([{
          id: 'bag',
          similarity: 95,
          reason: 'Gemma reason must not replace official facts',
          propertyName: 'fake wallet',
          pickupDate: '1999-01-01',
          keepStationTel: '000'
        }])
      }
    });

    const result = await service.search(bagQuery());

    expect(result.candidates[0].item).toMatchObject({
      propertyName: 'bag',
      pickupDate: '2026-07-21T10:00:00+08:00',
      keepStationTel: '02-1234-5678',
      keepStationAddr: 'Taipei keep office'
    });
    expect(result.candidates[0].item).not.toHaveProperty('searchableText');
  });

  it('preserves source metadata and unknown embedding model IDs', async () => {
    const service = createLostFoundSearchService({
      loadStore: vi.fn().mockResolvedValue(storeWithOneBagAndIndex(freshIndex('custom-embedding-model'))),
      ollama: {
        embed: vi.fn().mockResolvedValue([[1, 0]]),
        rerank: vi.fn().mockRejectedValue(new Error('timeout'))
      }
    });

    const result = await service.search(bagQuery());

    expect(result.models).toEqual({ embedding: 'custom-embedding-model', ranking: 'gemma4:e4b' });
    expect(result.sourceUpdatedAt).toBe('2026-07-24T12:00:00+08:00');
    expect(result.sourceMaxPickupDate).toBe('2026-07-21T10:00:00+08:00');
  });
});
