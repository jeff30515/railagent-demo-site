import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { LostFoundSearchInput, TraEmbeddingIndex, TraLostItemRecord, TraLostItemSnapshot } from './contracts.js';

const WEIGHTS = {
  itemType: 35,
  features: 20,
  stationName: 15,
  trainNumber: 15,
  lostDate: 10,
  color: 3,
  brand: 2
} as const;

type RankableLostItemRecord = Omit<TraLostItemRecord, 'sourceName'> & { sourceName: string };

export interface ScoredRecord {
  id: string;
  record: RankableLostItemRecord;
  score: number;
  similarity: number;
  matchedSignals: string[];
}

export interface LostItemStore {
  snapshot: TraLostItemSnapshot;
  index: TraEmbeddingIndex | null;
}

const normalize = (value = ''): string =>
  value.toLocaleLowerCase('zh-Hant').replace(/[\s()[\]{}?＿_\-:：,，.。/\\|]/g, '');

const includes = (left = '', right = ''): boolean => {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  return Boolean(normalizedLeft && normalizedRight) &&
    (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft));
};

const textFor = (record: RankableLostItemRecord): string => [
  record.propertyName,
  record.propertyFeature,
  record.pickupLocation,
  record.stationName,
  record.trainNumber,
  record.searchableText
].filter(Boolean).join(' ');

const parseTaipeiDate = (value: string): Date | null => {
  const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00+08:00`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const dot = (left: number[], right: number[]): number =>
  left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const featureTokens = (features: string): string[] =>
  features.split(/[\s,，、。;；/]+/).map((token) => token.trim()).filter(Boolean);

export function buildQueryText(input: LostFoundSearchInput): string {
  return [
    `物品名稱 ${input.itemType}`,
    `顏色 ${input.color}`,
    `品牌 ${input.brand}`,
    `特徵 ${input.features}`,
    `遺失日期 ${input.lostDate}`,
    `車站 ${input.stationName}`,
    `車次 ${input.trainNumber}`
  ].filter((part) => !part.endsWith(' ')).join('，');
}

export function rankByRules(
  input: LostFoundSearchInput,
  records: readonly RankableLostItemRecord[],
  limit = 100
): ScoredRecord[] {
  const lostDate = input.lostDate ? parseTaipeiDate(input.lostDate) : null;
  const latestPickup = lostDate ? new Date(lostDate.valueOf() + 30 * 24 * 60 * 60 * 1000) : null;

  return records.flatMap((record) => {
    const pickupDate = parseTaipeiDate(record.pickupDate);
    if (lostDate && pickupDate && (pickupDate < lostDate || (latestPickup && pickupDate > latestPickup))) {
      return [];
    }

    let rawScore = 0;
    const matchedSignals: string[] = [];
    const searchable = textFor(record);

    if (includes(record.propertyName, input.itemType) || includes(record.category, input.itemType) || includes(searchable, input.itemType)) {
      rawScore += WEIGHTS.itemType;
      matchedSignals.push('物品名稱');
    }

    if (input.features) {
      const tokens = featureTokens(input.features);
      if (tokens.length > 0 && tokens.some((token) => includes(searchable, token))) {
        rawScore += WEIGHTS.features;
        matchedSignals.push('特徵');
      }
    }

    if (includes(record.stationName, input.stationName) || includes(record.pickupLocation, input.stationName)) {
      rawScore += WEIGHTS.stationName;
      matchedSignals.push('車站');
    }

    if (includes(record.trainNumber, input.trainNumber) || includes(record.pickupLocation, input.trainNumber)) {
      rawScore += WEIGHTS.trainNumber;
      matchedSignals.push('車次');
    }

    if (lostDate && pickupDate) {
      rawScore += WEIGHTS.lostDate;
      matchedSignals.push('日期');
    }

    if (includes(searchable, input.color)) {
      rawScore += WEIGHTS.color;
      matchedSignals.push('顏色');
    }

    if (includes(searchable, input.brand)) {
      rawScore += WEIGHTS.brand;
      matchedSignals.push('品牌');
    }

    if (rawScore <= 0) {
      return [];
    }

    const score = Math.round(clamp(rawScore, 0, 100));
    return [{ id: record.id, record, score, similarity: score, matchedSignals }];
  }).sort((left, right) =>
    right.score - left.score ||
    right.matchedSignals.length - left.matchedSignals.length ||
    left.record.pickupDate.localeCompare(right.record.pickupDate)
  ).slice(0, Math.min(limit, 100));
}

export function rankByEmbedding(
  ruleCandidates: readonly ScoredRecord[],
  queryEmbedding: number[],
  index: TraEmbeddingIndex,
  limit = 10
): ScoredRecord[] {
  if (queryEmbedding.length !== index.dimensions) {
    return [];
  }

  const embeddingsById = new Map(index.entries.map((entry) => [entry.id, entry.embedding]));
  const queryMagnitude = Math.sqrt(dot(queryEmbedding, queryEmbedding));
  if (queryMagnitude === 0) {
    return [];
  }

  return ruleCandidates.flatMap((candidate) => {
    const embedding = embeddingsById.get(candidate.record.id);
    if (!embedding || embedding.length !== index.dimensions) {
      return [];
    }

    const embeddingMagnitude = Math.sqrt(dot(embedding, embedding));
    if (embeddingMagnitude === 0) {
      return [];
    }

    const cosine = dot(queryEmbedding, embedding) / (queryMagnitude * embeddingMagnitude);
    const similarity = Math.round(clamp(cosine * 0.65 + candidate.score / 100 * 0.35, 0, 1) * 100);
    return [{
      ...candidate,
      score: similarity,
      similarity
    }];
  }).sort((left, right) => right.similarity - left.similarity)
    .slice(0, Math.min(limit, 10));
}

export async function loadLostItemStore(paths = {
  snapshot: process.env.TRA_LOST_ITEMS_DATA_PATH ?? path.resolve(process.cwd(), 'data/tra-lost-items.json'),
  index: process.env.TRA_LOST_ITEMS_INDEX_PATH ?? path.resolve(process.cwd(), 'data/tra-lost-items.index.json')
}): Promise<LostItemStore> {
  const snapshot = await readJsonFile<TraLostItemSnapshot>(paths.snapshot);
  let index: TraEmbeddingIndex | null = null;

  try {
    index = await readJsonFile<TraEmbeddingIndex>(paths.index);
    if (index.sourceDownloadedAt !== snapshot.metadata.downloadedAt) {
      index = null;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  return { snapshot, index };
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const contents = await readFile(filePath, 'utf8');
  return JSON.parse(contents.replace(/^\uFEFF/, '')) as T;
}
