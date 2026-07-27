import { TableClient, type TableEntity } from '@azure/data-tables';
import type { ServiceUrgency } from './schemas.js';

export type MobileRole = 'public' | 'staff' | 'supervisor';
export type RailTaskType =
  | 'lost_item'
  | 'passenger_assist'
  | 'facility_issue'
  | 'equipment_anomaly'
  | 'knowledge_followup'
  | 'service_case';
export type RailTaskStatus =
  | 'new'
  | 'open'
  | 'claimed'
  | 'in_progress'
  | 'waiting_supervisor'
  | 'completed'
  | 'cancelled';
export type TaskEventType =
  | 'created'
  | 'claimed'
  | 'transitioned'
  | 'supervisor_escalated'
  | 'ai_updated'
  | 'note_added';

export interface DemoUser {
  userId: string;
  accountId: string;
  displayName: string;
  role: MobileRole;
  companyId: string;
  unitId?: string;
  allowedUnitIds: string[];
  stationScope: string[];
}

export interface RailTask {
  taskId: string;
  companyId: string;
  unitId: string;
  stationName: string;
  type: RailTaskType;
  status: RailTaskStatus;
  priority: ServiceUrgency;
  createdByUserId: string;
  createdByRole: MobileRole;
  assignedToUserId?: string;
  sourceAgent?: 'log' | 'knowledge' | 'service' | 'lost-found' | 'manual';
  description: string;
  aiSummary: string;
  nextAction: string;
  caseId?: string;
  recipientUnitIds?: string[];
  lostItem?: { candidateId: string; title: string; stationName: string; pickupDate: string };
  createdAt: string;
  updatedAt: string;
}

export interface TaskEvent {
  eventId: string;
  taskId: string;
  companyId: string;
  unitId: string;
  actorUserId: string;
  actorRole: MobileRole;
  eventType: TaskEventType;
  note: string;
  createdAt: string;
}

export interface CreateTaskInput {
  type: RailTaskType;
  stationName?: string;
  description: string;
  priority?: ServiceUrgency;
  sourceAgent?: RailTask['sourceAgent'];
}

export interface TaskTransitionInput {
  status: RailTaskStatus;
  note?: string;
}

export interface TrackLostItemCaseInput {
  candidateId: string;
  title: string;
  stationName: string;
  pickupDate: string;
}

export interface FoundItem {
  itemId: string;
  companyId: string;
  unitId: string;
  stationName: string;
  itemType: string;
  color?: string;
  brand?: string;
  features?: string;
  foundLocation: string;
  foundAt: string;
  trainNumber?: string;
  createdByUserId: string;
  createdAt: string;
}

export interface CreateFoundItemInput {
  stationName: string;
  itemType: string;
  color?: string;
  brand?: string;
  features?: string;
  foundLocation: string;
  foundAt: string;
  trainNumber?: string;
}

export interface TaskRepository {
  mode: 'fallback' | 'azure-table';
  getDemoUserByAccount(accountId: string): Promise<DemoUser | null>;
  getDemoUserById(userId: string): Promise<DemoUser | null>;
  listTasksForUser(user: DemoUser): Promise<RailTask[]>;
  getVisibleTask(user: DemoUser, taskId: string): Promise<RailTask | null>;
  createTask(user: DemoUser, input: CreateTaskInput): Promise<RailTask>;
  trackLostItemCase(user: DemoUser, input: TrackLostItemCaseInput): Promise<RailTask>;
  untrackLostItemCase(user: DemoUser, candidateId: string): Promise<boolean>;
  listFoundItems(user: DemoUser, unitId?: string): Promise<FoundItem[]>;
  createFoundItem(user: DemoUser, input: CreateFoundItemInput): Promise<FoundItem | null>;
  claimTask(user: DemoUser, taskId: string): Promise<RailTask | null>;
  transitionTask(user: DemoUser, taskId: string, input: TaskTransitionInput): Promise<RailTask | null>;
  listEventsForTask(user: DemoUser, taskId: string): Promise<TaskEvent[] | null>;
}

interface AzureTableRepositoryOptions {
  connectionString: string;
  usersTableName: string;
  tasksTableName: string;
  eventsTableName: string;
  foundItemsTableName: string;
}

const seedUsers: DemoUser[] = [
  {
    userId: 'demo-public-ntmetro',
    accountId: 'ntmetro-public',
    displayName: '民眾示範帳號',
    role: 'public',
    companyId: 'ntmetro',
    allowedUnitIds: [],
    stationScope: ['板橋', '淡水']
  },
  {
    userId: 'demo-public-tamsui',
    accountId: 'ntmetro-public-tamsui',
    displayName: '淡水旅客示範帳號',
    role: 'public',
    companyId: 'ntmetro',
    allowedUnitIds: [],
    stationScope: ['淡水']
  },
  {
    userId: 'demo-staff-banqiao',
    accountId: 'ntmetro-staff-banqiao',
    displayName: '板橋站務員',
    role: 'staff',
    companyId: 'ntmetro',
    unitId: 'station-banqiao',
    allowedUnitIds: ['station-banqiao'],
    stationScope: ['板橋']
  },
  {
    userId: 'demo-supervisor-ntmetro',
    accountId: 'ntmetro-supervisor',
    displayName: '新北捷運值班主管',
    role: 'supervisor',
    companyId: 'ntmetro',
    unitId: 'ops-center',
    allowedUnitIds: ['station-banqiao', 'station-tamsui'],
    stationScope: ['板橋', '淡水']
  },
  {
    userId: 'demo-staff-tymetro',
    accountId: 'tymetro-staff-qingpu',
    displayName: '桃捷青埔站務員',
    role: 'staff',
    companyId: 'tymetro',
    unitId: 'station-qingpu',
    allowedUnitIds: ['station-qingpu'],
    stationScope: ['青埔']
  }
];

const legacySeedTasks: RailTask[] = [
  {
    taskId: 'task-lost-bag-banqiao',
    companyId: 'ntmetro',
    unitId: 'station-banqiao',
    stationName: '板橋',
    type: 'lost_item',
    status: 'open',
    priority: 'high',
    createdByUserId: 'demo-public-ntmetro',
    createdByRole: 'public',
    sourceAgent: 'lost-found',
    description: '旅客在板橋站遺失黑色背包。',
    aiSummary: '黑色背包遺失物，需要站務先比對候選拾獲物。',
    nextAction: '確認拾獲物清單並回覆旅客。',
    createdAt: '2026-06-10T08:00:00+08:00',
    updatedAt: '2026-06-10T08:00:00+08:00'
  },
  {
    taskId: 'task-door-banqiao',
    companyId: 'ntmetro',
    unitId: 'station-banqiao',
    stationName: '板橋',
    type: 'equipment_anomaly',
    status: 'open',
    priority: 'high',
    createdByUserId: 'system-log-agent',
    createdByRole: 'supervisor',
    sourceAgent: 'log',
    description: 'DOOR_FAIL 於板橋站列車重複觸發。',
    aiSummary: '車門控制模組異常升高，需安排現場檢查。',
    nextAction: '檢查車門控制器、防夾感測器與月台門連動紀錄。',
    createdAt: '2026-06-10T08:10:00+08:00',
    updatedAt: '2026-06-10T08:10:00+08:00'
  },
  {
    taskId: 'task-assist-tamsui',
    companyId: 'ntmetro',
    unitId: 'station-tamsui',
    stationName: '淡水',
    type: 'passenger_assist',
    status: 'open',
    priority: 'medium',
    createdByUserId: 'demo-public-tamsui',
    createdByRole: 'public',
    sourceAgent: 'service',
    description: '旅客需要無障礙協助。',
    aiSummary: '淡水站旅客協助需求，需要站務安排引導。',
    nextAction: '確認旅客位置並安排站務支援。',
    createdAt: '2026-06-10T08:16:00+08:00',
    updatedAt: '2026-06-10T08:16:00+08:00'
  },
  {
    taskId: 'task-hvac-tymetro',
    companyId: 'tymetro',
    unitId: 'station-qingpu',
    stationName: '青埔',
    type: 'equipment_anomaly',
    status: 'open',
    priority: 'medium',
    createdByUserId: 'system-log-agent',
    createdByRole: 'supervisor',
    sourceAgent: 'log',
    description: '桃捷車廂空調溫度連續高於舒適範圍。',
    aiSummary: '空調溫度異常，需檢查濾網與感測器。',
    nextAction: '通知桃捷青埔單位進行檢查。',
    createdAt: '2026-06-10T08:20:00+08:00',
    updatedAt: '2026-06-10T08:20:00+08:00'
  }
];

const seedTasks: RailTask[] = [];

const stationDirectory: Record<string, { companyId: string; unitId: string }> = {
  板橋: { companyId: 'ntmetro', unitId: 'station-banqiao' },
  淡水: { companyId: 'ntmetro', unitId: 'station-tamsui' },
  青埔: { companyId: 'tymetro', unitId: 'station-qingpu' }
};

export function createFallbackTaskRepository(): TaskRepository {
  return new FallbackTaskRepository();
}

export function createTaskRepositoryFromEnvironment(): TaskRepository {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!connectionString) {
    return createFallbackTaskRepository();
  }

  return new AzureTableTaskRepository({
    connectionString,
    usersTableName: process.env.AZURE_STORAGE_DEMO_USERS_TABLE?.trim() || 'RailAgentDemoUsers',
    tasksTableName: process.env.AZURE_STORAGE_TASKS_TABLE?.trim() || 'RailAgentTasks',
    eventsTableName: process.env.AZURE_STORAGE_TASK_EVENTS_TABLE?.trim() || 'RailAgentTaskEvents',
    foundItemsTableName: process.env.AZURE_STORAGE_FOUND_ITEMS_TABLE?.trim() || 'RailAgentFoundItems'
  });
}

class FallbackTaskRepository implements TaskRepository {
  readonly mode = 'fallback' as const;

  private readonly users = structuredClone(seedUsers);
  private readonly tasks = structuredClone(seedTasks);
  private readonly events: TaskEvent[] = seedTasks.map((task) => ({
    eventId: `event-created-${task.taskId}`,
    taskId: task.taskId,
    companyId: task.companyId,
    unitId: task.unitId,
    actorUserId: task.createdByUserId,
    actorRole: task.createdByRole,
    eventType: 'created',
    note: '任務建立',
    createdAt: task.createdAt
  }));
  private readonly foundItems: FoundItem[] = [];

  async getDemoUserByAccount(accountId: string): Promise<DemoUser | null> {
    return cloneOrNull(this.users.find((user) => user.accountId === accountId) ?? null);
  }

  async getDemoUserById(userId: string): Promise<DemoUser | null> {
    return cloneOrNull(this.users.find((user) => user.userId === userId) ?? null);
  }

  async listTasksForUser(user: DemoUser): Promise<RailTask[]> {
    return this.tasks.filter((task) => canSeeTask(user, task)).map(clone);
  }

  async getVisibleTask(user: DemoUser, taskId: string): Promise<RailTask | null> {
    return cloneOrNull(this.tasks.find((task) => task.taskId === taskId && canSeeTask(user, task)) ?? null);
  }

  async createTask(user: DemoUser, input: CreateTaskInput): Promise<RailTask> {
    const stationName = input.stationName?.trim() || user.stationScope[0] || '板橋';
    const scope = stationDirectory[stationName] ?? {
      companyId: user.companyId,
      unitId: user.allowedUnitIds[0] ?? user.unitId ?? 'public-intake'
    };
    const now = new Date().toISOString();
    const task: RailTask = {
      taskId: `task-${hashText(`${user.userId}:${input.type}:${input.description}:${now}`)}`,
      companyId: scope.companyId,
      unitId: scope.unitId,
      stationName,
      type: input.type,
      status: 'open',
      priority: input.priority ?? 'medium',
      createdByUserId: user.userId,
      createdByRole: user.role,
      sourceAgent: input.sourceAgent ?? 'manual',
      description: input.description,
      aiSummary: buildTaskSummary(input),
      nextAction: buildNextAction(input.type),
      createdAt: now,
      updatedAt: now
    };
    this.tasks.push(task);
    this.events.push(makeEvent(task, user, 'created', '手機 App 建立任務', now));
    return clone(task);
  }

  async trackLostItemCase(user: DemoUser, input: TrackLostItemCaseInput): Promise<RailTask> {
    const caseId = trackedCaseId(input.candidateId);
    const existing = this.tasks.find((task) => task.caseId === caseId && task.createdByUserId === user.userId);
    if (existing) return clone(existing);
    const task = makeTrackedLostItemTask(user, input);
    this.tasks.push(task);
    this.events.push(makeEvent(task, user, 'created', '旅客已追蹤遺失物案件', task.createdAt));
    return clone(task);
  }

  async untrackLostItemCase(user: DemoUser, candidateId: string): Promise<boolean> {
    const index = this.tasks.findIndex((task) => isTrackedCaseOwnedBy(task, user, candidateId));
    if (index < 0) return false;
    const [removed] = this.tasks.splice(index, 1);
    for (let index = this.events.length - 1; index >= 0; index -= 1) {
      if (this.events[index].taskId === removed.taskId) this.events.splice(index, 1);
    }
    return true;
  }

  async listFoundItems(user: DemoUser, unitId?: string): Promise<FoundItem[]> {
    if (user.role === 'public') return [];
    const scopedUnitId = resolveFoundItemUnit(user, unitId);
    if (!scopedUnitId) return [];
    return this.foundItems
      .filter((item) => item.companyId === user.companyId && item.unitId === scopedUnitId)
      .sort((left, right) => right.foundAt.localeCompare(left.foundAt))
      .map(clone);
  }

  async createFoundItem(user: DemoUser, input: CreateFoundItemInput): Promise<FoundItem | null> {
    if (user.role === 'public') return null;
    const unitId = resolveFoundItemUnit(user);
    if (!unitId) return null;
    const now = new Date().toISOString();
    const item: FoundItem = {
      itemId: `found-${hashText(`${user.userId}:${input.itemType}:${input.foundAt}:${now}`)}`,
      companyId: user.companyId,
      unitId,
      stationName: input.stationName.trim(),
      itemType: input.itemType.trim(),
      color: optionalText(input.color),
      brand: optionalText(input.brand),
      features: optionalText(input.features),
      foundLocation: input.foundLocation.trim(),
      foundAt: input.foundAt.trim(),
      trainNumber: optionalText(input.trainNumber),
      createdByUserId: user.userId,
      createdAt: now
    };
    this.foundItems.push(item);
    return clone(item);
  }

  async claimTask(user: DemoUser, taskId: string): Promise<RailTask | null> {
    const task = this.findVisibleMutableTask(user, taskId);
    if (!task || !canOperateTask(user, task) || !['new', 'open'].includes(task.status)) {
      return null;
    }

    const now = new Date().toISOString();
    task.status = 'claimed';
    task.assignedToUserId = user.userId;
    task.updatedAt = now;
    this.events.push(makeEvent(task, user, 'claimed', '任務已接單', now));
    return clone(task);
  }

  async transitionTask(user: DemoUser, taskId: string, input: TaskTransitionInput): Promise<RailTask | null> {
    const task = this.findVisibleMutableTask(user, taskId);
    if (!task || !canOperateTask(user, task) || !isAllowedTransition(task.status, input.status)) {
      return null;
    }

    const now = new Date().toISOString();
    task.status = input.status;
    task.updatedAt = now;
    const eventType: TaskEventType = input.status === 'waiting_supervisor' ? 'supervisor_escalated' : 'transitioned';
    this.events.push(makeEvent(task, user, eventType, input.note ?? `狀態更新為 ${input.status}`, now));
    return clone(task);
  }

  async listEventsForTask(user: DemoUser, taskId: string): Promise<TaskEvent[] | null> {
    const task = this.tasks.find((candidate) => candidate.taskId === taskId && canSeeTask(user, candidate));
    if (!task) {
      return null;
    }
    return this.events.filter((event) => event.taskId === taskId).map(clone);
  }

  private findVisibleMutableTask(user: DemoUser, taskId: string): RailTask | null {
    return this.tasks.find((task) => task.taskId === taskId && canSeeTask(user, task)) ?? null;
  }
}

class AzureTableTaskRepository implements TaskRepository {
  readonly mode = 'azure-table' as const;

  private readonly usersClient: TableClient;
  private readonly tasksClient: TableClient;
  private readonly eventsClient: TableClient;
  private readonly foundItemsClient: TableClient;
  private ready: Promise<void> | null = null;

  constructor(options: AzureTableRepositoryOptions) {
    this.usersClient = TableClient.fromConnectionString(options.connectionString, options.usersTableName);
    this.tasksClient = TableClient.fromConnectionString(options.connectionString, options.tasksTableName);
    this.eventsClient = TableClient.fromConnectionString(options.connectionString, options.eventsTableName);
    this.foundItemsClient = TableClient.fromConnectionString(options.connectionString, options.foundItemsTableName);
  }

  async getDemoUserByAccount(accountId: string): Promise<DemoUser | null> {
    await this.ensureReady();
    for await (const entity of this.usersClient.listEntities<DemoUserEntity>({
      queryOptions: { filter: `accountId eq '${escapeOData(accountId)}'` }
    })) {
      return userFromEntity(entity);
    }
    return null;
  }

  async getDemoUserById(userId: string): Promise<DemoUser | null> {
    await this.ensureReady();
    try {
      const entity = await this.usersClient.getEntity<DemoUserEntity>('demo-users', userId);
      return userFromEntity(entity);
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async listTasksForUser(user: DemoUser): Promise<RailTask[]> {
    await this.ensureReady();
    const tasks = await this.listAllTasks();
    return tasks.filter((task) => canSeeTask(user, task));
  }

  async getVisibleTask(user: DemoUser, taskId: string): Promise<RailTask | null> {
    await this.ensureReady();
    const task = await this.getTaskForUser(user, taskId);
    return task && canSeeTask(user, task) ? task : null;
  }

  async createTask(user: DemoUser, input: CreateTaskInput): Promise<RailTask> {
    await this.ensureReady();
    const fallback = new FallbackTaskRepository();
    const task = await fallback.createTask(user, input);
    await this.tasksClient.upsertEntity(taskToEntity(task), 'Replace');
    await this.eventsClient.upsertEntity(eventToEntity(makeEvent(task, user, 'created', '手機 App 建立任務', task.createdAt)), 'Replace');
    return task;
  }

  async trackLostItemCase(user: DemoUser, input: TrackLostItemCaseInput): Promise<RailTask> {
    await this.ensureReady();
    const caseId = trackedCaseId(input.candidateId);
    const existing = (await this.listAllTasks()).find((task) => task.caseId === caseId && task.createdByUserId === user.userId);
    if (existing) return existing;
    const task = makeTrackedLostItemTask(user, input);
    await this.tasksClient.upsertEntity(taskToEntity(task), 'Replace');
    await this.eventsClient.upsertEntity(eventToEntity(makeEvent(task, user, 'created', '旅客已追蹤遺失物案件', task.createdAt)), 'Replace');
    return task;
  }

  async untrackLostItemCase(user: DemoUser, candidateId: string): Promise<boolean> {
    await this.ensureReady();
    const task = (await this.listAllTasks()).find((candidate) => isTrackedCaseOwnedBy(candidate, user, candidateId));
    if (!task) return false;
    await this.tasksClient.deleteEntity(task.companyId, task.taskId);
    for await (const event of this.eventsClient.listEntities<TaskEventEntity>({
      queryOptions: { filter: `PartitionKey eq '${escapeOData(task.taskId)}'` }
    })) {
      await this.eventsClient.deleteEntity(task.taskId, event.eventId);
    }
    return true;
  }

  async listFoundItems(user: DemoUser, unitId?: string): Promise<FoundItem[]> {
    await this.ensureReady();
    if (user.role === 'public') return [];
    const scopedUnitId = resolveFoundItemUnit(user, unitId);
    if (!scopedUnitId) return [];
    const items: FoundItem[] = [];
    for await (const entity of this.foundItemsClient.listEntities<FoundItemEntity>({
      queryOptions: { filter: `PartitionKey eq '${escapeOData(user.companyId)}' and unitId eq '${escapeOData(scopedUnitId)}'` }
    })) {
      items.push(foundItemFromEntity(entity));
    }
    return items.sort((left, right) => right.foundAt.localeCompare(left.foundAt));
  }

  async createFoundItem(user: DemoUser, input: CreateFoundItemInput): Promise<FoundItem | null> {
    await this.ensureReady();
    if (user.role === 'public') return null;
    const unitId = resolveFoundItemUnit(user);
    if (!unitId) return null;
    const now = new Date().toISOString();
    const item: FoundItem = {
      itemId: `found-${hashText(`${user.userId}:${input.itemType}:${input.foundAt}:${now}`)}`,
      companyId: user.companyId,
      unitId,
      stationName: input.stationName.trim(),
      itemType: input.itemType.trim(),
      color: optionalText(input.color), brand: optionalText(input.brand), features: optionalText(input.features),
      foundLocation: input.foundLocation.trim(), foundAt: input.foundAt.trim(), trainNumber: optionalText(input.trainNumber),
      createdByUserId: user.userId, createdAt: now
    };
    await this.foundItemsClient.upsertEntity(foundItemToEntity(item), 'Replace');
    return item;
  }

  async claimTask(user: DemoUser, taskId: string): Promise<RailTask | null> {
    await this.ensureReady();
    const task = await this.getTaskForUser(user, taskId);
    if (!task || !canSeeTask(user, task) || !canOperateTask(user, task) || !['new', 'open'].includes(task.status)) {
      return null;
    }

    const now = new Date().toISOString();
    const updated: RailTask = { ...task, status: 'claimed', assignedToUserId: user.userId, updatedAt: now };
    await this.tasksClient.upsertEntity(taskToEntity(updated), 'Replace');
    await this.eventsClient.upsertEntity(eventToEntity(makeEvent(updated, user, 'claimed', '任務已接單', now)), 'Replace');
    return updated;
  }

  async transitionTask(user: DemoUser, taskId: string, input: TaskTransitionInput): Promise<RailTask | null> {
    await this.ensureReady();
    const task = await this.getTaskForUser(user, taskId);
    if (!task || !canSeeTask(user, task) || !canOperateTask(user, task) || !isAllowedTransition(task.status, input.status)) {
      return null;
    }

    const now = new Date().toISOString();
    const updated: RailTask = { ...task, status: input.status, updatedAt: now };
    const eventType: TaskEventType = input.status === 'waiting_supervisor' ? 'supervisor_escalated' : 'transitioned';
    await this.tasksClient.upsertEntity(taskToEntity(updated), 'Replace');
    await this.eventsClient.upsertEntity(
      eventToEntity(makeEvent(updated, user, eventType, input.note ?? `狀態更新為 ${input.status}`, now)),
      'Replace'
    );
    return updated;
  }

  async listEventsForTask(user: DemoUser, taskId: string): Promise<TaskEvent[] | null> {
    await this.ensureReady();
    const task = await this.getVisibleTask(user, taskId);
    if (!task) {
      return null;
    }

    const events: TaskEvent[] = [];
    for await (const entity of this.eventsClient.listEntities<TaskEventEntity>({
      queryOptions: { filter: `PartitionKey eq '${escapeOData(taskId)}'` }
    })) {
      events.push(eventFromEntity(entity));
    }
    return events.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  private async ensureReady(): Promise<void> {
    this.ready ??= this.initialize();
    return this.ready;
  }

  private async initialize(): Promise<void> {
    await Promise.all([createTableIfMissing(this.usersClient), createTableIfMissing(this.tasksClient), createTableIfMissing(this.eventsClient), createTableIfMissing(this.foundItemsClient)]);

    if (!(await hasAnyEntity(this.usersClient))) {
      await Promise.all(seedUsers.map((user) => this.usersClient.upsertEntity(userToEntity(user), 'Replace')));
    }
    if (!(await hasAnyEntity(this.tasksClient))) {
      await Promise.all(seedTasks.map((task) => this.tasksClient.upsertEntity(taskToEntity(task), 'Replace')));
    }
    if (!(await hasAnyEntity(this.eventsClient))) {
      const events = seedTasks.map((task) =>
        makeEvent(
          task,
          seedUsers.find((user) => user.userId === task.createdByUserId) ?? seedUsers[3],
          'created',
          '任務建立',
          task.createdAt
        )
      );
      await Promise.all(events.map((event) => this.eventsClient.upsertEntity(eventToEntity(event), 'Replace')));
    }
  }

  private async listCompanyTasks(companyId: string): Promise<RailTask[]> {
    const tasks: RailTask[] = [];
    for await (const entity of this.tasksClient.listEntities<RailTaskEntity>({
      queryOptions: { filter: `PartitionKey eq '${escapeOData(companyId)}'` }
    })) {
      tasks.push(taskFromEntity(entity));
    }
    return tasks;
  }

  private async listAllTasks(): Promise<RailTask[]> {
    const tasks: RailTask[] = [];
    for await (const entity of this.tasksClient.listEntities<RailTaskEntity>()) {
      tasks.push(taskFromEntity(entity));
    }
    return tasks;
  }

  private async getTaskForUser(user: DemoUser, taskId: string): Promise<RailTask | null> {
    const task = (await this.listAllTasks()).find((candidate) => candidate.taskId === taskId) ?? null;
    return task && canSeeTask(user, task) ? task : null;
  }

  private async getTaskById(companyId: string, taskId: string): Promise<RailTask | null> {
    try {
      return taskFromEntity(await this.tasksClient.getEntity<RailTaskEntity>(companyId, taskId));
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }
}

type DemoUserEntity = Omit<DemoUser, 'allowedUnitIds' | 'stationScope'> & {
  allowedUnitIdsJson: string;
  stationScopeJson: string;
};

type RailTaskEntity = Omit<RailTask, 'recipientUnitIds' | 'lostItem'> & { recipientUnitIdsJson?: string; lostItemJson?: string };
type TaskEventEntity = TaskEvent;
type FoundItemEntity = FoundItem;

function userToEntity(user: DemoUser): TableEntity<DemoUserEntity> {
  const { allowedUnitIds, stationScope, ...entityUser } = user;
  return {
    partitionKey: 'demo-users',
    rowKey: user.userId,
    ...entityUser,
    allowedUnitIdsJson: JSON.stringify(allowedUnitIds),
    stationScopeJson: JSON.stringify(stationScope)
  };
}

function userFromEntity(entity: DemoUserEntity): DemoUser {
  return {
    userId: entity.userId,
    accountId: entity.accountId,
    displayName: entity.displayName,
    role: entity.role,
    companyId: entity.companyId,
    unitId: entity.unitId,
    allowedUnitIds: parseJsonArray(entity.allowedUnitIdsJson),
    stationScope: parseJsonArray(entity.stationScopeJson)
  };
}

function taskToEntity(task: RailTask): TableEntity<RailTaskEntity> {
  const { recipientUnitIds, lostItem, ...entityTask } = task;
  return {
    partitionKey: task.companyId,
    rowKey: task.taskId,
    ...entityTask,
    recipientUnitIdsJson: recipientUnitIds ? JSON.stringify(recipientUnitIds) : undefined,
    lostItemJson: lostItem ? JSON.stringify(lostItem) : undefined
  };
}

function taskFromEntity(entity: RailTaskEntity): RailTask {
  return {
    taskId: entity.taskId,
    companyId: entity.companyId,
    unitId: entity.unitId,
    stationName: entity.stationName,
    type: entity.type,
    status: entity.status,
    priority: entity.priority,
    createdByUserId: entity.createdByUserId,
    createdByRole: entity.createdByRole,
    assignedToUserId: entity.assignedToUserId,
    sourceAgent: entity.sourceAgent,
    description: entity.description,
    aiSummary: entity.aiSummary,
    nextAction: entity.nextAction,
    caseId: entity.caseId,
    recipientUnitIds: entity.recipientUnitIdsJson ? parseJsonArray(entity.recipientUnitIdsJson) : undefined,
    lostItem: entity.lostItemJson ? parseLostItem(entity.lostItemJson) : undefined,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt
  };
}

function eventToEntity(event: TaskEvent): TableEntity<TaskEventEntity> {
  return {
    partitionKey: event.taskId,
    rowKey: event.eventId,
    ...event
  };
}

function eventFromEntity(entity: TaskEventEntity): TaskEvent {
  return {
    eventId: entity.eventId,
    taskId: entity.taskId,
    companyId: entity.companyId,
    unitId: entity.unitId,
    actorUserId: entity.actorUserId,
    actorRole: entity.actorRole,
    eventType: entity.eventType,
    note: entity.note,
    createdAt: entity.createdAt
  };
}

async function createTableIfMissing(client: TableClient): Promise<void> {
  try {
    await client.createTable();
  } catch (error) {
    if (!isConflict(error)) {
      throw error;
    }
  }
}

async function hasAnyEntity(client: TableClient): Promise<boolean> {
  for await (const page of client.listEntities().byPage({ maxPageSize: 1 })) {
    return page.length > 0;
  }
  return false;
}

function canSeeTask(user: DemoUser, task: RailTask): boolean {
  if (user.role === 'public') {
    return task.createdByUserId === user.userId;
  }
  if (task.recipientUnitIds?.some((unitId) => user.allowedUnitIds.includes(unitId))) return true;
  if (task.companyId !== user.companyId) {
    return false;
  }
  return user.allowedUnitIds.includes(task.unitId);
}

function canOperateTask(user: DemoUser, task: RailTask): boolean {
  if (user.role === 'public') {
    return task.createdByUserId === user.userId && ['cancelled'].includes(task.status);
  }
  return (task.companyId === user.companyId && user.allowedUnitIds.includes(task.unitId)) ||
    Boolean(task.recipientUnitIds?.some((unitId) => user.allowedUnitIds.includes(unitId)));
}

function resolveFoundItemUnit(user: DemoUser, requestedUnitId?: string): string | null {
  const unitId = requestedUnitId?.trim() || user.unitId || user.allowedUnitIds[0];
  if (!unitId || !user.allowedUnitIds.includes(unitId)) return null;
  return unitId;
}

function optionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function trackedCaseId(candidateId: string): string {
  return `lost-found-${candidateId.trim()}`;
}

function isTrackedCaseOwnedBy(task: RailTask, user: DemoUser, candidateId: string): boolean {
  return task.createdByUserId === user.userId &&
    task.sourceAgent === 'lost-found' &&
    task.caseId === trackedCaseId(candidateId);
}

function makeTrackedLostItemTask(user: DemoUser, input: TrackLostItemCaseInput): RailTask {
  const now = new Date().toISOString();
  const candidateId = input.candidateId.trim();
  const title = input.title.trim();
  const stationName = input.stationName.trim();
  const pickupDate = input.pickupDate.trim();
  return {
    taskId: `task-${hashText(`${user.userId}:${candidateId}`)}`,
    companyId: 'railagent', unitId: 'shared-lost-found', recipientUnitIds: ['station-banqiao', 'station-qingpu'],
    stationName, type: 'lost_item', status: 'open', priority: 'high',
    createdByUserId: user.userId, createdByRole: user.role, sourceAgent: 'lost-found',
    caseId: trackedCaseId(candidateId), lostItem: { candidateId, title, stationName, pickupDate },
    description: `旅客追蹤遺失物：${title}`,
    aiSummary: '旅客已追蹤此遺失物候選，請由板橋與桃園青埔站務共同確認。',
    nextAction: '確認拾獲物資訊，必要時聯繫旅客並更新案件狀態。', createdAt: now, updatedAt: now
  };
}

function foundItemToEntity(item: FoundItem): TableEntity<FoundItemEntity> {
  return { partitionKey: item.companyId, rowKey: item.itemId, ...item };
}

function foundItemFromEntity(entity: FoundItemEntity): FoundItem {
  return {
    itemId: entity.itemId, companyId: entity.companyId, unitId: entity.unitId,
    stationName: entity.stationName, itemType: entity.itemType, color: entity.color,
    brand: entity.brand, features: entity.features, foundLocation: entity.foundLocation,
    foundAt: entity.foundAt, trainNumber: entity.trainNumber,
    createdByUserId: entity.createdByUserId, createdAt: entity.createdAt
  };
}

function parseLostItem(value: string): RailTask['lostItem'] | undefined {
  try {
    const parsed = JSON.parse(value) as Partial<NonNullable<RailTask['lostItem']>>;
    if (typeof parsed.candidateId !== 'string' || typeof parsed.title !== 'string' || typeof parsed.stationName !== 'string' || typeof parsed.pickupDate !== 'string') return undefined;
    return { candidateId: parsed.candidateId, title: parsed.title, stationName: parsed.stationName, pickupDate: parsed.pickupDate };
  } catch { return undefined; }
}

function isAllowedTransition(from: RailTaskStatus, to: RailTaskStatus): boolean {
  if (from === to) {
    return true;
  }
  const allowed: Record<RailTaskStatus, RailTaskStatus[]> = {
    new: ['open', 'cancelled'],
    open: ['claimed', 'waiting_supervisor', 'cancelled'],
    claimed: ['in_progress', 'waiting_supervisor', 'completed', 'cancelled'],
    in_progress: ['waiting_supervisor', 'completed', 'cancelled'],
    waiting_supervisor: ['in_progress', 'completed', 'cancelled'],
    completed: [],
    cancelled: []
  };
  return allowed[from].includes(to);
}

function makeEvent(
  task: RailTask,
  user: DemoUser,
  eventType: TaskEventType,
  note: string,
  createdAt: string
): TaskEvent {
  return {
    eventId: `event-${eventType}-${hashText(`${task.taskId}:${user.userId}:${createdAt}`)}`,
    taskId: task.taskId,
    companyId: task.companyId,
    unitId: task.unitId,
    actorUserId: user.userId,
    actorRole: user.role,
    eventType,
    note,
    createdAt
  };
}

function buildTaskSummary(input: CreateTaskInput): string {
  if (input.type === 'lost_item') {
    return '旅客遺失物案件，需要站務進行候選物品比對。';
  }
  if (input.type === 'equipment_anomaly') {
    return '設備異常任務，需要現場人員確認狀態。';
  }
  if (input.type === 'knowledge_followup') {
    return '知識問答後續任務，需要人工確認 SOP 適用性。';
  }
  return '旅客服務任務，需要站務確認與回覆。';
}

function buildNextAction(type: RailTaskType): string {
  if (type === 'lost_item') {
    return '比對遺失物紀錄並以人工確認後回覆旅客。';
  }
  if (type === 'equipment_anomaly') {
    return '檢查現場設備並回報處置狀態。';
  }
  return '接單後依站務 SOP 處理。';
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function cloneOrNull<T>(value: T | null): T | null {
  return value ? clone(value) : null;
}

function hashText(value: string): string {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function escapeOData(value: string): string {
  return value.replace(/'/g, "''");
}

function isConflict(error: unknown): boolean {
  return getStatusCode(error) === 409;
}

function isNotFound(error: unknown): boolean {
  return getStatusCode(error) === 404;
}

function getStatusCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    return Number((error as { statusCode?: number }).statusCode);
  }
  return undefined;
}
