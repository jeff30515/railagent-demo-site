import type { HttpRequest, InvocationContext } from '@azure/functions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  claimTask,
  createTask,
  demoLogin,
  getMobileHome,
  getTask,
  getTaskEvents,
  listTasks,
  resetMobileTaskRepository,
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

  it('GET /api/tasks only returns tasks inside a staff user unit scope', async () => {
    const response = await listTasks(authenticatedRequest('demo-staff-banqiao'), context());

    expect(response.status).toBe(200);
    const taskIds = response.jsonBody.tasks.map((task: { taskId: string }) => task.taskId);
    expect(taskIds).toEqual(expect.arrayContaining(['task-lost-bag-banqiao', 'task-door-banqiao']));
    expect(taskIds).not.toContain('task-hvac-tymetro');
    expect(response.jsonBody.tasks.every((task: { companyId: string; unitId: string }) => {
      return task.companyId === 'ntmetro' && task.unitId === 'station-banqiao';
    })).toBe(true);
  });

  it('GET /api/tasks allows a supervisor to see all allowed units but not other companies', async () => {
    const response = await listTasks(authenticatedRequest('demo-supervisor-ntmetro'), context());

    expect(response.status).toBe(200);
    const taskIds = response.jsonBody.tasks.map((task: { taskId: string }) => task.taskId);
    expect(taskIds).toEqual(expect.arrayContaining(['task-lost-bag-banqiao', 'task-assist-tamsui']));
    expect(taskIds).not.toContain('task-hvac-tymetro');
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
    const claimResponse = await claimTask(
      authenticatedRequest('demo-staff-banqiao', undefined, { taskId: 'task-lost-bag-banqiao' }),
      context()
    );

    expect(claimResponse.status).toBe(200);
    expect(claimResponse.jsonBody.task).toMatchObject({
      taskId: 'task-lost-bag-banqiao',
      status: 'claimed',
      assignedToUserId: 'demo-staff-banqiao'
    });

    const eventsResponse = await getTaskEvents(
      authenticatedRequest('demo-staff-banqiao', undefined, { taskId: 'task-lost-bag-banqiao' }),
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
  params?: Record<string, string>
): HttpRequest {
  return jsonRequest(body, params, { 'x-demo-user-id': userId });
}

function jsonRequest(
  body?: unknown,
  params?: Record<string, string>,
  headers: Record<string, string> = {}
): HttpRequest {
  const headerMap = new Map(Object.entries(headers));
  return {
    method: body === undefined ? 'GET' : 'POST',
    url: 'http://localhost/api/test',
    params,
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
