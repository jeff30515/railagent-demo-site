export interface LostFoundSearchInput {
  itemType: string;
  color: string;
  brand: string;
  features: string;
  lostDate: string;
  stationName: string;
  trainNumber: string;
}

export interface TraLostItemRecord {
  id: string;
  pickupDate: string;
  propertyName: string;
  propertyAmount?: string;
  pickupLocation: string;
  keepStationTel?: string;
  keepStationAddr?: string;
  propertyFeature?: string;
  category?: string;
  stationName?: string;
  trainNumber?: string;
  itemCode?: string;
  status?: string;
  sourceName: '?粹?箏仃?抵???';
  sourceUrl: string;
  searchableText: string;
}

export interface TraLostItemSnapshot {
  metadata: {
    sourceUrl: string;
    downloadedAt: string;
    sourceRecordCount: number;
    sourceMaxPickupDate: string | null;
  };
  records: TraLostItemRecord[];
}

export interface TraEmbeddingIndex {
  model: string;
  generatedAt: string;
  sourceDownloadedAt: string;
  dimensions: number;
  entries: Array<{ id: string; embedding: number[] }>;
}

export interface LostFoundCandidate {
  id: string;
  similarity: number;
  matchedSignals: string[];
  reason: string;
  item: Omit<TraLostItemRecord, 'searchableText' | 'sourceName' | 'sourceUrl'>;
}

export interface LostFoundSearchResponse {
  aiMode: 'ollama' | 'embedding-only' | 'rules';
  models: { embedding: string; ranking: string };
  sourceDataset: 'tra-lost-items';
  sourceUpdatedAt: string;
  sourceMaxPickupDate: string | null;
  candidates: LostFoundCandidate[];
  notice: string;
  fallbackReason: string | null;
}
