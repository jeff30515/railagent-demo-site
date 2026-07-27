import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOllamaClient } from './lostFound/ollamaClient.js';
import { loadLostItemStore } from './lostFound/repository.js';
import { createLostFoundSearchService } from './lostFound/searchService.js';
import { InvalidLostFoundRequest, normalizeLostFoundRequest } from './lostFound/validation.js';
import { createFallbackTaskRepository } from './shared/mobileTaskRepository.js';
import { createFriendlyTransferService } from './friendlyTransfer/service.js';
import {
  retrieveTransportKnowledge,
  type TransportKnowledgeResult
} from './transportKnowledge/retriever.js';

loadLocalSettings();

const service = createLostFoundSearchService({
  loadStore: loadLostItemStore,
  ollama: createOllamaClient()
});
const friendlyTransfer = createFriendlyTransferService({ chat: (message) => createOllamaClient().chat(message) });
const mobileTasks = createFallbackTaskRepository();
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
    const parsedUrl = new URL(request.url ?? '/', 'http://localhost');
    const route = parsedUrl.pathname;
    if (
      route !== '/api/lost-found/match' &&
      route !== '/api/passenger-chat' &&
      route !== '/api/friendly-transfer/station' &&
      route !== '/api/friendly-transfer/route' &&
      route !== '/api/lost-found/cases/track' &&
      route !== '/api/lost-found/cases/untrack' &&
      route !== '/api/lost-found/items' &&
      route !== '/api/auth/demo-login' &&
      route !== '/api/tasks'
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

    const isFoundItemList = route === '/api/lost-found/items' && request.method === 'GET';
    const isTaskList = route === '/api/tasks' && request.method === 'GET';
    if (request.method !== 'POST' && !isFoundItemList && !isTaskList) {
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
      if (route === '/api/auth/demo-login') {
        const accountId = textField(await readJson(request), 'accountId');
        const user = accountId ? await mobileTasks.getDemoUserByAccount(accountId) : null;
        if (!user) {
          respond(response, 401, { error: 'invalid_demo_account' }, cors);
          return;
        }
        respond(response, 200, { user, demoToken: user.userId }, cors);
        return;
      }

      if (isTaskList) {
        const userId = request.headers['x-demo-user-id'];
        const user = typeof userId === 'string' ? await mobileTasks.getDemoUserById(userId) : null;
        if (!user) {
          respond(response, 401, { error: 'missing_demo_user' }, cors);
          return;
        }
        const tasks = await mobileTasks.listTasksForUser(user);
        const counts = tasks.reduce<Record<string, number>>((all, task) => {
          all[task.status] = (all[task.status] ?? 0) + 1;
          return all;
        }, {});
        respond(response, 200, { user, tasks, counts }, cors);
        return;
      }

      if (route === '/api/lost-found/items') {
        const userId = request.headers['x-demo-user-id'];
        const user = typeof userId === 'string' ? await mobileTasks.getDemoUserById(userId) : null;
        if (!user) {
          respond(response, 401, { error: 'missing_demo_user' }, cors);
          return;
        }
        if (user.role === 'public') {
          respond(response, 403, { error: 'staff_access_required' }, cors);
          return;
        }
        const unitId = parsedUrl.searchParams.get('unitId')?.trim() || undefined;
        if (unitId && !user.allowedUnitIds.includes(unitId)) {
          respond(response, 403, { error: 'unit_access_denied' }, cors);
          return;
        }
        if (isFoundItemList) {
          respond(response, 200, { items: await mobileTasks.listFoundItems(user, unitId) }, cors);
          return;
        }
        const body = await readJson(request) as Record<string, unknown>;
        const itemType = textField(body, 'itemType');
        const foundLocation = textField(body, 'foundLocation');
        const foundAt = textField(body, 'foundAt');
        const stationName = textField(body, 'stationName');
        if (!itemType || !foundLocation || !foundAt || !stationName) {
          respond(response, 400, { error: 'invalid_found_item_payload' }, cors);
          return;
        }
        const item = await mobileTasks.createFoundItem(user, {
          itemType, foundLocation, foundAt, stationName,
          color: textField(body, 'color'), brand: textField(body, 'brand'),
          features: textField(body, 'features'), trainNumber: textField(body, 'trainNumber')
        });
        respond(response, 201, { item }, cors);
        return;
      }

      if (route === '/api/lost-found/cases/track') {
        const body = await readJson(request) as Record<string, unknown>;
        const candidateId = textField(body, 'candidateId');
        const title = textField(body, 'title');
        const stationName = textField(body, 'stationName');
        const pickupDate = textField(body, 'pickupDate');
        if (!candidateId || !title || !stationName || !pickupDate) {
          respond(response, 400, { error: 'invalid_lost_found_case_payload' }, cors);
          return;
        }
        const passenger = await mobileTasks.getDemoUserByAccount('ntmetro-public');
        if (!passenger) throw new Error('Local passenger account is unavailable.');
        const task = await mobileTasks.trackLostItemCase(passenger, { candidateId, title, stationName, pickupDate });
        respond(response, 201, { task }, cors);
        return;
      }

      if (route === '/api/lost-found/cases/untrack') {
        const candidateId = textField(await readJson(request), 'candidateId');
        if (!candidateId) {
          respond(response, 400, { error: 'invalid_lost_found_case_payload' }, cors);
          return;
        }
        const passenger = await mobileTasks.getDemoUserByAccount('ntmetro-public');
        if (!passenger) throw new Error('Local passenger account is unavailable.');
        const removed = await mobileTasks.untrackLostItemCase(passenger, candidateId);
        respond(response, 200, { removed }, cors);
        return;
      }

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
        const knowledge = await retrieveTransportKnowledge(`${origin} ${destination}`, transportKnowledgeRoot());
        const prompt = buildTransportKnowledgePrompt({
          userRequest: [
            '請以繁體中文提供簡短、友善的轉乘建議。',
            `旅客目前在：${origin}。`,
            `旅客欲前往：${destination}。`
          ].join(''),
          knowledge
        });
        respond(response, 200, {
          answer: await createOllamaClient().chat(prompt),
          model: process.env.OLLAMA_CHAT_MODEL ?? 'gemma4:e4b',
          knowledgeMode: knowledge.knowledgeMode,
          sources: knowledge.sources
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
        const knowledge = await retrieveTransportKnowledge(message, transportKnowledgeRoot());
        const prompt = buildTransportKnowledgePrompt({
          userRequest: message,
          knowledge
        });
        respond(response, 200, {
          answer: await createOllamaClient().chat(prompt),
          model: process.env.OLLAMA_CHAT_MODEL ?? 'gemma4:e4b',
          knowledgeMode: knowledge.knowledgeMode,
          sources: knowledge.sources
        }, cors);
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

function transportKnowledgeRoot(): string {
  return process.env.TRANSPORT_DATA_ROOT ?? path.resolve(process.cwd(), 'data', 'transport-knowledge');
}

function buildTransportKnowledgePrompt({
  userRequest,
  knowledge
}: {
  userRequest: string;
  knowledge: TransportKnowledgeResult;
}): string {
  const sourceContext = knowledge.knowledgeMode === 'local-sources'
    ? [
        '本機下載資料如下。回答可使用這些內容，並且不得把未出現在來源中的內容說成本機官方資料：',
        ...knowledge.documents.map((document, index) => [
          `來源 ${index + 1}: ${document.title}`,
          `URL: ${document.sourceUrl}`,
          `下載時間: ${document.downloadedAt}`,
          `內容: ${document.text}`
        ].join('\n'))
      ].join('\n\n')
    : [
        '未使用本機下載資料：本機資料沒有找到足夠相關的來源。',
        '可以使用一般鐵道旅運知識回答，但必須明確告知未使用本機下載資料，且不可將一般知識表述為本機官方來源。'
      ].join('\n');

  return [
    '你是 RailAgent，請以繁體中文、簡潔且直接地回答旅客的鐵道服務問題。',
    '若涉及時刻、票價、營運、安全或無障礙資訊，必須提醒旅客以官方公告、現場站務人員或即時資訊為準。',
    '不可編造即時班表、現場狀態或官方規定。',
    sourceContext,
    `旅客問題：${userRequest}`
  ].join('\n\n');
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

  const allowed = (process.env.RAILAGENT_ALLOWED_ORIGIN ?? 'http://127.0.0.1:5173,https://jeff30515.github.io')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!allowed.includes(origin)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, x-demo-user-id, ngrok-skip-browser-warning',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
