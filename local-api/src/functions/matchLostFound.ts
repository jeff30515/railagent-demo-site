import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { createOllamaClient } from '../lostFound/ollamaClient.js';
import { loadLostItemStore } from '../lostFound/repository.js';
import { createLostFoundSearchService } from '../lostFound/searchService.js';
import { InvalidLostFoundRequest, normalizeLostFoundRequest } from '../lostFound/validation.js';

const service = createLostFoundSearchService({
  loadStore: loadLostItemStore,
  ollama: createOllamaClient()
});

export async function matchLostFound(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const cors = corsHeaders(request);

  if (request.method === 'OPTIONS') {
    return { status: 204, headers: cors };
  }

  if (request.headers.get('origin') && !cors['Access-Control-Allow-Origin']) {
    return {
      status: 403,
      jsonBody: { error: 'Origin not allowed.' }
    };
  }

  try {
    const input = normalizeLostFoundRequest(await request.json());
    return {
      status: 200,
      headers: cors,
      jsonBody: await service.search(input)
    };
  } catch (error) {
    if (error instanceof InvalidLostFoundRequest || error instanceof SyntaxError) {
      return {
        status: 400,
        headers: cors,
        jsonBody: { error: error.message }
      };
    }

    return {
      status: 503,
      headers: cors,
      jsonBody: { error: 'TRA lost-item snapshot is unavailable.' }
    };
  }
}

function corsHeaders(request: HttpRequest): Record<string, string> {
  const allowed = (process.env.RAILAGENT_ALLOWED_ORIGIN ?? 'http://127.0.0.1:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const origin = request.headers.get('origin') ?? '';

  if (!origin) {
    if (process.env.NODE_ENV === 'test') {
      return { 'Access-Control-Allow-Origin': allowed[0] ?? '' };
    }
    return {};
  }

  if (!allowed.includes(origin)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin'
  };
}

app.http('matchLostFound', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'lost-found/match',
  handler: matchLostFound
});
