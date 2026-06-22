/**
 * A5 — Stop/cancel button visibility and behaviour tests.
 *
 * Verifies that:
 *   1. While a task is "pending" the Stop button is visible and clickable.
 *   2. While a task is "running" the Stop button is visible and clickable.
 *   3. Clicking Stop invokes the onCancel handler.
 *   4. After a terminal transition (completed, failed, idle) the Stop button is gone.
 *   5. The Stop button is also visible when the task is "awaiting_input".
 *   6. No Stop button when onCancel is not provided (project views etc.).
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import type { Conversation } from "@ash/shared";

import { WorkbenchChat } from "../workbench-chat";

const i18nMessages = {
  Workbench: {
    cancelTask: "Stop",
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

function makeConversation(status: Conversation["status"]): Conversation {
  return {
    id: "task-1",
    title: "Test task",
    preview: "",
    updatedAt: "2026-01-01T00:00:00.000Z",
    status,
    messages: [],
    plan: [],
    toolTraces: [],
    artifacts: [],
  };
}

describe("Stop button — visibility during non-terminal states", () => {
  it("shows Stop button when status is 'pending' (A5: was missing before the fix)", () => {
    const onCancel = vi.fn();
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("pending")}
          workspace={workspace}
          onCancel={onCancel}
        />,
      ),
    );
    expect(screen.getByText("Stop")).toBeTruthy();
  });

  it("shows Stop button when status is 'running'", () => {
    const onCancel = vi.fn();
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("running")}
          workspace={workspace}
          onCancel={onCancel}
        />,
      ),
    );
    expect(screen.getByText("Stop")).toBeTruthy();
  });

  it("shows Stop button when status is 'awaiting_input'", () => {
    const onCancel = vi.fn();
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("awaiting_input")}
          workspace={workspace}
          onCancel={onCancel}
        />,
      ),
    );
    expect(screen.getByText("Stop")).toBeTruthy();
  });
});

describe("Stop button — clicking invokes onCancel", () => {
  it("calls onCancel when Stop is clicked during pending", () => {
    const onCancel = vi.fn();
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("pending")}
          workspace={workspace}
          onCancel={onCancel}
        />,
      ),
    );
    fireEvent.click(screen.getByText("Stop"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Stop is clicked during running", () => {
    const onCancel = vi.fn();
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("running")}
          workspace={workspace}
          onCancel={onCancel}
        />,
      ),
    );
    fireEvent.click(screen.getByText("Stop"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("Stop button — hidden after terminal transition", () => {
  it("hides Stop button when status is 'completed'", () => {
    const onCancel = vi.fn();
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("completed")}
          workspace={workspace}
          onCancel={onCancel}
        />,
      ),
    );
    expect(screen.queryByText("Stop")).toBeNull();
  });

  it("hides Stop button when status is 'failed'", () => {
    const onCancel = vi.fn();
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("failed")}
          workspace={workspace}
          onCancel={onCancel}
        />,
      ),
    );
    expect(screen.queryByText("Stop")).toBeNull();
  });

  it("hides Stop button when status is 'idle' (cancelled task)", () => {
    const onCancel = vi.fn();
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("idle")}
          workspace={workspace}
          onCancel={onCancel}
        />,
      ),
    );
    expect(screen.queryByText("Stop")).toBeNull();
  });
});

describe("Stop button — absent without onCancel", () => {
  it("does not render Stop button when onCancel is not provided (e.g. project views)", () => {
    render(
      wrap(
        <WorkbenchChat
          locale="en"
          active={makeConversation("running")}
          workspace={workspace}
          // no onCancel
        />,
      ),
    );
    expect(screen.queryByText("Stop")).toBeNull();
  });
});
