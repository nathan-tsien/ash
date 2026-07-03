/**
 * A4/A5 — "Agent thinking" indicator visibility tests.
 *
 * Verifies that the working placeholder:
 *   1. Appears during active pending/running gaps before an assistant message starts.
 *   2. Also appears when a live assistant message exists but has no visible content yet.
 *   3. Does NOT appear while an assistant message is actively streaming visible content
 *      (i.e. has a visible block and isStreaming=true), so it doesn't look stuck
 *      below live streamed text.
 *   4. Disappears for terminal, idle, and awaiting-input states.
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

/** A streaming assistant message that already renders a tool chip in chat. */
const streamingAssistantToolMessage: Message = {
  id: "msg-3",
  role: "assistant",
  blocks: [{ kind: "tool_use", callId: "call-1", toolName: "search", args: {} }],
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

  it("shows indicator when running and no assistant message has started yet", () => {
    // Active task gap: the user submitted work, but message_start has not arrived yet.
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

  it("shows indicator when an assistant stream has only empty text so far", () => {
    // message_start arrives before content_block_delta: text is "".
    // Indicator should still be visible (no visible content yet).
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("idle", [streamingAssistantMessageEmpty])}
          workspace={workspace}
        />,
      ),
    );
    expect(screen.getByText("Ash is working…")).toBeTruthy();
  });

  it("shows indicator when running with only a finished assistant message", () => {
    // After a follow-up submit, the prior assistant message may be finished while
    // the next assistant message has not emitted message_start yet.
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("running", [finishedAssistantMessage])}
          workspace={workspace}
        />,
      ),
    );
    expect(screen.getByText("Ash is working…")).toBeTruthy();
  });

  it("hides indicator when the streaming assistant message already has a visible tool chip", () => {
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("running", [streamingAssistantToolMessage])}
          workspace={workspace}
        />,
      ),
    );
    expect(screen.queryByText("Ash is working…")).toBeNull();
  });
});

describe("Thinking indicator — pending status", () => {
  it("shows indicator when status is 'pending' (task started, agent not yet streaming)", () => {
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
