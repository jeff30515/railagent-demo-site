import { afterEach, describe, expect, it } from 'vitest';
import { createFallbackTaskRepository, createTaskRepositoryFromEnvironment } from './mobileTaskRepository.js';

describe('mobile task repository factory', () => {
  const originalConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const originalTaskTable = process.env.AZURE_STORAGE_TASKS_TABLE;
  const originalEventsTable = process.env.AZURE_STORAGE_TASK_EVENTS_TABLE;
  const originalUsersTable = process.env.AZURE_STORAGE_DEMO_USERS_TABLE;

  afterEach(() => {
    restoreEnv('AZURE_STORAGE_CONNECTION_STRING', originalConnectionString);
    restoreEnv('AZURE_STORAGE_TASKS_TABLE', originalTaskTable);
    restoreEnv('AZURE_STORAGE_TASK_EVENTS_TABLE', originalEventsTable);
    restoreEnv('AZURE_STORAGE_DEMO_USERS_TABLE', originalUsersTable);
  });

  it('uses the deterministic fallback repository when Azure Storage is not configured', async () => {
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;

    const repository = createTaskRepositoryFromEnvironment();
    const user = await repository.getDemoUserByAccount('ntmetro-public');

    expect(repository.mode).toBe('fallback');
    expect(user).toMatchObject({
      userId: 'demo-public-ntmetro',
      role: 'public'
    });
  });

  it('creates an Azure Table repository when a storage connection string is configured', () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING =
      'DefaultEndpointsProtocol=https;AccountName=railagentdemo;AccountKey=dGVzdA==;EndpointSuffix=core.windows.net';
    process.env.AZURE_STORAGE_TASKS_TABLE = 'MobileTasks';
    process.env.AZURE_STORAGE_TASK_EVENTS_TABLE = 'MobileTaskEvents';
    process.env.AZURE_STORAGE_DEMO_USERS_TABLE = 'MobileDemoUsers';

    const repository = createTaskRepositoryFromEnvironment();

    expect(repository.mode).toBe('azure-table');
  });

  it('creates one tracked lost-item case that is visible to both Banqiao and Qingpu staff', async () => {
    const repository = createFallbackTaskRepository();
    const passenger = await repository.getDemoUserByAccount('ntmetro-public');
    const banqiao = await repository.getDemoUserByAccount('ntmetro-staff-banqiao');
    const qingpu = await repository.getDemoUserByAccount('tymetro-staff-qingpu');

    expect(passenger).not.toBeNull();
    expect(banqiao).not.toBeNull();
    expect(qingpu).not.toBeNull();
    const task = await repository.trackLostItemCase(passenger!, {
      candidateId: 'official-item-42',
      title: '黑色後背包',
      stationName: '板橋',
      pickupDate: '2026-07-26'
    });

    expect(task).toMatchObject({
      type: 'lost_item',
      sourceAgent: 'lost-found',
      caseId: 'lost-found-official-item-42',
      recipientUnitIds: ['station-banqiao', 'station-qingpu']
    });
    await expect(repository.listTasksForUser(banqiao!)).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ taskId: task.taskId })
    ]));
    await expect(repository.listTasksForUser(qingpu!)).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ taskId: task.taskId })
    ]));
  });

  it('removes a passenger-owned tracked lost-item case from passenger and staff task lists', async () => {
    const repository = createFallbackTaskRepository();
    const passenger = await repository.getDemoUserByAccount('ntmetro-public');
    const banqiao = await repository.getDemoUserByAccount('ntmetro-staff-banqiao');

    const task = await repository.trackLostItemCase(passenger!, {
      candidateId: 'official-item-43',
      title: 'Backpack',
      stationName: 'Banqiao',
      pickupDate: '2026-07-27'
    });

    await expect(repository.untrackLostItemCase(passenger!, 'official-item-43')).resolves.toBe(true);
    await expect(repository.listTasksForUser(passenger!)).resolves.not.toEqual(expect.arrayContaining([
      expect.objectContaining({ taskId: task.taskId })
    ]));
    await expect(repository.listTasksForUser(banqiao!)).resolves.not.toEqual(expect.arrayContaining([
      expect.objectContaining({ taskId: task.taskId })
    ]));
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
