import "server-only";

import {
  getMockTask,
  getMockTasks,
  type AshLocale,
  type Task,
} from "@ash/shared";

/** Phase 1: backed by deterministic mocks; Phase 2 swaps internals to ash-server. */
export async function listTasks(
  _locale: AshLocale,
): Promise<Task[]> {
  return getMockTasks();
}

export async function getActiveTask(
  taskId: string,
  _locale: AshLocale,
): Promise<Task | undefined> {
  return getMockTask(taskId);
}
