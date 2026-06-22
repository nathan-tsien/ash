/**
 * A4/A5 — "Agent thinking" indicator visibility tests.
 *
 * Verifies that the running/thinking placeholder:
 *   1. Disappears when the task transitions to a terminal status (completed, failed, idle/cancelled).
 *   2. Disappears when the task is in awaiting_input (agent is paused waiting for user input).
 *   3. Does NOT appear while an assistant message is actively streaming visible content
 *      (i.e. has a non-empty text block and isStreaming=true), so it doesn't look stuck
 *      below live streamed text.
 *   4. Appears when running with no streaming assistant message (the initial "thinking" phase).
 *   5. Appears when pending (A5: task started but agent hasn't streamed yet).
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import type { Conversation, Message } from "@ash/shared";

import { WorkbenchChat } from "../workbench-chat";

const i18nMessages = {
  Workbench: {
    thinkingPlaceholder: "Ash is working…",
    textareaAria: "compose-input",
    send: "Send",
  },
};

const wrap = (ui: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={i18nMessages}>
    {ui}
  </NextIntlClientProvider>
);

const workspace = { collapsed: false, onToggle: () => {} };

function makeConversation(
  status: Conversation["status"],
  messages: Message[] = [],
): Conversation {
  return {
    id: "task-1",
    title: "Test task",
    preview: "",
    updatedAt: "2026-01-01T00:00:00.000Z",
    status,
    messages,
    plan: [],
    toolTraces: [],
    artifacts: [],
  };
}

/** An assistant message that is actively streaming (has content, isStreaming=true). */
const streamingAssistantMessage: Message = {
  id: "msg-1",
  role: "assistant",
  blocks: [{ kind: "text", text: "Here is the plan…" }],
  createdAt: "2026-01-01T00:00:00.000Z",
  isStreaming: true,
};

/** An assistant message whose stream has finished (isStreaming=false). */
const finishedAssistantMessage: Message = {
  id: "msg-1",
  role: "assistant",
  blocks: [{ kind: "text", text: "Here is the plan…" }],
  createdAt: "2026-01-01T00:00:00.000Z",
  isStreaming: false,
};

/** An assistant message that is streaming but has only empty/no text yet (pre-content phase). */
const streamingAssistantMessageEmpty: Message = {
  id: "msg-2",
  role: "assistant",
  blocks: [{ kind: "text", text: "" }],
  createdAt: "2026-01-01T00:00:00.000Z",
  isStreaming: true,
};

describe("Thinking indicator — terminal transitions", () => {
  it("hides indicator when status is 'completed' (terminal)", () => {
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("completed", [finishedAssistantMessage])}
          workspace={workspace}
        />,
      ),
    );
    // The indicator must NOT be in the document for a completed task.
    expect(screen.queryByText("Ash is working…")).toBeNull();
  });

  it("hides indicator when status is 'failed' (terminal)", () => {
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("failed", [])}
          workspace={workspace}
        />,
      ),
    );
    expect(screen.queryByText("Ash is working…")).toBeNull();
  });

  it("hides indicator when status is 'cancelled' (maps to idle — non-terminal run)", () => {
    // mapTaskStatus collapses cancelled -> 'idle'; the indicator must be absent.
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("idle", [])}
          workspace={workspace}
        />,
      ),
    );
    expect(screen.queryByText("Ash is working…")).toBeNull();
  });
});

describe("Thinking indicator — awaiting_input transition", () => {
  it("hides indicator when status is 'awaiting_input' (agent is paused waiting for user)", () => {
    // awaiting_input: the agent is paused; no thinking indicator should appear.
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("awaiting_input", [finishedAssistantMessage])}
          workspace={workspace}
        />,
      ),
    );
    expect(screen.queryByText("Ash is working…")).toBeNull();
  });

  it("hides indicator when status is 'idle' (cancelled or unknown — non-actionable terminal)", () => {
    // 'idle' is the fallback for cancelled tasks and unknown statuses.
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("idle", [])}
          workspace={workspace}
        />,
      ),
    );
    expect(screen.queryByText("Ash is working…")).toBeNull();
  });
});

describe("Thinking indicator — streaming content visibility", () => {
  it("hides indicator while an assistant message with visible content is streaming (BUG: was shown)", () => {
    // The bug: the indicator showed below live streaming text, looking stuck.
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("running", [streamingAssistantMessage])}
          workspace={workspace}
        />,
      ),
    );
    // Once real content is streaming, the indicator must yield — it must NOT be visible.
    expect(screen.queryByText("Ash is working…")).toBeNull();
  });

  it("shows indicator when running and no assistant message has visible streaming content yet", () => {
    // The pre-content phase: status=running, no messages yet — indicator should appear.
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("running", [])}
          workspace={workspace}
        />,
      ),
    );
    expect(screen.getByText("Ash is working…")).toBeTruthy();
  });

  it("shows indicator when running and the streaming message has only empty text so far", () => {
    // message_start arrives before content_block_delta: text is "".
    // Indicator should still be visible (no visible content yet).
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("running", [streamingAssistantMessageEmpty])}
          workspace={workspace}
        />,
      ),
    );
    expect(screen.getByText("Ash is working…")).toBeTruthy();
  });

  it("shows indicator when running with a finished message (between-turn gap — waiting for next turn)", () => {
    // After message_stop, isStreaming=false. Between turns the indicator reappears
    // because running + no active streaming content = pre-content gap for the next turn.
    // This is correct: the indicator shows while waiting, not when content is flowing.
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("running", [finishedAssistantMessage])}
          workspace={workspace}
        />,
      ),
    );
    // Between turns: running + finished messages → indicator should show (waiting for next turn).
    expect(screen.getByText("Ash is working…")).toBeTruthy();
  });
});

describe("Thinking indicator — pending status (A5)", () => {
  it("shows indicator when status is 'pending' (task started, agent not yet streaming)", () => {
    // A5 fix: pending was previously mapped to idle, causing no indicator.
    // After the fix, pending shows the indicator (same as the initial running gap).
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("pending", [])}
          workspace={workspace}
        />,
      ),
    );
    expect(screen.getByText("Ash is working…")).toBeTruthy();
  });

  it("hides indicator when status is 'pending' but content is already streaming", () => {
    // Edge case: if somehow content arrives while still technically pending.
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("pending", [streamingAssistantMessage])}
          workspace={workspace}
        />,
      ),
    );
    expect(screen.queryByText("Ash is working…")).toBeNull();
  });
});
