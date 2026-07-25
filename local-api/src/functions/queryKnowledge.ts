import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { dataGuideSourcesById } from '../shared/dataGuideMapping.js';
import { generateAgentJson } from '../shared/openaiClient.js';
import type { SopChunk } from '../shared/schemas.js';

interface KnowledgeResponse {
  aiMode: 'azure-openai' | 'fallback';
  sourceDataset: 'sop-chunks';
  answer: string;
  sources: Array<Pick<SopChunk, 'chunkId' | 'title' | 'sourceDocument' | 'sourceDataset' | 'embeddingId'>>;
  evidence: string[];
  confidence: number;
}

export async function queryKnowledge(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const body = await readJson<{ question?: string }>(request);
  const question = body.question ?? '';
  const fallback = buildKnowledgeFallback(question);
  const aiResponse = await generateAgentJson<KnowledgeResponse>({
    system:
      'Return only JSON for a railway knowledge API. Answers must cite SOP chunks and include confidence. User-facing answer and evidence text must use Traditional Chinese.',
    user: JSON.stringify({ question, chunks: sopChunks(), fallback }),
    temperature: 0
  });

  return {
    status: 200,
    jsonBody: aiResponse ? { ...fallback, ...aiResponse, aiMode: 'azure-openai' } : fallback
  };
}

function buildKnowledgeFallback(question: string): KnowledgeResponse {
  const terms = tokenize(question);
  const ranked = sopChunks()
    .map((chunk) => ({
      chunk,
      score: terms.filter((term) => `${chunk.title} ${chunk.body} ${chunk.tags.join(' ')}`.toLowerCase().includes(term)).length
    }))
    .sort((left, right) => right.score - left.score);
  const selected = ranked[0]?.score ? ranked.slice(0, 2).map((entry) => entry.chunk) : [sopChunks()[0]];

  return {
    aiMode: 'fallback',
    sourceDataset: 'sop-chunks',
    answer: selected
      .map((chunk) => `${chunk.title}: ${chunk.body}`)
      .join(' '),
    sources: selected.map((chunk) => ({
      chunkId: chunk.chunkId,
      title: chunk.title,
      sourceDocument: chunk.sourceDocument,
      sourceDataset: chunk.sourceDataset,
      embeddingId: chunk.embeddingId
    })),
    evidence: selected.map((chunk) => `${chunk.chunkId} 符合查詢條件，來源文件為 ${chunk.sourceDocument}。`),
    confidence: ranked[0]?.score ? Math.min(0.92, 0.62 + ranked[0].score * 0.1) : 0.55
  };
}

function sopChunks(): SopChunk[] {
  const metadata = dataGuideSourcesById['sop-chunks'];
  return [
    {
      chunkId: 'SOP-DOOR-001',
      title: '車門故障處置',
      body: '當列車反覆發生車門故障時，站務與維修人員應先確保旅客動線安全，檢查防夾感測器，並確認控制器重置紀錄後才能恢復載客服務。',
      tags: ['door', 'maintenance', 'high-risk'],
      sourceDocument: 'RailAgent 示範 SOP',
      sourceDataset: 'sop-chunks',
      embeddingId: 'demo-sop-door-001',
      metadata
    },
    {
      chunkId: 'SOP-LOST-001',
      title: '遺失物確認',
      body: '遺失物比對高於服務門檻時，必須先由人員確認，才能揭露物品細節或安排領取。',
      tags: ['lost-found', 'service', 'human-confirmation'],
      sourceDocument: 'RailAgent 示範 SOP',
      sourceDataset: 'sop-chunks',
      embeddingId: 'demo-sop-lost-001',
      metadata
    }
  ];
}

function tokenize(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9-]+/).filter((term) => term.length > 2);
}

async function readJson<T>(request: HttpRequest): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

app.http('queryKnowledge', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'knowledge/query',
  handler: queryKnowledge
});
