"use client";

import type { Task } from "@ash/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { getPraxisClient } from "@/lib/praxis/client";
import {
  initialTaskRunState,
  runtimeEventReducer,
  type ReducerLabels,
  type TaskRunState,
} from "@/lib/praxis/runtime-event-reducer";
import { historyToTask, type HistoryLabels } from "@/lib/praxis/history-projection";

interface TaskRunContextValue {
  /** Session runs, newest first. */
  runs: Task[];
  getRun(id: string): Task | undefined;
  /** Create + start a task, returning its id. Streaming updates land async. */
  startTask(directive: string): Promise<string>;
  /** Answer the live pending question on a task (praxis ask_user). */
  answer(taskId: string, text: string): Promise<void>;
  /** Re-attach a task's stream: catch up via /history, then re-subscribe. */
  attach(taskId: string): Promise<void>;
}

const TaskRunContext = createContext<TaskRunContextValue | null>(null);

/**
 * Holds tasks created during the browser session and their live run state.
 * Runs are session-only (no server persistence this slice). The home composer
 * starts a run; the workbench reads live tasks from here.
 */
export function TaskRunProvider({ children }: { children: ReactNode }) {
  const [runs, setRuns] = useState<Record<string, Task>>({});
  const [order, setOrder] = useState<string[]>([]);
  const clientRef = useRef(getPraxisClient());
  const controllersRef = useRef<Set<AbortController>>(new Set());

  // App-authored runtime copy, resolved from i18n catalogs (IMPL-3) and passed
  // into the (pure) reducer. A run captures the locale active at its start;
  // switching locale mid-stream does not retranslate an in-flight run.
  const t = useTranslations("Workbench");
  const labels = useMemo<ReducerLabels>(
    () => ({
      deckFallbackTitle: t("runtimeDeckFallbackTitle"),
      deckPreview: t("runtimeDeckPreview"),
      failureNotice: (reason: string) => t("runtimeFailureNotice", { reason }),
      notifyMessage: (text: string) => text,
      truncationNotice: t("runtimeTruncationNotice"),
    }),
    [t],
  );
  const historyLabels = useMemo<HistoryLabels>(
    () => ({
      deckFallbackTitle: t("runtimeDeckFallbackTitle"),
      deckPreview: t("runtimeDeckPreview"),
      notifyMessage: (text: string) => text,
    }),
    [t],
  );

  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      for (const controller of controllers) controller.abort();
      controllers.clear();
    };
  }, []);

  const upsert = useCallback((task: Task) => {
    setRuns((prev) => ({ ...prev, [task.id]: task }));
  }, []);

  // Consume a task's event stream and drive termination off the reduced status.
  // `stream_end`/terminal events win; the abnormal-close fallback fires only when
  // the stream ends with the task neither terminal NOR awaiting_input.
  const runStream = useCallback(
    async (taskId: string, initial: Task, controller: AbortController) => {
      const client = clientRef.current;
      let state: TaskRunState = initialTaskRunState(initial);
      try {
        for await (const event of client.streamEvents(taskId, controller.signal)) {
          state = runtimeEventReducer(state, event, Date.now(), labels);
          upsert(state.task);
        }
        const status = state.task.status;
        if (status === "completed" || status === "failed") {
          try {
            await client.complete(taskId);
          } catch {
            // already terminal; ignore
          }
        } else if (status !== "awaiting_input") {
          // Abnormal close (no stream_end, not waiting on the user): fail it.
          upsert({ ...state.task, status: "failed" });
        }
        // awaiting_input: leave open; re-attach happens on demand.
      } catch {
        if (!controller.signal.aborted) {
          upsert({ ...state.task, status: "failed" });
        }
      } finally {
        controllersRef.current.delete(controller);
      }
    },
    [labels, upsert],
  );

  const startTask = useCallback(
    async (directive: string): Promise<string> => {
      const client = clientRef.current;
      const startedAt = new Date().toISOString();
      const summary = await client.createTask({
        user_input: directive,
        title: directive.slice(0, 40),
      });

      const seeded: Task = {
        id: summary.id,
        title: summary.title || directive.slice(0, 40),
        description: directive,
        status: "pending",
        createdAt: startedAt,
        updatedAt: startedAt,
        messages: [
          { id: `user-${summary.id}`, role: "user", content: directive, createdAt: startedAt },
        ],
        artifacts: [],
        toolTraces: [],
      };
      upsert(seeded);
      setOrder((prev) => [summary.id, ...prev.filter((x) => x !== summary.id)]);

      const controller = new AbortController();
      controllersRef.current.add(controller);
      void (async () => {
        try {
          await clientRef.current.startTask(summary.id, directive);
          upsert({ ...seeded, status: "running" });
          await runStream(summary.id, { ...seeded, status: "running" }, controller);
        } catch {
          if (!controller.signal.aborted) upsert({ ...seeded, status: "failed" });
        }
      })();

      return summary.id;
    },
    [upsert, runStream],
  );

  const answer = useCallback(
    async (taskId: string, text: string): Promise<void> => {
      const current = runs[taskId];
      const askId = current?.pendingQuestion?.askId;
      if (!askId) return; // no live question (or recovered read-only); nothing to send
      // Optimistic: clear the prompt and show running; the live turn_resumed confirms.
      const { pendingQuestion: _omit, ...rest } = current;
      upsert({ ...rest, status: "running" });
      try {
        await clientRef.current.answer(taskId, askId, text);
      } catch {
        upsert(current); // restore the question so the user can retry
      }
    },
    [runs, upsert],
  );

  const attach = useCallback(
    async (taskId: string): Promise<void> => {
      const client = clientRef.current;
      const existing = runs[taskId];
      if (!existing) return;
      try {
        const items: Awaited<ReturnType<typeof client.history>>["items"] = [];
        let cursor: string | undefined;
        do {
          const page = await client.history(taskId, cursor);
          items.push(...page.items);
          cursor = page.next_cursor ?? undefined;
        } while (cursor);
        const rebuilt = historyToTask(existing, items, historyLabels);
        upsert(rebuilt);
        const controller = new AbortController();
        controllersRef.current.add(controller);
        await runStream(taskId, rebuilt, controller);
      } catch {
        upsert({ ...existing, status: "failed" });
      }
    },
    [runs, historyLabels, upsert, runStream],
  );

  const value = useMemo<TaskRunContextValue>(
    () => ({
      runs: order.map((id) => runs[id]).filter(Boolean) as Task[],
      getRun: (id) => runs[id],
      startTask,
      answer,
      attach,
    }),
    [order, runs, startTask, answer, attach],
  );

  return <TaskRunContext.Provider value={value}>{children}</TaskRunContext.Provider>;
}

function useTaskRunContext(): TaskRunContextValue {
  const ctx = useContext(TaskRunContext);
  if (!ctx) throw new Error("TaskRun hooks require <TaskRunProvider>");
  return ctx;
}

export function useTaskRuns(): Task[] {
  return useTaskRunContext().runs;
}

export function useTaskRun(id: string | undefined): Task | undefined {
  const { getRun } = useTaskRunContext();
  return id ? getRun(id) : undefined;
}

export function useStartTask(): (directive: string) => Promise<string> {
  return useTaskRunContext().startTask;
}

export function useAnswerTask(): (taskId: string, text: string) => Promise<void> {
  return useTaskRunContext().answer;
}

export function useAttachTask(): (taskId: string) => Promise<void> {
  return useTaskRunContext().attach;
}
