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
import { getPraxisClient } from "@/lib/praxis/client";
import { initialTaskRunState, runtimeEventReducer } from "@/lib/praxis/runtime-event-reducer";

interface TaskRunContextValue {
  /** Session runs, newest first. */
  runs: Task[];
  getRun(id: string): Task | undefined;
  /** Create + start a task, returning its id. Streaming updates land async. */
  startTask(directive: string): Promise<string>;
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
        let state = initialTaskRunState({ ...seeded, status: "running" });
        try {
          await client.startTask(summary.id, directive);
          upsert(state.task);
          for await (const event of client.streamEvents(summary.id, controller.signal)) {
            state = runtimeEventReducer(state, event, Date.now());
            upsert(state.task);
          }
          // One-shot task: settle the praxis FSM (paused -> completed) and release
          // the session. Fake client no-ops; real client POSTs /complete.
          await client.complete(summary.id);
        } catch {
          upsert({ ...state.task, status: "failed" });
        } finally {
          controllersRef.current.delete(controller);
        }
      })();

      return summary.id;
    },
    [upsert],
  );

  const value = useMemo<TaskRunContextValue>(
    () => ({
      runs: order.map((id) => runs[id]).filter(Boolean) as Task[],
      getRun: (id) => runs[id],
      startTask,
    }),
    [order, runs, startTask],
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
