import type {
  LostFoundCandidate,
  LostFoundSearchInput,
  LostFoundSearchResponse,
  TraEmbeddingIndex,
  TraLostItemRecord,
  TraLostItemSnapshot
} from './contracts.js';
import type { OllamaClient, OllamaRerankCandidate } from './ollamaClient.js';
import { buildQueryText, rankByEmbedding, rankByRules, type LostItemStore, type ScoredRecord } from './repository.js';

const DEFAULT_EMBEDDING_MODEL = 'bge-m3';
const DEFAULT_RANKING_MODEL = 'gemma4:e4b';
const NOTICE = '以下為可能符合的候選，請聯絡保管單位並由站務人員確認。';

type RankedCandidate = ScoredRecord & { reason?: string };

export interface SearchDependencies {
  loadStore(): Promise<LostItemStore>;
  ollama: OllamaClient;
}

export function createLostFoundSearchService({ loadStore, ollama }: SearchDependencies) {
  return {
    async search(input: LostFoundSearchInput): Promise<LostFoundSearchResponse> {
      const store = await loadStore();
      const index = usableIndex(store);
      const rules = rankByRules(input, store.snapshot.records, 100);
      let ranked: RankedCandidate[] = rules.slice(0, 10);
      let aiMode: LostFoundSearchResponse['aiMode'] = 'rules';
      let fallbackReason = indexFallbackReason(store);

      if (index && rules.length > 0) {
        try {
          const [queryEmbedding] = await ollama.embed(buildQueryText(input));
          const embeddingRanked = rankByEmbedding(rules, queryEmbedding, index, 10);
          if (embeddingRanked.length > 0) {
            ranked = embeddingRanked;
            aiMode = 'embedding-only';
            fallbackReason = null;

            try {
              const modelRanking = await ollama.rerank(input, toRerankCandidates(ranked));
              const reranked = applyModelRanking(ranked, modelRanking);
              if (reranked.length > 0) {
                ranked = reranked;
                aiMode = 'ollama';
              } else {
                fallbackReason = 'Gemma returned no valid candidate IDs; using embedding-only ranking.';
              }
            } catch {
              fallbackReason = 'Gemma reranking failed; using embedding-only ranking.';
            }
          } else {
            ranked = rules.slice(0, 10);
            aiMode = 'rules';
            fallbackReason = 'Embedding index produced no usable candidates; using rules ranking.';
          }
        } catch {
          ranked = rules.slice(0, 10);
          aiMode = 'rules';
          fallbackReason = 'bge-m3 embedding failed; using rules ranking.';
        }
      }

      return toResponse(store.snapshot, ranked, aiMode, fallbackReason, index);
    }
  };
}

function usableIndex(store: LostItemStore): TraEmbeddingIndex | null {
  if (!store.index) {
    return null;
  }

  return store.index.sourceDownloadedAt === store.snapshot.metadata.downloadedAt ? store.index : null;
}

function indexFallbackReason(store: LostItemStore): string | null {
  if (!store.index) {
    return 'Embedding index is unavailable; using rules ranking.';
  }

  if (store.index.sourceDownloadedAt !== store.snapshot.metadata.downloadedAt) {
    return 'Embedding index is stale; using rules ranking.';
  }

  return null;
}

function toRerankCandidates(ranked: readonly ScoredRecord[]): OllamaRerankCandidate[] {
  return ranked.map(({ id, similarity, matchedSignals, record }) => ({
    id,
    similarity,
    matchedSignals,
    record: publicItem(record)
  }));
}

function applyModelRanking(
  ranked: readonly RankedCandidate[],
  modelRanking: Awaited<ReturnType<OllamaClient['rerank']>>
): RankedCandidate[] {
  const byId = new Map(ranked.map((candidate) => [candidate.id, candidate]));
  return modelRanking.flatMap((item) => {
    const candidate = byId.get(item.id);
    return candidate ? [{ ...candidate, similarity: item.similarity, reason: item.reason }] : [];
  });
}

function toResponse(
  snapshot: TraLostItemSnapshot,
  ranked: readonly RankedCandidate[],
  aiMode: LostFoundSearchResponse['aiMode'],
  fallbackReason: string | null,
  index: TraEmbeddingIndex | null
): LostFoundSearchResponse {
  return {
    aiMode,
    models: {
      embedding: index?.model ?? process.env.OLLAMA_EMBED_MODEL ?? DEFAULT_EMBEDDING_MODEL,
      ranking: process.env.OLLAMA_CHAT_MODEL ?? DEFAULT_RANKING_MODEL
    },
    sourceDataset: 'tra-lost-items',
    sourceUpdatedAt: snapshot.metadata.downloadedAt,
    sourceMaxPickupDate: snapshot.metadata.sourceMaxPickupDate,
    candidates: ranked.map(toCandidate),
    notice: NOTICE,
    fallbackReason
  };
}

function toCandidate(scored: RankedCandidate): LostFoundCandidate {
  return {
    id: scored.id,
    similarity: scored.similarity,
    matchedSignals: scored.matchedSignals,
    reason: scored.reason ?? 'Matched official lost-item signals: ' + scored.matchedSignals.join(', '),
    item: publicItem(scored.record)
  };
}

function publicItem(record: ScoredRecord['record']): LostFoundCandidate['item'] {
  const {
    searchableText: _searchableText,
    sourceName: _sourceName,
    sourceUrl: _sourceUrl,
    ...item
  } = record as TraLostItemRecord;

  return item;
}
