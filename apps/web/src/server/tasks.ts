import "server-only";

import type { AshLocale, Task } from "@ash/shared";

export async function listTasks(
  _locale: AshLocale,
): Promise<Task[]> {
  return [];
}

export async function getActiveTask(
  _taskId: string,
  _locale: AshLocale,
): Promise<Task | undefined> {
  return undefined;
}
