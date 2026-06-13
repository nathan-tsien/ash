import "server-only";

import type { AshLocale, Task } from "@ash/shared";
import { serverPraxisClient } from "./praxis-client";
import { summaryToTask } from "@/lib/praxis/summary-projection";

// Server components have no per-event ts; stamp list/get cards with request time.
function labels(locale: AshLocale) {
  return { ts: new Date().toISOString(), untitled: locale === "en" ? "Untitled task" : "未命名任务" };
}

export async function listTasks(locale: AshLocale): Promise<Task[]> {
  const client = serverPraxisClient();
  const { data, error } = await client.GET("/v1/tasks", { params: { query: { limit: 50 } } });
  if (error || !data) return [];
  return data.items.map((s) => summaryToTask(s, labels(locale)));
}

export async function getActiveTask(taskId: string, locale: AshLocale): Promise<Task | undefined> {
  const client = serverPraxisClient();
  const { data, error } = await client.GET("/v1/tasks/{id}", { params: { path: { id: taskId } } });
  if (error || !data) return undefined;
  return summaryToTask(data, labels(locale));
}
