export type DataMode = 'sample' | 'live';
export type OfficialPriority = 'first' | 'supporting';
export type Severity = 'low' | 'medium' | 'high';
export type RiskLevel = 'green' | 'amber' | 'red';
export type ServiceUrgency = 'low' | 'medium' | 'high';
export type AiMode = 'azure-openai' | 'fallback';

export type SourceDatasetId =
  | 'new-taipei-ats-log'
  | 'tymetro-train-telemetry'
  | 'ntmetro-lost-items'
  | 'ntmetro-service-cases'
  | 'sop-chunks';

export interface SourceMetadata {
  mode: DataMode;
  sourceDataset: SourceDatasetId;
  sourceName: string;
  officialPriority: OfficialPriority;
  officialReferenceUrl: string;
  licenseNote: string;
  retrievedAt?: string;
  sampleGeneratedAt?: string;
  sampleNotice: string;
}

export interface DataGuideFieldMapping {
  sourceField: string;
  normalizedField: string;
  description: string;
}

export interface DataSourceMapping extends SourceMetadata {
  datasetId: SourceDatasetId;
  owner: string;
  officialCategory: string;
  fields: DataGuideFieldMapping[];
  agentUses: string[];
  sampleFile: string;
  liveIntegrationStatus: 'not-connected' | 'planned' | 'connected';
  replacementGuidance: string;
}

export interface NormalizedLogRecord {
  timestamp: string;
  trainId: string;
  carId?: string;
  deviceId: string;
  eventCode: string;
  status: 'ok' | 'warning' | 'error';
  value?: number;
  unit?: string;
  lineId?: string;
  station?: string;
  rawMessage?: string;
  sourceDataset: Extract<SourceDatasetId, 'new-taipei-ats-log' | 'tymetro-train-telemetry'>;
}

export interface AnomalyEvidence {
  timestamp: string;
  trainId: string;
  carId?: string;
  deviceId: string;
  value?: number;
  unit?: string;
  sourceDataset: NormalizedLogRecord['sourceDataset'];
}

export interface AnomalyEvent {
  eventId: string;
  eventCode: string;
  severity: Severity;
  title: string;
  description: string;
  assetId: string;
  sourceDataset: NormalizedLogRecord['sourceDataset'];
  evidence: AnomalyEvidence[];
  recommendedAction: string;
}

export interface AssetHealthScore {
  assetId: string;
  trainId: string;
  carId?: string;
  deviceId: string;
  score: number;
  riskLevel: RiskLevel;
  reasonCodes: string[];
  sourceDatasets: NormalizedLogRecord['sourceDataset'][];
}

export interface AnalyzeLogsResult {
  aiMode: AiMode;
  summary: string;
  events: AnomalyEvent[];
  healthScores: AssetHealthScore[];
  recommendedActions: string[];
}

export interface SopChunk {
  chunkId: string;
  title: string;
  body: string;
  tags: string[];
  sourceDocument: string;
  sourceDataset: Extract<SourceDatasetId, 'sop-chunks'>;
  embeddingId?: string;
  metadata: SourceMetadata;
}

export interface ServiceCaseRecord {
  caseId: string;
  openedAt: string;
  station?: string;
  channel: 'phone' | 'web' | 'counter' | 'app';
  description: string;
  category?: ServiceCaseCategory;
  status: 'open' | 'in_progress' | 'closed';
  sourceDataset: Extract<SourceDatasetId, 'ntmetro-service-cases'>;
}

export type ServiceCaseCategory =
  | 'lost_item'
  | 'facility'
  | 'fare'
  | 'safety'
  | 'service_feedback'
  | 'general';

export interface ExtractedLostItem {
  itemType?: string;
  color?: string;
  station?: string;
  keywords: string[];
}

export interface ClassifiedServiceCase {
  aiMode: AiMode;
  category: ServiceCaseCategory;
  urgency: ServiceUrgency;
  assignment: string;
  draftReply: string;
  extractedItem?: ExtractedLostItem;
  sourceDataset: Extract<SourceDatasetId, 'ntmetro-service-cases'>;
  evidence: string[];
}

export interface LostItemRecord {
  itemId: string;
  foundTime: string;
  station: string;
  itemType: string;
  color?: string;
  description: string;
  status: 'found' | 'claimed' | 'archived';
  sourceDataset: Extract<SourceDatasetId, 'ntmetro-lost-items'>;
}

export interface LostItemMatch extends LostItemRecord {
  similarity: number;
  matchedSignals: string[];
}
