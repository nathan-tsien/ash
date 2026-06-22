"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { AshLocale } from "@ash/shared";
import type { PraxisTaskClient } from "@/lib/praxis/client";
import type { TaskSummary } from "@/lib/praxis/runtime-events";
import { taskHref } from "@/lib/workbench-href";
import { Button } from "@ash/ui/button";

type LoadState = "idle" | "loading" | "error";

export function AllTasksList({
  locale,
  client,
}: {
  locale: AshLocale;
  client: PraxisTaskClient;
}) {
  const t = useTranslations("Workbench");
  const [items, setItems] = useState<TaskSummary[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [state, setState] = useState<LoadState>("idle");
  const didInit = useRef(false);

  const load = useCallback(
    async (next?: string) => {
      setState("loading");
      try {
        const page = await client.listTasks({ limit: 20, cursor: next });
        setItems((prev) => (next ? [...prev, ...page.items] : page.items));
        setCursor(page.next_cursor ?? null);
        setState("idle");
      } catch {
        setState("error");
      }
    },
    [client],
  );

  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      void load();
    }
  }, [load]);

  if (state === "error" && items.length === 0) {
    return (
      <button
        className="text-sm text-muted-foreground underline"
        onClick={() => void load()}
      >
        {t("tasksError")}
      </button>
    );
  }

  if (state === "idle" && items.length === 0 && cursor !== undefined) {
    return (
      <p className="px-3 py-6 text-sm text-muted-foreground">
        {t("tasksEmpty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1" data-locale={locale}>
      <h1 className="px-3 py-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {t("allTasksTitle")}
      </h1>
      {items.map((task) => (
        <Link
          key={task.id}
          href={taskHref(task.id)}
          className="rounded-md px-3 py-2 text-sm hover:bg-muted"
        >
          {task.title ?? "—"}
        </Link>
      ))}
      {cursor ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={state === "loading"}
          onClick={() => void load(cursor)}
        >
          {t("loadMore")}
        </Button>
      ) : null}
    </div>
  );
}
