import type { LostFoundSearchInput } from './contracts.js';

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_EMBEDDING_MODEL = 'bge-m3';
const DEFAULT_CHAT_MODEL = 'gemma4:e4b';
const DEFAULT_TIMEOUT_MS = 20_000;

export interface OllamaOptions {
  baseUrl?: string;
  embeddingModel?: string;
  chatModel?: string;
  fetcher?: (url: string, init: RequestInit) => Promise<Response>;
  timeoutMs?: number;
}

export interface ValidatedRanking {
  id: string;
  similarity: number;
  reason: string;
}

export interface OllamaRerankCandidate {
  id: string;
  similarity: number;
  matchedSignals: string[];
  record: unknown;
}

export interface OllamaClient {
  embed(input: string | string[]): Promise<number[][]>;
  rerank(input: LostFoundSearchInput, candidates: readonly OllamaRerankCandidate[]): Promise<ValidatedRanking[]>;
}

export interface OllamaChatClient {
  chat(message: string): Promise<string>;
}

interface EmbedResponse {
  embeddings?: number[][];
}

interface ChatResponse {
  message?: {
    content?: string;
  };
}

interface RankingJson {
  rankings?: Array<{
    id?: unknown;
    similarity?: unknown;
    reason?: unknown;
  }>;
}

const clampSimilarity = (similarity: number): number =>
  Math.max(0, Math.min(100, Math.round(similarity)));

export function createOllamaClient(options: OllamaOptions = {}): OllamaClient & OllamaChatClient {
  const baseUrl = (options.baseUrl ?? process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  const embeddingModel = options.embeddingModel ?? process.env.OLLAMA_EMBED_MODEL ?? DEFAULT_EMBEDDING_MODEL;
  const chatModel = options.chatModel ?? process.env.OLLAMA_CHAT_MODEL ?? DEFAULT_CHAT_MODEL;
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetcher(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`Ollama ${path} returned ${response.status}.`);
    }

    return response.json() as Promise<T>;
  }

  return {
    async embed(input) {
      const response = await post<EmbedResponse>('/api/embed', {
        model: embeddingModel,
        input
      });

      if (!response.embeddings?.length) {
        throw new Error('Ollama embedding response is empty.');
      }

      return response.embeddings;
    },

    async rerank(input, candidates) {
      const promptCandidates = candidates.slice(0, 3);
      const allowedIds = new Set(promptCandidates.map(({ id }) => id));
      const response = await post<ChatResponse>('/api/chat', {
        model: chatModel,
        stream: false,
        think: false,
        format: 'json',
        options: { temperature: 0, num_predict: 512 },
        messages: [
          {
            role: 'system',
            content: [
              'Return only JSON for a railway lost-found reranker.',
              'Use only IDs from candidates.',
              'Schema: {"rankings":[{"id":"...","similarity":0,"reason":"short reason"}],"notice":"short notice"}.',
              'Similarity must be 0-100.'
            ].join(' ')
          },
          {
            role: 'user',
            content: JSON.stringify({
              input,
              candidates: promptCandidates.map(({ id, record, similarity, matchedSignals }) => ({
                id,
                similarity,
                matchedSignals,
                item: record
              }))
            })
          }
        ]
      });

      let parsed: RankingJson;
      try {
        parsed = JSON.parse(response.message?.content ?? '') as RankingJson;
      } catch {
        throw new Error('Ollama ranking JSON is invalid.');
      }

      if (!Array.isArray(parsed.rankings)) {
        throw new Error('Ollama ranking JSON is invalid.');
      }

      return parsed.rankings.flatMap((item) => {
        if (
          typeof item.id !== 'string' ||
          !allowedIds.has(item.id) ||
          typeof item.similarity !== 'number' ||
          !Number.isFinite(item.similarity) ||
          typeof item.reason !== 'string'
        ) {
          return [];
        }

        return [{
          id: item.id,
          similarity: clampSimilarity(item.similarity),
          reason: item.reason.slice(0, 300)
        }];
      });
    },

    async chat(message) {
      const response = await post<ChatResponse>('/api/chat', {
        model: chatModel,
        stream: false,
        think: false,
        options: { temperature: 0.3, num_predict: 400 },
        messages: [
          {
            role: 'system',
            content: [
              '\u4f60\u662f RailAgent\uff0c\u8ca0\u8cac\u56de\u7b54\u65c5\u5ba2\u7684\u9435\u9053\u670d\u52d9\u554f\u984c\u3002',
              '\u5fc5\u9808\u4f7f\u7528\u7e41\u9ad4\u4e2d\u6587\u3001\u7c21\u6f54\u4e14\u76f4\u63a5\u5730\u56de\u7b54\u65c5\u5ba2\u554f\u984c\u3002',
              '\u8acb\u63d0\u4f9b\u53ef\u57f7\u884c\u7684\u9435\u8def\u65c5\u904b\u5efa\u8b70\uff0c\u4e0d\u53ef\u7de8\u9020\u5373\u6642\u72c0\u614b\u6216\u5b98\u65b9\u898f\u5b9a\u3002',
              '\u82e5\u9700\u8981\u73fe\u5834\u78ba\u8a8d\uff0c\u8acb\u660e\u78ba\u5efa\u8b70\u65c5\u5ba2\u5411\u8eca\u7ad9\u4eba\u54e1\u78ba\u8a8d\u3002'
            ].join('')
          },
          { role: 'user', content: message }
        ]
      });
      const content = response.message?.content?.trim();
      if (!content) {
        throw new Error('Ollama chat response is empty.');
      }
      return content.slice(0, 2000);
    }
  };
}
