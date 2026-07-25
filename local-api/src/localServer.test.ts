import type { Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { createLocalLostFoundServer } from './localServer.js';

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

describe('local friendly-transfer API', () => {
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
});

async function request(path: string, body: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  const server = createLocalLostFoundServer();
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Server address is unavailable.');
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  return { status: response.status, body: await response.json() as Record<string, unknown> };
}
