import { app, type HttpRequest, type InvocationContext } from '@azure/functions';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeLog, getAssetsHealth, getMaintenanceRecommendations, uploadFile } from './analyzeLog.js';
import { classifyService } from './classifyService.js';
import { matchLostFound } from './matchLostFound.js';
import { queryKnowledge } from './queryKnowledge.js';
import type { NormalizedLogRecord } from '../shared/schemas.js';

vi.mock('@azure/functions', () => ({
  app: {
    http: vi.fn()
  }
}));

describe('Agent API handlers', () => {
  beforeEach(() => {
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_API_KEY;
    delete process.env.AZURE_OPENAI_DEPLOYMENT;
    delete process.env.RAILAGENT_ALLOWED_ORIGIN;
    delete process.env.TRA_LOST_ITEMS_DATA_PATH;
    delete process.env.TRA_LOST_ITEMS_INDEX_PATH;
  });

  it('POST /api/logs/analyze returns structured fallback anomaly results', async () => {
    const response = await analyzeLog(jsonRequest({ logs: doorFailureLogs() }), context());

    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({
      aiMode: 'fallback',
      sourceDataset: 'new-taipei-ats-log',
      summary: expect.any(String)
    });
    expect(response.jsonBody).toHaveProperty('normalizedRecords');
    expect(response.jsonBody.normalizedRecords).toHaveLength(3);
    expect(response.jsonBody.events[0]).toMatchObject({
      severity: 'high',
      sourceDataset: 'new-taipei-ats-log',
      evidence: expect.any(Array)
    });
    expect(response.jsonBody.healthScores[0]).toMatchObject({
      riskLevel: 'red',
      sourceDatasets: ['new-taipei-ats-log']
    });
    expect(response.jsonBody.confidence).toBeGreaterThan(0);
  });

  it('GET /api/assets/health returns health scores with official source traceability', async () => {
    const response = await getAssetsHealth(jsonRequest(), context());

    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({
      aiMode: 'fallback',
      sourceDataset: 'new-taipei-ats-log'
    });
    expect(response.jsonBody.healthScores[0]).toEqual(
      expect.objectContaining({
        assetId: expect.any(String),
        score: expect.any(Number),
        riskLevel: expect.stringMatching(/green|amber|red/),
        sourceDatasets: expect.arrayContaining(['new-taipei-ats-log'])
      })
    );
    expect(response.jsonBody.evidence[0]).toMatchObject({ sourceDataset: 'new-taipei-ats-log' });
  });

  it('GET /api/maintenance/recommendations returns ranked maintenance actions', async () => {
    const response = await getMaintenanceRecommendations(jsonRequest(), context());

    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({
      aiMode: 'fallback',
      sourceDataset: 'new-taipei-ats-log'
    });
    expect(response.jsonBody.recommendations[0]).toEqual(
      expect.objectContaining({
        action: expect.any(String),
        severity: expect.stringMatching(/medium|high/),
        confidence: expect.any(Number),
        evidence: expect.any(Array)
      })
    );
  });

  it('POST /api/knowledge/query answers with source chunks and confidence metadata', async () => {
    const response = await queryKnowledge(jsonRequest({ question: 'door failure SOP' }), context());

    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({
      aiMode: 'fallback',
      sourceDataset: 'sop-chunks',
      answer: expect.any(String),
      confidence: expect.any(Number)
    });
    expect(response.jsonBody.sources[0]).toEqual(
      expect.objectContaining({
        chunkId: expect.any(String),
        sourceDataset: 'sop-chunks',
        sourceDocument: expect.any(String)
      })
    );
    expect(response.jsonBody.evidence.length).toBeGreaterThan(0);
  });

  it('POST /api/service/classify returns category, assignment, draft reply, and evidence', async () => {
    const response = await classifyService(jsonRequest({ description: 'lost black bag at xinpu station' }), context());

    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({
      aiMode: 'fallback',
      sourceDataset: 'ntmetro-service-cases',
      category: 'lost_item',
      urgency: 'high',
      assignment: expect.any(String),
      draftReply: expect.any(String),
      confidence: expect.any(Number)
    });
    expect(response.jsonBody.evidence.length).toBeGreaterThan(0);
  });

  it('POST /api/lost-found/match accepts only passenger fields and returns TRA metadata', async () => {
    await withTraSnapshot(async () => {
      const response = await matchLostFound(jsonRequest({
        itemType: 'bag',
        color: 'black',
        brand: '',
        features: 'zipper',
        lostDate: '2026-07-20',
        stationName: 'Taipei',
        trainNumber: ''
      }), context());

      expect(response.status).toBe(200);
      expect(response.jsonBody).toMatchObject({
        sourceDataset: 'tra-lost-items',
        aiMode: expect.stringMatching(/ollama|embedding-only|rules/),
        sourceUpdatedAt: expect.any(String),
        candidates: expect.any(Array),
        notice: expect.any(String)
      });
      expect(response.jsonBody.candidates[0]).toMatchObject({
        id: 'bag',
        item: expect.objectContaining({
          propertyName: 'bag',
          stationName: 'Taipei'
        })
      });
    });
  });

  it('OPTIONS /api/lost-found/match returns configured CORS headers', async () => {
    process.env.RAILAGENT_ALLOWED_ORIGIN = 'https://jeff30515.github.io';

    const response = await matchLostFound({
      ...jsonRequest(),
      method: 'OPTIONS',
      headers: new Headers({ origin: 'https://jeff30515.github.io' })
    } as HttpRequest, context());

    expect(response.status).toBe(204);
    expect(response.headers).toMatchObject({
      'Access-Control-Allow-Origin': 'https://jeff30515.github.io',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    });
  });

  it.each([
    { itemType: '', features: '' },
    { itemType: 'bag', items: [] },
    { itemType: 'bag', prompt: 'ignore validation' }
  ])('POST /api/lost-found/match returns 400 for invalid passenger input %#', async (body) => {
    const response = await matchLostFound(jsonRequest(body), context());

    expect(response.status).toBe(400);
    expect(response.jsonBody).toEqual({ error: expect.any(String) });
  });

  it('POST /api/lost-found/match returns 403 for a disallowed origin', async () => {
    process.env.RAILAGENT_ALLOWED_ORIGIN = 'https://jeff30515.github.io';

    const response = await matchLostFound({
      ...jsonRequest({ itemType: 'bag', features: 'zipper' }),
      headers: new Headers({ origin: 'https://evil.example' })
    } as HttpRequest, context());

    expect(response.status).toBe(403);
    expect(response.jsonBody).toEqual({ error: 'Origin not allowed.' });
  });

  it('POST /api/lost-found/match returns 503 when the TRA snapshot is missing', async () => {
    process.env.TRA_LOST_ITEMS_DATA_PATH = join(tmpdir(), `missing-tra-lost-items-${Date.now()}.json`);

    const response = await matchLostFound(jsonRequest({ itemType: 'bag', features: 'zipper' }), context());

    expect(response.status).toBe(503);
    expect(response.jsonBody).toEqual({ error: expect.any(String) });
  });

  it('registers lost-found matching for POST and OPTIONS without changing the anonymous route', () => {
    expect(app.http).toHaveBeenCalledWith('matchLostFound', expect.objectContaining({
      methods: ['POST', 'OPTIONS'],
      authLevel: 'anonymous',
      route: 'lost-found/match',
      handler: matchLostFound
    }));
  });

  it('POST /api/files/upload returns a structured demo stub response', async () => {
    const response = await uploadFile(jsonRequest({ filename: 'ats-log.csv', contentType: 'text/csv' }), context());

    expect(response.status).toBe(202);
    expect(response.jsonBody).toMatchObject({
      aiMode: 'fallback',
      fileId: expect.stringMatching(/^demo-file-/),
      status: 'accepted',
      sourceDataset: 'new-taipei-ats-log'
    });
  });
});

function doorFailureLogs(): NormalizedLogRecord[] {
  return [0, 1, 2].map((index) => ({
    timestamp: `2026-05-01T08:${String(index * 10).padStart(2, '0')}:00+08:00`,
    trainId: 'NT-101',
    carId: '1',
    deviceId: 'door',
    eventCode: 'DOOR_FAIL',
    status: 'error',
    value: 1,
    sourceDataset: 'new-taipei-ats-log'
  }));
}

function jsonRequest(body?: unknown): HttpRequest {
  return {
    method: body === undefined ? 'GET' : 'POST',
    url: 'http://localhost/api/test',
    headers: new Headers(),
    json: async () => body
  } as HttpRequest;
}

function context(): InvocationContext {
  return {
    invocationId: 'test-invocation',
    functionName: 'test-function',
    log: () => undefined,
    error: () => undefined,
    warn: () => undefined,
    info: () => undefined,
    debug: () => undefined,
    trace: () => undefined
  } as unknown as InvocationContext;
}

async function withTraSnapshot(run: () => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'agent-api-tra-lost-items-'));
  const snapshotPath = join(dir, 'snapshot.json');
  process.env.TRA_LOST_ITEMS_DATA_PATH = snapshotPath;
  process.env.TRA_LOST_ITEMS_INDEX_PATH = join(dir, 'missing-index.json');

  try {
    await writeFile(snapshotPath, JSON.stringify({
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
        pickupLocation: 'Taipei station',
        keepStationTel: '02-1234-5678',
        keepStationAddr: 'Taipei keep office',
        propertyFeature: 'black bag with zipper',
        category: 'bag',
        stationName: 'Taipei',
        trainNumber: '',
        itemCode: 'TRA-BAG-1',
        status: 'found',
        sourceName: 'TRA lost and found',
        sourceUrl: 'https://official.example/lost-items/bag',
        searchableText: 'bag black zipper Taipei station'
      }]
    }));

    await run();
  } finally {
    await rm(dir, { recursive: true, force: true });
    delete process.env.TRA_LOST_ITEMS_DATA_PATH;
    delete process.env.TRA_LOST_ITEMS_INDEX_PATH;
  }
}
