import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import {
  createFallbackTaskRepository,
  createTaskRepositoryFromEnvironment,
  type CreateTaskInput,
  type DemoUser,
  type RailTask,
  type RailTaskStatus,
  type TaskRepository,
  type TaskTransitionInput
} from '../shared/mobileTaskRepository.js';

interface DemoLoginRequest {
  accountId?: string;
}

let taskRepository: TaskRepository = createTaskRepositoryFromEnvironment();

export function resetMobileTaskRepository(): void {
  taskRepository = createFallbackTaskRepository();
}

export async function demoLogin(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const body = await readJson<DemoLoginRequest>(request);
  const user = body.accountId ? await taskRepository.getDemoUserByAccount(body.accountId) : null;
  if (!user) {
    return json(401, { error: 'invalid_demo_account' });
  }

  return json(200, {
    user,
    demoToken: user.userId
  });
}

export async function getMobileHome(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const user = await requireUser(request);
  if (!user) {
    return unauthorized();
  }

  const tasks = await taskRepository.listTasksForUser(user);
  return json(200, {
    role: user.role,
    user,
    tiles: buildHomeTiles(user, tasks),
    recentTasks: tasks.slice(0, 4)
  });
}

export async function listTasks(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const user = await requireUser(request);
  if (!user) {
    return unauthorized();
  }

  const tasks = await taskRepository.listTasksForUser(user);
  return json(200, {
    user,
    tasks,
    counts: buildTaskCounts(tasks)
  });
}

export async function getTask(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const user = await requireUser(request);
  if (!user) {
    return unauthorized();
  }

  const task = await taskRepository.getVisibleTask(user, readTaskId(request));
  if (!task) {
    return notFound();
  }

  return json(200, { task });
}

export async function createTask(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const user = await requireUser(request);
  if (!user) {
    return unauthorized();
  }

  const body = await readJson<Partial<CreateTaskInput>>(request);
  if (!body.type || !body.description?.trim()) {
    return json(400, { error: 'invalid_task_payload' });
  }

  const task = await taskRepository.createTask(user, {
    type: body.type,
    stationName: body.stationName,
    description: body.description.trim(),
    priority: body.priority,
    sourceAgent: body.sourceAgent
  });
  return json(201, { task });
}

export async function claimTask(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const user = await requireUser(request);
  if (!user) {
    return unauthorized();
  }

  const task = await taskRepository.claimTask(user, readTaskId(request));
  if (!task) {
    return notFound();
  }

  return json(200, { task });
}

export async function transitionTask(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const user = await requireUser(request);
  if (!user) {
    return unauthorized();
  }

  const body = await readJson<Partial<TaskTransitionInput>>(request);
  if (!body.status) {
    return json(400, { error: 'invalid_transition_payload' });
  }

  const task = await taskRepository.transitionTask(user, readTaskId(request), {
    status: body.status,
    note: body.note
  });
  if (!task) {
    return notFound();
  }

  return json(200, { task });
}

export async function getTaskEvents(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const user = await requireUser(request);
  if (!user) {
    return unauthorized();
  }

  const events = await taskRepository.listEventsForTask(user, readTaskId(request));
  if (!events) {
    return notFound();
  }

  return json(200, { events });
}

async function requireUser(request: HttpRequest): Promise<DemoUser | null> {
  const userId = request.headers.get('x-demo-user-id');
  if (!userId) {
    return null;
  }
  return taskRepository.getDemoUserById(userId);
}

function buildHomeTiles(user: DemoUser, tasks: RailTask[]): Array<{ id: string; label: string; count?: number }> {
  if (user.role === 'public') {
    return [
      { id: 'lost-item', label: '遺失物通報' },
      { id: 'passenger-assist', label: '旅客協助' },
      { id: 'case-status', label: '案件進度', count: tasks.length },
      { id: 'knowledge', label: 'AI 問答' }
    ];
  }
  if (user.role === 'staff') {
    return [
      { id: 'open-tasks', label: '待接任務', count: tasks.filter((task) => task.status === 'open').length },
      { id: 'my-tasks', label: '我的任務', count: tasks.filter((task) => task.assignedToUserId === user.userId).length },
      { id: 'lost-found', label: '遺失物媒合' },
      { id: 'knowledge', label: '站務 SOP' }
    ];
  }
  return [
    { id: 'task-overview', label: '任務總覽', count: tasks.length },
    { id: 'escalations', label: '待升級案件', count: tasks.filter((task) => task.status === 'waiting_supervisor').length },
    { id: 'equipment', label: '異常設備', count: tasks.filter((task) => task.type === 'equipment_anomaly').length },
    { id: 'units', label: '單位範圍', count: user.allowedUnitIds.length }
  ];
}

function buildTaskCounts(tasks: RailTask[]): Record<RailTaskStatus, number> {
  const counts: Record<RailTaskStatus, number> = {
    new: 0,
    open: 0,
    claimed: 0,
    in_progress: 0,
    waiting_supervisor: 0,
    completed: 0,
    cancelled: 0
  };
  for (const task of tasks) {
    counts[task.status] += 1;
  }
  return counts;
}

async function readJson<T>(request: HttpRequest): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

function readTaskId(request: HttpRequest): string {
  return request.params.taskId ?? '';
}

function unauthorized(): HttpResponseInit {
  return json(401, { error: 'missing_demo_user' });
}

function notFound(): HttpResponseInit {
  return json(404, { error: 'task_not_found' });
}

function json(status: number, jsonBody: unknown): HttpResponseInit {
  return { status, jsonBody };
}

app.http('demoLogin', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/demo-login',
  handler: demoLogin
});

app.http('getMobileHome', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'mobile/home',
  handler: getMobileHome
});

app.http('listTasks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: listTasks
});

app.http('createTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: createTask
});

app.http('getTask', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks/{taskId}',
  handler: getTask
});

app.http('claimTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tasks/{taskId}/claim',
  handler: claimTask
});

app.http('transitionTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tasks/{taskId}/transition',
  handler: transitionTask
});

app.http('getTaskEvents', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks/{taskId}/events',
  handler: getTaskEvents
});
