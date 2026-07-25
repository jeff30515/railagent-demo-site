import { afterEach, describe, expect, it } from 'vitest';
import { createTaskRepositoryFromEnvironment } from './mobileTaskRepository.js';

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
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
