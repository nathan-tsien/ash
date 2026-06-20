"use client";

import type { Message, Task } from "@ash/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { getPraxisClient } from "@/lib/praxis/client";
import { PraxisError } from "@/lib/praxis/errors";
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
  startTask(directive: string, skillHints?: string[]): Promise<string>;
  /** Answer the live pending question on a task (praxis ask_user). */
  answer(taskId: string, text: string): Promise<void>;
  /** Re-attach a task's stream: catch up via /history, then re-subscribe. */
  attach(taskId: string): Promise<void>;
  /** Seed a task fetched on the server (deep-link cold load) into session state. */
  seedTask(task: Task): void;
  /** Cancel a non-terminal task (praxis POST /cancel) and abort its stream. */
  cancelTask(taskId: string): Promise<void>;
  /** Send a free follow-up message into an existing task, then stream the reply. */
  sendFollowUp(taskId: string, text: string): Promise<void>;
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
  // Live stream AbortControllers keyed by taskId. At most one stream per task is
  // ever active (guarded by activeStreamsRef), so a taskId-keyed map lets cancel
  // abort exactly one task's stream instead of every open stream.
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  // Task ids with a currently-live stream. Set when a stream starts (startTask /
  // attach), cleared when its loop ends (runStream's finally). Lets `attach`
  // avoid double-subscribing a task whose stream is still open.
  const activeStreamsRef = useRef<Set<string>>(new Set());
  // Latest `runs` mirrored into a ref so answer/attach can read the current task
  // without listing `runs` in their deps — keeping their identity stable so the
  // navigate-back effect (useReattachOnView) does not re-fire on every upsert.
  // (A task is always committed to `runs` before its view mounts, so the ref is
  // current by the time attach/answer read it.)
  const runsRef = useRef(runs);

  // App-authored runtime copy, resolved from i18n catalogs (IMPL-3) and passed
  // into the (pure) reducer. A run captures the locale active at its start;
  // switching locale mid-stream does not retranslate an in-flight run.
  const t = useTranslations("Workbench");
  const labels = useMemo<ReducerLabels>(
    () => ({
      deckFallbackTitle: t("runtimeDeckFallbackTitle"),
      deckPreview: t("runtimeDeckPreview"),
      failureNotice: (reason: string) => t("runtimeFailureNotice", { reason }),
      truncationNotice: t("runtimeTruncationNotice"),
      askFallbackText: t("runtimeAskFallback"),
    }),
    [t],
  );
  const historyLabels = useMemo<HistoryLabels>(
    () => ({
      deckFallbackTitle: t("runtimeDeckFallbackTitle"),
      deckPreview: t("runtimeDeckPreview"),
      askFallbackText: t("runtimeAskFallback"),
    }),
    [t],
  );

  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      for (const controller of controllers.values()) controller.abort();
      controllers.clear();
    };
  }, []);

  // Mirror runs into the ref via useLayoutEffect so it is always current before
  // any useEffect fires in child components.  useLayoutEffect runs synchronously
  // after the DOM is committed and before browser paint — crucially, it runs
  // before children's useEffect callbacks, ensuring runsRef is up-to-date by the
  // time useReattachOnView (or any other consumer effect) reads it.
  useLayoutEffect(() => {
    runsRef.current = runs;
  }, [runs]);

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
        // Only clear the controller if it is still the one registered for this
        // task — a cancel may have already replaced/removed it.
        if (controllersRef.current.get(taskId) === controller) {
          controllersRef.current.delete(taskId);
        }
        activeStreamsRef.current.delete(taskId);
      }
    },
    [labels, upsert],
  );

  const startTask = useCallback(
    async (directive: string, skillHints?: string[]): Promise<string> => {
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
          {
            id: `user-${summary.id}`,
            role: "user",
            blocks: [{ kind: "text", text: directive }],
            createdAt: startedAt,
            // Correlation key so the persisted first user_message reconciles this
            // optimistic bubble in place instead of appending a duplicate.
            clientId: `user-${summary.id}`,
          },
        ],
        artifacts: [],
        toolTraces: [],
      };
      upsert(seeded);
      setOrder((prev) => [summary.id, ...prev.filter((x) => x !== summary.id)]);

      const controller = new AbortController();
      controllersRef.current.set(summary.id, controller);
      // Mark active synchronously, before navigation can mount the task view and
      // trigger a re-attach — the guard there must see the live stream.
      activeStreamsRef.current.add(summary.id);
      void (async () => {
        try {
          await clientRef.current.startTask(summary.id, directive, skillHints);
          upsert({ ...seeded, status: "running" });
          await runStream(summary.id, { ...seeded, status: "running" }, controller);
        } catch {
          // startTask failed before runStream took over cleanup.
          if (controllersRef.current.get(summary.id) === controller) {
            controllersRef.current.delete(summary.id);
          }
          activeStreamsRef.current.delete(summary.id);
          if (!controller.signal.aborted) upsert({ ...seeded, status: "failed" });
        }
      })();

      return summary.id;
    },
    [upsert, runStream],
  );

  const answer = useCallback(
    async (taskId: string, text: string): Promise<void> => {
      const current = runsRef.current[taskId];
      const askId = current?.pendingQuestion?.askId;
      if (!askId) return; // no live question (or recovered read-only); nothing to send
      // Optimistic: clear the prompt and show running; the live turn_resumed confirms.
      const { pendingQuestion: _omit, ...rest } = current;
      upsert({ ...rest, status: "running" });
      try {
        await clientRef.current.answer(taskId, askId, text);
      } catch (err) {
        const status = err instanceof PraxisError ? err.status : 0;
        if (status === 409) return; // already resolved server-side: keep cleared, trust the stream
        if (status === 404) {
          upsert({ ...rest, status: "failed" }); // unanswerable: surface as failure
          return;
        }
        upsert(current); // transient/unknown error: restore the question so the user can retry
      }
    },
    [upsert],
  );

  // Re-attach a task's stream: catch up via /history, then re-subscribe. Guarded
  // so it is safe to call on every task-view mount (the navigate-back trigger):
  // it no-ops for unknown/terminal tasks and for tasks whose stream is still live,
  // acting only when a non-terminal stream has actually ended (e.g. a drop, or a
  // task left awaiting input whose connection closed).
  const attach = useCallback(
    async (taskId: string): Promise<void> => {
      const client = clientRef.current;
      const existing = runsRef.current[taskId];
      if (!existing) return; // not a live session run
      if (existing.status === "completed" || existing.status === "failed") return; // terminal
      if (activeStreamsRef.current.has(taskId)) return; // a stream is already running
      activeStreamsRef.current.add(taskId);
      const controller = new AbortController();
      controllersRef.current.set(taskId, controller);
      try {
        const items: Awaited<ReturnType<typeof client.history>>["items"] = [];
        let cursor: number | undefined;
        do {
          const page = await client.history(taskId, cursor);
          items.push(...page.items);
          cursor = page.next_before_seq ?? undefined;
        } while (cursor);
        const rebuilt = historyToTask(existing, items, historyLabels);
        upsert(rebuilt);
        await runStream(taskId, rebuilt, controller); // its finally clears active + controller
      } catch {
        // History fetch failed before runStream took over cleanup.
        if (controllersRef.current.get(taskId) === controller) {
          controllersRef.current.delete(taskId);
        }
        activeStreamsRef.current.delete(taskId);
        upsert({ ...existing, status: "failed" });
      }
    },
    [historyLabels, upsert, runStream],
  );

  // Seed a server-fetched task into session state for deep-link cold loads.
  // Upserts without clobbering an already-present live run (first write wins).
  const seedTask = useCallback((task: Task) => {
    setRuns((prev) => (prev[task.id] ? prev : { ...prev, [task.id]: task }));
    setOrder((prev) => (prev.includes(task.id) ? prev : [task.id, ...prev]));
  }, []);

  // Cancel a non-terminal task: POST /cancel to praxis, abort the live stream
  // controller (if any), then flip the local status to failed so the UI reflects
  // termination immediately — the stream's finally block will no-op on abort.
  const cancelTask = useCallback(async (taskId: string) => {
    await clientRef.current.cancel(taskId);
    // Abort only THIS task's live stream (if any). Other tasks' streams keep
    // running. runStream's finally no-ops on an already-removed entry.
    const controller = controllersRef.current.get(taskId);
    if (controller) {
      controller.abort();
      controllersRef.current.delete(taskId);
    }
    activeStreamsRef.current.delete(taskId);
    setRuns((prev) =>
      prev[taskId] ? { ...prev, [taskId]: { ...prev[taskId], status: "failed" } } : prev,
    );
  }, []);

  // Send a free follow-up message into an existing task. Optimistically appends
  // the user message to the task's messages and flips status to running, calls
  // client.sendMessage, then re-subscribes to the live stream for the assistant
  // turn using the same AbortController/activeStreams bookkeeping as startTask.
  const sendFollowUp = useCallback(
    async (taskId: string, text: string): Promise<void> => {
      const cur = runsRef.current[taskId];
      if (!cur) return;
      const msg: Message = {
        id: `local-${taskId}-${cur.messages.length}`,
        role: "user",
        blocks: [{ kind: "text", text }],
        createdAt: new Date().toISOString(),
        // Correlation key so the persisted follow-up user_message reconciles this
        // optimistic bubble in place instead of appending a duplicate.
        clientId: `local-${taskId}-${cur.messages.length}`,
      };
      const next: Task = { ...cur, status: "running" as const, messages: [...cur.messages, msg] };
      upsert(next);
      await clientRef.current.sendMessage(taskId, text);
      // Re-subscribe for the assistant turn; mirror startTask's controller lifecycle
      // so controllers and activeStreams are properly tracked and cleaned up.
      if (activeStreamsRef.current.has(taskId)) return; // already streaming, bail
      const controller = new AbortController();
      controllersRef.current.set(taskId, controller);
      activeStreamsRef.current.add(taskId);
      void (async () => {
        try {
          await runStream(taskId, next, controller);
        } catch {
          // runStream itself handles cleanup in finally; this catch is a safety net.
          if (controllersRef.current.get(taskId) === controller) {
            controllersRef.current.delete(taskId);
          }
          activeStreamsRef.current.delete(taskId);
        }
      })();
    },
    [upsert, runStream],
  );

  const value = useMemo<TaskRunContextValue>(
    () => ({
      runs: order.map((id) => runs[id]).filter(Boolean) as Task[],
      getRun: (id) => runs[id],
      startTask,
      answer,
      attach,
      seedTask,
      cancelTask,
      sendFollowUp,
    }),
    [order, runs, startTask, answer, attach, seedTask, cancelTask, sendFollowUp],
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

export function useStartTask(): (directive: string, skillHints?: string[]) => Promise<string> {
  return useTaskRunContext().startTask;
}

export function useAnswerTask(): (taskId: string, text: string) => Promise<void> {
  return useTaskRunContext().answer;
}

export function useAttachTask(): (taskId: string) => Promise<void> {
  return useTaskRunContext().attach;
}

/**
 * Re-attach a task's stream when its detail view is (re)opened — the navigate-back
 * trigger. Fires whenever `taskId` changes or the run first becomes present in the
 * provider (covering the deep-link cold-load case where a seeder and this hook mount
 * together). `attach` is internally guarded, so it no-ops for unknown/terminal tasks
 * and ones already streaming. On a task left awaiting input whose stream has since
 * closed, this catches up via `/history` and re-subscribes, recovering the live
 * `ask_id`. Pass `undefined` to disable (e.g. when not on a task view).
 */
export function useReattachOnView(taskId: string | undefined): void {
  const { attach, getRun } = useTaskRunContext();
  const present = taskId ? Boolean(getRun(taskId)) : false;
  useEffect(() => {
    if (taskId && present) void attach(taskId);
  }, [taskId, present, attach]);
}

/**
 * Returns the `seedTask` function for seeding a server-fetched task into the
 * provider on deep-link cold loads. Must be used within a TaskRunProvider.
 */
export function useSeedTask(): (task: Task) => void {
  const ctx = useContext(TaskRunContext);
  if (!ctx) throw new Error("useSeedTask must be used within TaskRunProvider");
  return ctx.seedTask;
}

/**
 * Returns the `cancelTask` function to cancel a non-terminal task via praxis
 * and immediately reflect the terminal state in the UI.
 */
export function useCancelTask(): (taskId: string) => Promise<void> {
  return useTaskRunContext().cancelTask;
}

/**
 * Returns the `sendFollowUp` function to post a free-form follow-up message
 * into an existing task (including completed ones) and stream the assistant reply.
 * The user message is optimistically appended to the task's messages in the provider.
 */
export function useSendFollowUp(): (taskId: string, text: string) => Promise<void> {
  return useTaskRunContext().sendFollowUp;
}
