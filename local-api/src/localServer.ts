import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOllamaClient } from './lostFound/ollamaClient.js';
import { loadLostItemStore } from './lostFound/repository.js';
import { createLostFoundSearchService } from './lostFound/searchService.js';
import { InvalidLostFoundRequest, normalizeLostFoundRequest } from './lostFound/validation.js';
import { createFriendlyTransferService } from './friendlyTransfer/service.js';

loadLocalSettings();

const service = createLostFoundSearchService({
  loadStore: loadLostItemStore,
  ollama: createOllamaClient()
});
const friendlyTransfer = createFriendlyTransferService({ chat: (message) => createOllamaClient().chat(message) });
const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_CHAT_MESSAGE_LENGTH = 2000;
const MAX_FRIENDLY_TRANSFER_INPUT_LENGTH = 200;

class RequestBodyTooLarge extends Error {}

function loadLocalSettings() {
  const settingsPath = path.resolve(process.cwd(), 'local.settings.json');
  if (!existsSync(settingsPath)) {
    return;
  }

  const settings = JSON.parse(readFileSync(settingsPath, 'utf8').replace(/^\uFEFF/, '')) as { Values?: Record<string, string> };
  for (const [name, value] of Object.entries(settings.Values ?? {})) {
    if (process.env[name] === undefined) {
      process.env[name] = value;
    }
  }
}

export function createLocalLostFoundServer() {
  return createServer(async (request, response) => {
    const route = request.url?.split('?')[0];
    if (
      route !== '/api/lost-found/match' &&
      route !== '/api/passenger-chat' &&
      route !== '/api/friendly-transfer/station' &&
      route !== '/api/friendly-transfer/route'
    ) {
      respond(response, 404, { error: 'Not found.' });
      return;
    }

    const cors = corsHeaders(request.headers.origin);
    if (request.method === 'OPTIONS') {
      response.writeHead(204, cors);
      response.end();
      return;
    }

    if (request.method !== 'POST') {
      respond(response, 405, { error: 'Method not allowed.' }, cors);
      return;
    }

    if (Number(request.headers['content-length'] ?? 0) > MAX_REQUEST_BYTES) {
      respond(response, 413, { error: 'Request body is too large.' }, cors);
      return;
    }

    if (request.headers.origin && !cors['Access-Control-Allow-Origin']) {
      respond(response, 403, { error: 'Origin not allowed.' });
      return;
    }

    try {
      if (route === '/api/friendly-transfer/station') {
        const spokenStation = textField(await readJson(request), 'spokenStation');
        if (!spokenStation) {
          respond(response, 400, { error: 'Station is required.' }, cors);
          return;
        }
        try {
          respond(response, 200, friendlyTransfer.findStation(spokenStation), cors);
        } catch (error) {
          if (error instanceof Error && error.message === 'Station could not be resolved.') {
            respond(response, 404, { error: error.message }, cors);
            return;
          }
          throw error;
        }
        return;
      }

      if (route === '/api/friendly-transfer/route') {
        const body = await readJson(request);
        const origin = textField(body, 'origin');
        const destination = textField(body, 'destination');
        if (!origin || !destination) {
          respond(response, 400, { error: 'Origin and destination are required.' }, cors);
          return;
        }
        respond(response, 200, {
          answer: await friendlyTransfer.route(origin, destination),
          model: process.env.OLLAMA_CHAT_MODEL ?? 'gemma4:e4b'
        }, cors);
        return;
      }

      if (route === '/api/passenger-chat') {
        const body = await readJson(request);
        const message = typeof (body as { message?: unknown }).message === 'string'
          ? (body as { message: string }).message.trim()
          : '';
        if (!message) {
          respond(response, 400, { error: 'Message is required.' }, cors);
          return;
        }
        if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
          respond(response, 400, { error: `Message must be ${MAX_CHAT_MESSAGE_LENGTH} characters or fewer.` }, cors);
          return;
        }
        respond(response, 200, { answer: await createOllamaClient().chat(message), model: process.env.OLLAMA_CHAT_MODEL ?? 'gemma4:e4b' }, cors);
        return;
      }

      const input = normalizeLostFoundRequest(await readJson(request));
      respond(response, 200, await service.search(input), cors);
    } catch (error) {
      if (error instanceof InvalidLostFoundRequest || error instanceof SyntaxError) {
        respond(response, 400, { error: error.message }, cors);
        return;
      }

      if (error instanceof RequestBodyTooLarge) {
        respond(response, 413, { error: 'Request body is too large.' }, cors);
        return;
      }

      respond(response, 503, {
        error: route === '/api/passenger-chat' || route === '/api/friendly-transfer/route'
          ? 'Local Ollama chat is unavailable.'
          : 'TRA lost-item snapshot is unavailable.'
      }, cors);
    }
  });
}

function textField(body: unknown, field: string): string {
  if (!body || typeof body !== 'object') return '';
  const value = (body as Record<string, unknown>)[field];
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MAX_FRIENDLY_TRANSFER_INPUT_LENGTH);
}

function corsHeaders(origin: string | undefined): Record<string, string> {
  if (!origin) {
    return {};
  }

  const allowed = (process.env.RAILAGENT_ALLOWED_ORIGIN ?? 'http://127.0.0.1:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
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

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_REQUEST_BYTES) {
      throw new RequestBodyTooLarge();
    }
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function respond(response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  response.end(JSON.stringify(body));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 7071);
  createLocalLostFoundServer().listen(port, '127.0.0.1', () => {
    console.log(`RailAgent local lost-item API listening on http://127.0.0.1:${port}`);
  });
}
