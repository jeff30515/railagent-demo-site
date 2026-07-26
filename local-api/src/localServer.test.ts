import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalLostFoundServer } from './localServer.js';

const servers: Server[] = [];
const chat = vi.hoisted(() => vi.fn<(_: string) => Promise<string>>());
const temporaryRoots: string[] = [];

vi.mock('./lostFound/ollamaClient.js', () => ({
  createOllamaClient: () => ({
    chat,
    embed: vi.fn(),
    rerank: vi.fn()
  })
}));

beforeEach(() => {
  chat.mockResolvedValue('請依現場公告確認後再搭乘。');
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  delete process.env.TRANSPORT_DATA_ROOT;
  chat.mockReset();
});

describe('local friendly-transfer API', () => {
  it('logs a station staff account in and returns its visible cases', async () => {
    const login = await request('/api/auth/demo-login', {
      accountId: 'ntmetro-staff-banqiao'
    });

    expect(login.status).toBe(200);
    expect(login.body).toMatchObject({
      demoToken: 'demo-staff-banqiao',
      user: { unitId: 'station-banqiao', role: 'staff' }
    });

    const tasks = await request('/api/tasks', undefined, {
      'x-demo-user-id': String(login.body.demoToken)
    }, 'GET');

    expect(tasks.status).toBe(200);
    expect(tasks.body).toMatchObject({
      user: { unitId: 'station-banqiao' },
      tasks: expect.any(Array),
      counts: expect.any(Object)
    });
  });

  it('allows GitHub Pages to call the staff login route', async () => {
    const login = await request('/api/auth/demo-login', {
      accountId: 'tymetro-staff-qingpu'
    }, { origin: 'https://jeff30515.github.io' });

    expect(login.status).toBe(200);
    expect(login.headers.get('access-control-allow-origin')).toBe('https://jeff30515.github.io');
  });

  it('stores and lists found items for the authenticated staff unit', async () => {
    const created = await request('/api/lost-found/items', {
      itemType: '雨傘', foundLocation: '出口 1', foundAt: '2026-07-26T10:00', stationName: '板橋站'
    }, { 'x-demo-user-id': 'demo-staff-banqiao' });
    expect(created.status).toBe(201);
    expect(created.body.item).toMatchObject({ unitId: 'station-banqiao', itemType: '雨傘' });

    const listed = await request('/api/lost-found/items?unitId=station-banqiao', undefined, {
      'x-demo-user-id': 'demo-staff-banqiao'
    }, 'GET');
    expect(listed.status).toBe(200);
    expect(listed.body.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemType: '雨傘', unitId: 'station-banqiao' })
    ]));
  });

  it('keeps Qingpu found items separate from Banqiao found items', async () => {
    const created = await request('/api/lost-found/items', {
      itemType: 'umbrella', foundLocation: 'exit 2', foundAt: '2026-07-26T10:00', stationName: 'Qingpu'
    }, { 'x-demo-user-id': 'demo-staff-tymetro' });

    expect(created.status).toBe(201);
    expect(created.body.item).toMatchObject({ unitId: 'station-qingpu', itemType: 'umbrella' });

    const qingpu = await request('/api/lost-found/items?unitId=station-qingpu', undefined, {
      'x-demo-user-id': 'demo-staff-tymetro'
    }, 'GET');
    expect(qingpu.status).toBe(200);
    expect(qingpu.body.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ unitId: 'station-qingpu', itemType: 'umbrella' })
    ]));

    const banqiao = await request('/api/lost-found/items?unitId=station-banqiao', undefined, {
      'x-demo-user-id': 'demo-staff-banqiao'
    }, 'GET');
    expect(banqiao.body.items).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ unitId: 'station-qingpu', itemType: 'umbrella' })
    ]));
  });

  it('returns a local station phone for the station endpoint', async () => {
    const response = await request('/api/friendly-transfer/station', { spokenStation: '\u53f0\u5317\u8eca\u7ad9' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      station: '\u81fa\u5317\u8eca\u7ad9',
      phone: '02-2371-3558',
      confirmation: expect.any(String)
    });
  });

  it('rejects an unknown station without returning a phone number', async () => {
    const response = await request('/api/friendly-transfer/station', { spokenStation: '\u6708\u7403\u7ad9' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Station could not be resolved.' });
    expect(response.body).not.toHaveProperty('phone');
  });

  it('requires both route endpoints before contacting Ollama', async () => {
    const response = await request('/api/friendly-transfer/route', { origin: '\u81fa\u5317\u8eca\u7ad9' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Origin and destination are required.' });
  });

  it('adds matching local source context to passenger chat responses', async () => {
    await useTransportKnowledge({
      title: '臺北車站無障礙電梯',
      text: '臺北車站無障礙電梯位於東三門旁，旅客可洽站務人員協助。',
      sourceUrl: 'https://example.test/taipei-accessibility',
      downloadedAt: '2026-07-25T08:00:00.000Z'
    });

    const response = await request('/api/passenger-chat', { message: '臺北車站無障礙電梯在哪裡？' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      answer: '請依現場公告確認後再搭乘。',
      model: 'gemma4:e4b',
      knowledgeMode: 'local-sources',
      sources: [{
        title: '臺北車站無障礙電梯',
        url: 'https://example.test/taipei-accessibility',
        downloadedAt: '2026-07-25T08:00:00.000Z'
      }]
    });
    expect(chat).toHaveBeenCalledTimes(1);
    expect(chat.mock.calls[0]?.[0]).toContain('臺北車站無障礙電梯位於東三門旁');
    expect(chat.mock.calls[0]?.[0]).toContain('https://example.test/taipei-accessibility');
  });

  it('marks passenger chat as model knowledge when no local document matches', async () => {
    await useTransportKnowledge({
      title: '臺北車站無障礙電梯',
      text: '臺北車站無障礙電梯位於東三門旁，旅客可洽站務人員協助。',
      sourceUrl: 'https://example.test/taipei-accessibility',
      downloadedAt: '2026-07-25T08:00:00.000Z'
    });

    const response = await request('/api/passenger-chat', { message: '高雄遺失雨傘怎麼辦？' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      answer: '請依現場公告確認後再搭乘。',
      knowledgeMode: 'model-knowledge',
      sources: []
    });
    expect(chat).toHaveBeenCalledTimes(1);
    expect(chat.mock.calls[0]?.[0]).toContain('可以使用一般鐵道旅運知識回答');
    expect(chat.mock.calls[0]?.[0]).toContain('未使用本機下載資料');
  });

  it('adds matching local source context to friendly route responses', async () => {
    await useTransportKnowledge({
      title: '臺北往松山轉乘',
      text: '臺北車站前往松山車站可搭乘臺鐵區間車，月台與班次請向站務人員確認。',
      sourceUrl: 'https://example.test/taipei-songshan-transfer',
      downloadedAt: '2026-07-25T09:00:00.000Z'
    });

    const response = await request('/api/friendly-transfer/route', {
      origin: '臺北車站',
      destination: '松山車站'
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      answer: '請依現場公告確認後再搭乘。',
      model: 'gemma4:e4b',
      knowledgeMode: 'local-sources',
      sources: [{
        title: '臺北往松山轉乘',
        url: 'https://example.test/taipei-songshan-transfer',
        downloadedAt: '2026-07-25T09:00:00.000Z'
      }]
    });
    expect(chat).toHaveBeenCalledTimes(1);
    expect(chat.mock.calls[0]?.[0]).toContain('臺北車站前往松山車站可搭乘臺鐵區間車');
  });
});

async function request(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
  method = 'POST'
): Promise<{ status: number; headers: Headers; body: Record<string, any> }> {
  const server = createLocalLostFoundServer();
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Server address is unavailable.');
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  return { status: response.status, headers: response.headers, body: await response.json() as Record<string, unknown> };
}

async function useTransportKnowledge(document: {
  title: string;
  text: string;
  sourceUrl: string;
  downloadedAt: string;
}) {
  const root = await mkdtemp(join(tmpdir(), 'local-server-transport-knowledge-'));
  temporaryRoots.push(root);
  process.env.TRANSPORT_DATA_ROOT = root;
  await writeFile(join(root, 'documents.jsonl'), `${JSON.stringify(document)}\n`, 'utf8');
}
