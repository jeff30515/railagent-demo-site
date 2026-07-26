import type { HttpRequest, InvocationContext } from '@azure/functions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  claimTask,
  createFoundItem,
  createTask,
  demoLogin,
  getMobileHome,
  getTask,
  getTaskEvents,
  listFoundItems,
  listTasks,
  resetMobileTaskRepository,
  trackLostItemCase,
  transitionTask
} from './mobileTasks.js';

vi.mock('@azure/functions', () => ({
  app: {
    http: vi.fn()
  }
}));

describe('Mobile task API handlers', () => {
  beforeEach(() => {
    resetMobileTaskRepository();
  });

  it('POST /api/auth/demo-login returns a scoped demo user and token', async () => {
    const response = await demoLogin(jsonRequest({ accountId: 'ntmetro-public' }), context());

    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({
      user: {
        userId: 'demo-public-ntmetro',
        role: 'public',
        companyId: 'ntmetro'
      },
      demoToken: 'demo-public-ntmetro'
    });
  });

  it('GET /api/tasks has no seeded demo task data for a staff user', async () => {
    const response = await listTasks(authenticatedRequest('demo-staff-banqiao'), context());

    expect(response.status).toBe(200);
    expect(response.jsonBody.tasks).toEqual([]);
  });

  it('POST then GET /api/lost-found/items persists a staff found item only for its unit', async () => {
    const created = await createFoundItem(
      authenticatedRequest('demo-staff-banqiao', {
        itemType: '背包',
        color: '黑色',
        brand: 'Rail',
        features: '有拉鍊',
        foundLocation: '月台 2',
        foundAt: '2026-07-26T09:30',
        trainNumber: '1234',
        stationName: '板橋站'
      }),
      context()
    );

    expect(created.status).toBe(201);
    expect(created.jsonBody.item).toMatchObject({
      unitId: 'station-banqiao',
      stationName: '板橋站',
      itemType: '背包',
      foundLocation: '月台 2',
      createdByUserId: 'demo-staff-banqiao'
    });

    const banqiaoItems = await listFoundItems(
      authenticatedRequest('demo-staff-banqiao', undefined, undefined, { unitId: 'station-banqiao' }),
      context()
    );
    expect(banqiaoItems.status).toBe(200);
    expect(banqiaoItems.jsonBody.items).toHaveLength(1);

    const qingpuItems = await listFoundItems(
      authenticatedRequest('demo-staff-tymetro', undefined, undefined, { unitId: 'station-qingpu' }),
      context()
    );
    expect(qingpuItems.status).toBe(200);
    expect(qingpuItems.jsonBody.items).toEqual([]);
  });

  it('creates one passenger-tracked case visible to both Banqiao and Qingpu staff', async () => {
    const response = await trackLostItemCase(authenticatedRequest('demo-public-ntmetro', {
      candidateId: 'candidate-api-1', title: '黑色後背包', stationName: '板橋', pickupDate: '2026-07-26'
    }), context());
    expect(response.status).toBe(201);
    const qingpu = await listTasks(authenticatedRequest('demo-staff-tymetro'), context());
    expect(qingpu.jsonBody.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ taskId: response.jsonBody.task.taskId, caseId: 'lost-found-candidate-api-1' })
    ]));
  });

  it('GET /api/tasks has no seeded demo task data for a supervisor', async () => {
    const response = await listTasks(authenticatedRequest('demo-supervisor-ntmetro'), context());

    expect(response.status).toBe(200);
    expect(response.jsonBody.tasks).toEqual([]);
  });

  it('GET /api/mobile/home returns role-specific tile counts', async () => {
    const response = await getMobileHome(authenticatedRequest('demo-staff-banqiao'), context());

    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({
      role: 'staff',
      tiles: expect.arrayContaining([
        expect.objectContaining({ id: 'open-tasks', count: expect.any(Number) }),
        expect.objectContaining({ id: 'my-tasks', count: expect.any(Number) }),
        expect.objectContaining({ id: 'knowledge' })
      ])
    });
  });

  it('POST /api/tasks creates a public service task scoped to the requested station unit', async () => {
    const response = await createTask(
      authenticatedRequest('demo-public-ntmetro', {
        type: 'lost_item',
        stationName: '板橋',
        description: '我在板橋站遺失黑色背包',
        priority: 'medium'
      }),
      context()
    );

    expect(response.status).toBe(201);
    expect(response.jsonBody.task).toMatchObject({
      companyId: 'ntmetro',
      unitId: 'station-banqiao',
      stationName: '板橋',
      type: 'lost_item',
      status: 'open',
      createdByUserId: 'demo-public-ntmetro',
      createdByRole: 'public'
    });

    const staffList = await listTasks(authenticatedRequest('demo-staff-banqiao'), context());
    expect(staffList.jsonBody.tasks.map((task: { taskId: string }) => task.taskId)).toContain(
      response.jsonBody.task.taskId
    );
  });

  it('POST /api/tasks/{taskId}/claim assigns an open task and records an event', async () => {
    const created = await createTask(authenticatedRequest('demo-public-ntmetro', {
      type: 'lost_item', stationName: '板橋', description: '待認領的遺失物'
    }), context());
    const taskId = created.jsonBody.task.taskId as string;
    const claimResponse = await claimTask(
      authenticatedRequest('demo-staff-banqiao', undefined, { taskId }),
      context()
    );

    expect(claimResponse.status).toBe(200);
    expect(claimResponse.jsonBody.task).toMatchObject({
      taskId,
      status: 'claimed',
      assignedToUserId: 'demo-staff-banqiao'
    });

    const eventsResponse = await getTaskEvents(
      authenticatedRequest('demo-staff-banqiao', undefined, { taskId }),
      context()
    );
    expect(eventsResponse.status).toBe(200);
    expect(eventsResponse.jsonBody.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'claimed',
          actorUserId: 'demo-staff-banqiao'
        })
      ])
    );
  });

  it('POST /api/tasks/{taskId}/transition rejects cross-company changes', async () => {
    const response = await transitionTask(
      authenticatedRequest(
        'demo-staff-banqiao',
        { status: 'in_progress', note: '嘗試處理其他公司任務' },
        { taskId: 'task-hvac-tymetro' }
      ),
      context()
    );

    expect(response.status).toBe(404);
    expect(response.jsonBody.error).toBe('task_not_found');
  });

  it('GET /api/tasks/{taskId} hides public tasks owned by another public user', async () => {
    const response = await getTask(
      authenticatedRequest('demo-public-tamsui', undefined, { taskId: 'task-lost-bag-banqiao' }),
      context()
    );

    expect(response.status).toBe(404);
    expect(response.jsonBody.error).toBe('task_not_found');
  });
});

function authenticatedRequest(
  userId: string,
  body?: unknown,
  params?: Record<string, string>,
  query?: Record<string, string>
): HttpRequest {
  return jsonRequest(body, params, { 'x-demo-user-id': userId }, query);
}

function jsonRequest(
  body?: unknown,
  params?: Record<string, string>,
  headers: Record<string, string> = {},
  query?: Record<string, string>
): HttpRequest {
  const headerMap = new Map(Object.entries(headers));
  return {
    method: body === undefined ? 'GET' : 'POST',
    url: 'http://localhost/api/test',
    params,
    query: new URLSearchParams(query),
    headers: {
      get: (key: string) => headerMap.get(key.toLowerCase()) ?? null
    },
    json: async () => body
  } as unknown as HttpRequest;
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
