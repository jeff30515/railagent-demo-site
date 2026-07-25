import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { classifyServiceCase } from '../shared/fallbackRules.js';
import { generateAgentJson } from '../shared/openaiClient.js';
import type { ClassifiedServiceCase } from '../shared/schemas.js';

interface ClassifyServiceResponse extends ClassifiedServiceCase {
  confidence: number;
  sources: Array<{ sourceDataset: 'ntmetro-service-cases'; sourceName: string }>;
}

export async function classifyService(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const body = await readJson<{ description?: string }>(request);
  const description = body.description ?? '';
  const fallback = buildClassifyFallback(description);
  const aiResponse = await generateAgentJson<ClassifyServiceResponse>({
    system:
      'Return only JSON for a railway customer service classifier. Include category, urgency, assignment, draftReply, evidence, confidence, and sourceDataset. User-facing assignment, draftReply, and evidence text must use Traditional Chinese.',
    user: JSON.stringify({ description, fallback }),
    temperature: 0
  });

  return {
    status: 200,
    jsonBody: aiResponse ? { ...fallback, ...aiResponse, aiMode: 'azure-openai' } : fallback
  };
}

export function buildClassifyFallback(description: string): ClassifyServiceResponse {
  const result = classifyServiceCase(description);
  return {
    ...result,
    confidence: result.category === 'lost_item' ? 0.86 : 0.62,
    sources: [{ sourceDataset: 'ntmetro-service-cases', sourceName: '新北捷運客服案件統計' }]
  };
}

async function readJson<T>(request: HttpRequest): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

app.http('classifyService', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'service/classify',
  handler: classifyService
});
