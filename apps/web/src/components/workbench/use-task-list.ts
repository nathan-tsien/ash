"use client";

import { useEffect, useRef, useState } from "react";
import type { AshLocale, Task } from "@ash/shared";
import { getPraxisClient } from "@/lib/praxis/client";
import { summaryToTask } from "@/lib/praxis/summary-projection";

/**
 * Returns the workbench task list, seeded with the server-rendered snapshot and
 * refreshed from the backend once on mount (and on locale change).
 *
 * Why a client refetch: the SSR loader (`serverPraxisClient`) resolves the token
 * read-only, so when the access token has expired the initial `tasks` prop comes
 * back empty (see ADR-0012 / praxis-client.ts). The browser client goes through
 * the BFF, which DOES refresh the token, so this fetch reliably returns the real
 * list — that is what makes the list appear after entering the workbench. On
 * failure we keep the SSR seed rather than blanking the list.
 */
export function useTaskList(initial: Task[], locale: AshLocale): Task[] {
  const [tasks, setTasks] = useState<Task[]>(initial);
  const clientRef = useRef(getPraxisClient());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const page = await clientRef.current.listTasks({ limit: 50 });
        if (cancelled) return;
        const labels = {
          ts: new Date().toISOString(),
          untitled: locale === "en" ? "Untitled task" : "未命名任务",
        };
        setTasks(page.items.map((summary) => summaryToTask(summary, labels)));
      } catch {
        // Offline / transient failure: keep the SSR snapshot, do not blank.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return tasks;
}
