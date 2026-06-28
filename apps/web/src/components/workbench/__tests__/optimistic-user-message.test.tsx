/**
 * A6 — Optimistic user message rendered immediately on send.
 *
 * Verifies:
 *   1. After a follow-up is sent, the user bubble appears in WorkbenchChat
 *      immediately (before any /history round-trip), driven by the provider upsert.
 *   2. After startTask (first message), the optimistic user bubble is present in
 *      the provider run right away — before any /history is fetched.
 *   3. After a subsequent /history projection, exactly ONE matching user bubble
 *      is present (the clientId dedupe in reconcileOrAppend holds).
 *   6. (E2E render guard) After sendFollowUp, the text is queryable in the DOM
 *      immediately through the real provider→useTaskRun→WorkbenchChat path — this
 *      test FAILS if the optimistic upsert in sendFollowUp is removed.
 */
import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEffect } from "react";
import type { PraxisTaskClient } from "@/lib/praxis/client";
import type { StreamEvent } from "@/lib/praxis/runtime-events";
import { TaskRunProvider, useSendFollowUp, useSeedTask, useStartTask, useTaskRun } from "../task-run-provider";
import type { Task } from "@ash/shared";
import { textOf } from "@ash/shared";
import { NextIntlClientProvider } from "next-intl";
import { WorkbenchChat } from "../chat/workbench-chat";
import type { Conversation } from "@ash/shared";

// The provider captures getPraxisClient() once via useRef; swap in a per-test client.
let mockClient: PraxisTaskClient;
vi.mock("@/lib/praxis/client", () => ({
  getPraxisClient: () => mockClient,
}));

const i18nMessages = {
  Workbench: {
    textareaAria: "compose-input",
    send: "Send",
    cancelTask: "Cancel",
    thinkingPlaceholder: "Thinking…",
    emptyChatTitle: "No messages",
    emptyChatBody: "",
    expandWorkbenchAria: "expand",
    collapseWorkbenchAria: "collapse",
    expandWorkbenchTooltip: "expand",
    collapseWorkbenchTooltip: "collapse",
    copyMessage: "Copy",
    copiedMessage: "Copied",
  },
};

function makeBaseClient(overrides: Partial<PraxisTaskClient> = {}): PraxisTaskClient {
  return {
    async createTask(req) {
      return { id: "t1", title: req.title ?? null, status: "draft" };
    },
    async startTask(id) {
      return { id, status: "running" };
    },
    async listTasks() {
      return { items: [], next_cursor: null };
    },
    async listSkills() {
      return { items: [], next_cursor: null };
    },
    async getTask(id) {
      return { id, status: "draft" };
    },
    async *streamEvents(): AsyncIterable<StreamEvent> {
      // empty stream: resolves immediately
    },
    async sendMessage() {},
    async answer() {},
    async history() {
      return { items: [] };
    },
    async complete() {},
    async cancel() {},
    ...overrides,
  };
}

const seededTask: Task = {
  id: "t1",
  title: "Test task",
  description: "",
  status: "completed" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  messages: [],
  deliverables: [],
  toolTraces: [],
};

const providerWrapper = ({ children }: { children: React.ReactNode }) => (
  <TaskRunProvider>{children}</TaskRunProvider>
);

// ─────────────────────────────────────────────────────────────
// 1. Follow-up: optimistic bubble visible from the provider run
// ─────────────────────────────────────────────────────────────
describe("A6 — follow-up optimistic user message", () => {
  beforeEach(() => {
    mockClient = makeBaseClient();
  });

  it("appears in the provider run immediately after sendFollowUp, before /history", async () => {
    const { result } = renderHook(
      () => ({
        seed: useSeedTask(),
        send: useSendFollowUp(),
        run: useTaskRun("t1"),
      }),
      { wrapper: providerWrapper },
    );

    // Seed an existing completed task so the provider knows about it.
    act(() => {
      result.current.seed(seededTask);
    });

    // Send a follow-up without waiting for /history.
    await act(async () => {
      await result.current.send("t1", "做一页摘要");
    });

    const msgs = result.current.run?.messages ?? [];
    // The optimistic user bubble must be present right away.
    expect(msgs.some((m) => m.role === "user" && textOf(m) === "做一页摘要")).toBe(true);
  });

  it("no duplicate after /history reconciles the persisted message (clientId dedupe)", async () => {
    // /history returns the server-persisted version of the follow-up message.
    mockClient = makeBaseClient({
      async history() {
        return {
          items: [
            {
              id: "server-msg-1",
              task_id: "t1",
              seq: 1,
              role: "user" as const,
              created_at: "2026-01-01T00:00:01.000Z",
              content: [{ type: "text" as const, data: { text: "做一页摘要" } }],
            },
          ],
        };
      },
    });

    const { result } = renderHook(
      () => ({
        seed: useSeedTask(),
        send: useSendFollowUp(),
        run: useTaskRun("t1"),
      }),
      { wrapper: providerWrapper },
    );

    act(() => {
      result.current.seed(seededTask);
    });

    // Send the follow-up — adds optimistic bubble with clientId.
    await act(async () => {
      await result.current.send("t1", "做一页摘要");
    });

    // At this point: optimistic bubble is present.
    const afterSend = result.current.run?.messages ?? [];
    expect(afterSend.filter((m) => m.role === "user" && textOf(m) === "做一页摘要")).toHaveLength(1);

    // Simulate the /history reconcile that happens during re-attach.
    // Import historyToTask directly to test dedup without needing network.
    const { historyToTask } = await import("@/lib/praxis/history-projection");
    const labels = {
      deckFallbackTitle: "Deck",
      deckPreview: "Preview",
      askFallbackText: "Answer",
    };
    const currentRun = result.current.run!;
    const historyItems = [
      {
        id: "server-msg-1",
        task_id: "t1",
        seq: 1,
        role: "user" as const,
        created_at: "2026-01-01T00:00:01.000Z",
        content: [{ type: "text" as const, data: { text: "做一页摘要" } }],
      },
    ];
    const rebuilt = historyToTask(currentRun, historyItems, labels);

    // After reconciliation: still exactly ONE user bubble with this text.
    const afterHistory = rebuilt.messages.filter(
      (m) => m.role === "user" && textOf(m) === "做一页摘要",
    );
    expect(afterHistory).toHaveLength(1);
    // clientId is dropped after reconciliation (it was matched and consumed).
    expect(afterHistory[0]!.clientId).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// 2. First-start: optimistic bubble visible immediately after startTask
// ─────────────────────────────────────────────────────────────
describe("A6 — first-start optimistic user message", () => {
  beforeEach(() => {
    mockClient = makeBaseClient();
  });

  it("appears in the provider run immediately after startTask, before any /history", async () => {
    const { result } = renderHook(
      () => ({
        start: useStartTask(),
        run: useTaskRun("t1"),
      }),
      { wrapper: providerWrapper },
    );

    await act(async () => {
      await result.current.start("给我做个PPT");
    });

    const msgs = result.current.run?.messages ?? [];
    // The seeded first message (optimistic user bubble) must be visible immediately.
    expect(msgs.some((m) => m.role === "user" && textOf(m) === "给我做个PPT")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// 3. WorkbenchChat renders the optimistic bubble via active.messages
// ─────────────────────────────────────────────────────────────
describe("A6 — WorkbenchChat renders optimistic user message from active prop", () => {
  const workspace = { collapsed: false, onToggle: vi.fn() };

  function makeActive(msgs: Conversation["messages"]): Conversation {
    return {
      id: "t1",
      title: "Test",
      preview: "",
      updatedAt: "t",
      status: "running" as const,
      messages: msgs,
      plan: [],
      toolTraces: [],
      artifacts: [],
    };
  }

  it("renders a user message that is already in active.messages", () => {
    render(
      <NextIntlClientProvider locale="zh" messages={i18nMessages}>
        <WorkbenchChat
          locale="zh"
          active={makeActive([
            {
              id: "opt-1",
              role: "user",
              blocks: [{ kind: "text", text: "做一页摘要" }],
              createdAt: "2026-01-01T00:00:00.000Z",
              clientId: "opt-1",
            },
          ])}
          workspace={workspace}
          onFollowUp={async () => {}}
        />
      </NextIntlClientProvider>,
    );
    // The optimistic user bubble must be rendered.
    expect(screen.getByText("做一页摘要")).toBeTruthy();
  });

  it("renders the updated message list when active.messages changes (re-render)", () => {
    const onFollowUp = vi.fn(async () => {});
    const { rerender } = render(
      <NextIntlClientProvider locale="zh" messages={i18nMessages}>
        <WorkbenchChat
          locale="zh"
          active={makeActive([])}
          workspace={workspace}
          onFollowUp={onFollowUp}
        />
      </NextIntlClientProvider>,
    );

    // Initially no messages — empty state shown.
    expect(screen.queryByText("做一页摘要")).toBeNull();

    // Simulate the provider upsert propagating: re-render WorkbenchChat with
    // the optimistic message now in active.messages.
    rerender(
      <NextIntlClientProvider locale="zh" messages={i18nMessages}>
        <WorkbenchChat
          locale="zh"
          active={makeActive([
            {
              id: "opt-1",
              role: "user",
              blocks: [{ kind: "text", text: "做一页摘要" }],
              createdAt: "2026-01-01T00:00:00.000Z",
              clientId: "opt-1",
            },
          ])}
          workspace={workspace}
          onFollowUp={onFollowUp}
        />
      </NextIntlClientProvider>,
    );

    // After the provider upsert propagates (modelled as a rerender here),
    // the optimistic user bubble must appear without any /history round-trip.
    expect(screen.getByText("做一页摘要")).toBeTruthy();
  });

  it("does NOT append to extraMessages when onFollowUp is provided (no double render)", () => {
    // When onFollowUp is provided, sendDraft must delegate to the provider
    // and NOT also append to extraMessages (which would cause a duplicate once
    // active.messages updates from the provider).
    const onFollowUp = vi.fn(async () => {});
    render(
      <NextIntlClientProvider locale="zh" messages={i18nMessages}>
        <WorkbenchChat
          locale="zh"
          active={makeActive([])}
          workspace={workspace}
          onFollowUp={onFollowUp}
        />
      </NextIntlClientProvider>,
    );

    const textarea = screen.getByLabelText("compose-input");
    fireEvent.change(textarea, { target: { value: "做一页摘要" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    // onFollowUp must have been called (message delegated to provider).
    expect(onFollowUp).toHaveBeenCalledWith("做一页摘要");

    // No local extraMessages append: the message text must NOT appear in the
    // rendered chat yet (only appears once active.messages updates).
    // This confirms the routing is correct: no double-append.
    expect(screen.queryByText("做一页摘要")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// 6. E2E render guard: provider → useTaskRun → WorkbenchChat DOM
//
// This is the genuine end-to-end path that was missing.  It mounts the real
// provider and a harness that wires useTaskRun → WorkbenchChat exactly as
// workbench-app.tsx does (liveTask = useTaskRun(id) ?? initial), then drives
// a follow-up via the UI and asserts the text is in the DOM immediately.
//
// Anti-tautology: if upsert(next) were removed from sendFollowUp in
// task-run-provider.tsx, useTaskRun("t1") would still return the old task
// (messages unchanged), WorkbenchChat would receive the old active.messages,
// and screen.getByText("做一页摘要") would throw — so this test WOULD FAIL.
// ─────────────────────────────────────────────────────────────

/**
 * Minimal harness that mirrors the workbench-app.tsx wiring:
 *   liveTask = useTaskRun(taskId) ?? initialTask
 *   <WorkbenchChat active={{ messages: liveTask.messages, ... }}
 *                  onFollowUp={text => sendFollowUp(taskId, text)} />
 *
 * Seeding happens inside the component (once, on mount) so the provider is
 * already populated before the first render and useTaskRun returns the task.
 */
function LiveChatHarness({ initialTask }: { initialTask: Task }) {
  const seed = useSeedTask();
  const sendFollowUp = useSendFollowUp();
  // Mirror workbench-app line 60: useTaskRun(id) ?? activeTask
  const liveTask = useTaskRun(initialTask.id) ?? initialTask;

  useEffect(() => {
    seed(initialTask);
    // Only runs once on mount; initialTask is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active: Conversation = {
    id: liveTask.id,
    title: liveTask.title ?? "Test task",
    preview: liveTask.description,
    updatedAt: liveTask.updatedAt,
    // Cast: Task.status is a superset; Conversation.status is a union subset.
    status: liveTask.status as Conversation["status"],
    messages: liveTask.messages,
    plan: [],
    toolTraces: liveTask.toolTraces,
    artifacts: [],
  };

  return (
    <WorkbenchChat
      locale="zh"
      active={active}
      workspace={{ collapsed: false, onToggle: vi.fn() }}
      onFollowUp={(text) => sendFollowUp(liveTask.id, text)}
    />
  );
}

describe("A6 — E2E render guard: provider optimistic upsert drives WorkbenchChat DOM", () => {
  beforeEach(() => {
    mockClient = makeBaseClient();
  });

  it("renders the user message in the DOM immediately after sendFollowUp, driven by the real provider upsert", async () => {
    // seededTask.status is "completed" (terminal) so useReattachOnView no-ops —
    // no /history call is issued.  The guard is purely: does the optimistic
    // upsert in sendFollowUp flow through useTaskRun into the rendered chat?
    render(
      <NextIntlClientProvider locale="zh" messages={i18nMessages}>
        <TaskRunProvider>
          <LiveChatHarness initialTask={seededTask} />
        </TaskRunProvider>
      </NextIntlClientProvider>,
    );

    // The chat starts with zero messages (seededTask.messages is empty).
    expect(screen.queryByText("做一页摘要")).toBeNull();

    // Type the follow-up message and submit via Enter — this calls
    // WorkbenchChat's sendDraft → onFollowUp → provider.sendFollowUp →
    // upsert(next) which writes the optimistic bubble into runs["t1"] →
    // context update → useTaskRun("t1") returns updated task →
    // WorkbenchChat re-renders with new active.messages containing the bubble.
    const textarea = screen.getByLabelText("compose-input");
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "做一页摘要" } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    });

    // The optimistic user bubble must be visible in the DOM immediately —
    // no /history round-trip has occurred (mock client sendMessage is a no-op).
    // If upsert(next) were removed from sendFollowUp, this assertion would fail.
    expect(screen.getByText("做一页摘要")).toBeTruthy();
  });
});
