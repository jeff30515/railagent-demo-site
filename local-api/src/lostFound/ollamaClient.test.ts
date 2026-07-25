import { describe, expect, it, vi } from 'vitest';
import { createOllamaClient } from './ollamaClient.js';

const candidate = {
  id: 'known',
  similarity: 80,
  matchedSignals: [],
  record: {}
};

describe('Ollama client', () => {
  it('uses bge-m3 and gemma4:e4b with non-streaming requests', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ embeddings: [[1, 0]] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        message: { content: JSON.stringify({ rankings: [{ id: 'known', similarity: 93, reason: 'strong station match' }], notice: 'ok' }) }
      }), { status: 200 }));
    const client = createOllamaClient({ fetcher, timeoutMs: 1000 });

    await client.embed('black bag');
    const rankings = await client.rerank({
      itemType: 'bag',
      color: '',
      brand: '',
      features: '',
      lostDate: '',
      stationName: '',
      trainNumber: ''
    }, [candidate]);

    expect(JSON.parse(fetcher.mock.calls[0][1].body as string)).toMatchObject({ model: 'bge-m3', input: 'black bag' });
    expect(JSON.parse(fetcher.mock.calls[1][1].body as string)).toMatchObject({
      model: 'gemma4:e4b',
      stream: false,
      think: false,
      options: { temperature: 0, num_predict: 512 }
    });
    expect(rankings).toEqual([{ id: 'known', similarity: 93, reason: 'strong station match' }]);
  });

  it('uses the local chat model for a passenger question', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: { content: '請前往服務台，並提供遺失物特徵。' }
    }), { status: 200 }));
    const client = createOllamaClient({ fetcher });

    await expect(client.chat('我在臺北站遺失錢包，該怎麼辦？')).resolves.toBe('請前往服務台，並提供遺失物特徵。');
    expect(JSON.parse(fetcher.mock.calls[0][1].body as string)).toMatchObject({
      model: 'gemma4:e4b',
      stream: false,
      think: false,
      messages: expect.arrayContaining([{ role: 'user', content: '我在臺北站遺失錢包，該怎麼辦？' }])
    });
  });

  it('removes unknown IDs and clamps similarity', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: { content: JSON.stringify({ rankings: [
        { id: 'fake', similarity: 100, reason: 'x' },
        { id: 'known', similarity: 140, reason: 'match' }
      ], notice: 'x' }) }
    }), { status: 200 }));
    const client = createOllamaClient({ fetcher });

    const rankings = await client.rerank({} as never, [candidate]);

    expect(rankings).toEqual([{ id: 'known', similarity: 100, reason: 'match' }]);
  });

  it('rejects an ID outside the capped reranking prompt', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: { content: JSON.stringify({ rankings: [{ id: 'fourth', similarity: 90, reason: 'not sent' }] }) }
    }), { status: 200 }));
    const client = createOllamaClient({ fetcher });
    const rankings = await client.rerank({} as never, [candidate, { ...candidate, id: 'second' }, { ...candidate, id: 'third' }, { ...candidate, id: 'fourth' }]);

    expect(rankings).toEqual([]);
  });

  it('passes an AbortSignal timeout to injected fetch', async () => {
    const fetcher = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      expect(init.signal).toBeInstanceOf(AbortSignal);
      return Promise.reject(new DOMException('The operation was aborted.', 'TimeoutError'));
    });
    const client = createOllamaClient({ fetcher, timeoutMs: 1 });

    await expect(client.embed('bag')).rejects.toThrow('The operation was aborted.');
  });

  it('rejects HTTP errors from Ollama', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('nope', { status: 503 }));
    const client = createOllamaClient({ fetcher });

    await expect(client.embed('bag')).rejects.toThrow('Ollama /api/embed returned 503.');
  });

  it('rejects malformed ranking JSON', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: { content: 'not json' }
    }), { status: 200 }));
    const client = createOllamaClient({ fetcher });

    await expect(client.rerank({} as never, [candidate])).rejects.toThrow();
  });

  it('rejects empty embedding responses', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ embeddings: [] }), { status: 200 }));
    const client = createOllamaClient({ fetcher });

    await expect(client.embed('bag')).rejects.toThrow('Ollama embedding response is empty.');
  });
});
