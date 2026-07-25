import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { dataGuideSourcesById } from '../shared/dataGuideMapping.js';
import { analyzeLogs } from '../shared/fallbackRules.js';
import { generateAgentJson } from '../shared/openaiClient.js';
import type { AnomalyEvent, NormalizedLogRecord, SourceDatasetId } from '../shared/schemas.js';

interface AnalyzeLogResponse {
  aiMode: 'azure-openai' | 'fallback';
  sourceDataset: SourceDatasetId;
  summary: string;
  normalizedRecords: NormalizedLogRecord[];
  events: ReturnType<typeof analyzeLogs>['events'];
  healthScores: ReturnType<typeof analyzeLogs>['healthScores'];
  recommendedActions: string[];
  evidence: ReturnType<typeof analyzeLogs>['events'][number]['evidence'];
  confidence: number;
  sources: Array<{ sourceDataset: SourceDatasetId; sourceName: string; sampleNotice: string }>;
}

interface MaintenanceRecommendation {
  assetId: string;
  action: string;
  severity: AnomalyEvent['severity'];
  confidence: number;
  evidence: AnomalyEvent['evidence'];
  sourceDataset: SourceDatasetId;
}

export async function analyzeLog(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const body = await readJson<{ logs?: NormalizedLogRecord[] }>(request);
  const normalizedRecords = body.logs?.length ? body.logs : defaultLogs();
  const fallback = buildAnalyzeResponse(normalizedRecords, 'fallback');
  const aiResponse = await generateAgentJson<AnalyzeLogResponse>({
    system:
      'Return only JSON for a railway log analysis API response. Preserve structured fields and sourceDataset traceability. User-facing summary, title, description, recommendedAction, and evidence text must use Traditional Chinese.',
    user: JSON.stringify({ logs: normalizedRecords, fallback }),
    temperature: 0
  });

  return ok(aiResponse ? { ...fallback, ...aiResponse, aiMode: 'azure-openai' } : fallback);
}

export async function getAssetsHealth(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const analysis = buildAnalyzeResponse(defaultLogs(), 'fallback');
  return ok({
    aiMode: analysis.aiMode,
    sourceDataset: analysis.sourceDataset,
    healthScores: analysis.healthScores,
    evidence: analysis.evidence,
    sources: analysis.sources,
    confidence: analysis.confidence
  });
}

export async function getMaintenanceRecommendations(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const analysis = buildAnalyzeResponse(defaultLogs(), 'fallback');
  const recommendations: MaintenanceRecommendation[] = analysis.events.map((event) => ({
    assetId: event.assetId,
    action: event.recommendedAction,
    severity: event.severity,
    confidence: event.severity === 'high' ? 0.9 : 0.76,
    evidence: event.evidence,
    sourceDataset: event.sourceDataset
  }));

  return ok({
    aiMode: analysis.aiMode,
    sourceDataset: analysis.sourceDataset,
    recommendations,
    evidence: analysis.evidence,
    sources: analysis.sources,
    confidence: analysis.confidence
  });
}

export async function uploadFile(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const body = await readJson<{ filename?: string; sourceDataset?: SourceDatasetId }>(request);
  const sourceDataset = body.sourceDataset ?? inferSourceDataset(body.filename);

  return {
    status: 202,
    jsonBody: {
      aiMode: 'fallback',
      fileId: `demo-file-${hashText(body.filename ?? 'upload')}`,
      status: 'accepted',
      sourceDataset,
      evidence: [`已將 ${body.filename ?? '未命名檔案'} 加入示範匯入佇列。`],
      confidence: 0.72
    }
  };
}

function buildAnalyzeResponse(
  normalizedRecords: NormalizedLogRecord[],
  aiMode: AnalyzeLogResponse['aiMode']
): AnalyzeLogResponse {
  const result = analyzeLogs(normalizedRecords);
  const sourceDataset = normalizedRecords[0]?.sourceDataset ?? 'new-taipei-ats-log';
  const source = dataGuideSourcesById[sourceDataset];

  return {
    aiMode,
    sourceDataset,
    summary: result.summary,
    normalizedRecords,
    events: result.events,
    healthScores: result.healthScores,
    recommendedActions: result.recommendedActions,
    evidence: result.events.flatMap((event) => event.evidence),
    confidence: result.events.some((event) => event.severity === 'high') ? 0.88 : 0.7,
    sources: [
      {
        sourceDataset,
        sourceName: source.sourceName,
        sampleNotice: source.sampleNotice
      }
    ]
  };
}

function defaultLogs(): NormalizedLogRecord[] {
  return [
    makeLog('2026-05-01T08:00:00+08:00', 'DOOR_FAIL', 'error', 1),
    makeLog('2026-05-01T08:10:00+08:00', 'DOOR_FAIL', 'error', 1),
    makeLog('2026-05-01T08:20:00+08:00', 'DOOR_FAIL', 'error', 1),
    makeLog('2026-05-01T10:00:00+08:00', 'HVAC_TEMP', 'warning', 30, 'hvac', 'tymetro-train-telemetry')
  ];
}

function makeLog(
  timestamp: string,
  eventCode: string,
  status: NormalizedLogRecord['status'],
  value: number,
  deviceId = 'door',
  sourceDataset: NormalizedLogRecord['sourceDataset'] = 'new-taipei-ats-log'
): NormalizedLogRecord {
  return {
    timestamp,
    trainId: sourceDataset === 'new-taipei-ats-log' ? 'NT-101' : 'TY-380',
    carId: sourceDataset === 'new-taipei-ats-log' ? '1' : '3',
    deviceId,
    eventCode,
    status,
    value,
    unit: eventCode === 'HVAC_TEMP' ? 'celsius' : 'count',
    sourceDataset
  };
}

async function readJson<T>(request: HttpRequest): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

function inferSourceDataset(filename?: string): SourceDatasetId {
  const normalized = filename?.toLowerCase() ?? '';
  if (normalized.includes('lost')) return 'ntmetro-lost-items';
  if (normalized.includes('service')) return 'ntmetro-service-cases';
  if (normalized.includes('sop')) return 'sop-chunks';
  if (normalized.includes('telemetry')) return 'tymetro-train-telemetry';
  return 'new-taipei-ats-log';
}

function hashText(value: string): string {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function ok(jsonBody: unknown): HttpResponseInit {
  return { status: 200, jsonBody };
}

app.http('analyzeLog', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'logs/analyze',
  handler: analyzeLog
});

app.http('getAssetsHealth', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'assets/health',
  handler: getAssetsHealth
});

app.http('getMaintenanceRecommendations', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'maintenance/recommendations',
  handler: getMaintenanceRecommendations
});

app.http('uploadFile', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'files/upload',
  handler: uploadFile
});
