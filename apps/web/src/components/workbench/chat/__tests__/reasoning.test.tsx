import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import type { Message } from "@ash/shared";
import { Reasoning } from "../reasoning";
import { MessageBubble } from "../message-bubble";

// Provide real translated strings so header text assertions are exact.
const messages = {
  Workbench: {
    reasoningStreaming: "Ash 思考中…",
    reasoningDone: "已思考 {n} 秒",
    messageToolCall: "Tool: {tool}",
    messageImage: "[image]",
    roleAssistant: "ASH",
    copyMessage: "Copy",
    copiedMessage: "Copied",
  },
};

const wrap = (ui: React.ReactNode) => (
  <NextIntlClientProvider locale="zh" messages={messages}>
    {ui}
  </NextIntlClientProvider>
);

describe("Reasoning component", () => {
  it("shows the streaming header and is expanded while isStreaming=true", () => {
    render(
      wrap(
        <Reasoning
          text="reasoning body content"
          isStreaming={true}
          durationSeconds={0}
        />,
      ),
    );

    // Header shows streaming label
    expect(screen.getByText("Ash 思考中…")).toBeInTheDocument();

    // Body is visible (not hidden) while streaming
    expect(screen.getByText("reasoning body content")).toBeVisible();
  });

  it("shows the done header with seconds and is collapsed after streaming ends", () => {
    render(
      wrap(
        <Reasoning
          text="reasoning body content"
          isStreaming={false}
          durationSeconds={7}
        />,
      ),
    );

    // Header shows "已思考 7 秒"
    expect(screen.getByText("已思考 7 秒")).toBeInTheDocument();

    // Body should be hidden (collapsed) by default once done
    const body = screen.getByText("reasoning body content");
    // The body element has data-state="closed" or aria-hidden when collapsed
    // We check the disclosure container has the collapsed state
    expect(body.closest("[data-state]")).toHaveAttribute("data-state", "closed");
  });

  it("renders the thinking text content in the body", () => {
    render(
      wrap(
        <Reasoning
          text="This is the thinking text"
          isStreaming={true}
          durationSeconds={3}
        />,
      ),
    );

    expect(screen.getByText("This is the thinking text")).toBeInTheDocument();
  });

  it("toggles open/closed on header click when done", () => {
    render(
      wrap(
        <Reasoning
          text="reasoning body"
          isStreaming={false}
          durationSeconds={5}
        />,
      ),
    );

    // Initially collapsed when done
    const body = screen.getByText("reasoning body");
    expect(body.closest("[data-state]")).toHaveAttribute("data-state", "closed");

    // Click header to expand
    const header = screen.getByText("已思考 5 秒").closest("button");
    expect(header).toBeTruthy();
    act(() => {
      fireEvent.click(header!);
    });

    // Now expanded
    expect(body.closest("[data-state]")).toHaveAttribute("data-state", "open");
  });
});

/**
 * MessageBubble integration: last-block isStreaming fix (A3 follow-up).
 *
 * When a streaming assistant message has blocks [thinking, text], the thinking
 * block is no longer the last block, so it must show the DONE state — NOT "Ash
 * 思考中…". Conversely, when thinking IS the last block it must show the
 * streaming state.
 */
describe("MessageBubble — thinking isStreaming only for last block", () => {
  const makeMessage = (
    blocks: Message["blocks"],
    isStreaming: boolean,
  ): Message => ({
    id: "m1",
    role: "assistant",
    blocks,
    createdAt: new Date(0).toISOString(),
    isStreaming,
  });

  it("streaming message with [thinking, text] — thinking shows DONE state (not streaming)", () => {
    const message = makeMessage(
      [
        { kind: "thinking", text: "internal reasoning" },
        { kind: "text", text: "Hello user" },
      ],
      true,
    );

    render(
      <NextIntlClientProvider locale="zh" messages={messages}>
        <MessageBubble message={message} locale="zh" />
      </NextIntlClientProvider>,
    );

    // The thinking header must NOT show "Ash 思考中…" — thinking is done
    // because a subsequent text block has arrived.
    expect(screen.queryByText("Ash 思考中…")).not.toBeInTheDocument();

    // The done state renders "已思考 N 秒" (0 seconds in test, timer not
    // injected via durationSeconds so elapsed stays 0).
    expect(screen.getByText("已思考 0 秒")).toBeInTheDocument();

    // The body collapses in the done state.
    const body = screen.getByText("internal reasoning");
    expect(body.closest("[data-state]")).toHaveAttribute("data-state", "closed");
  });

  it("streaming message with [thinking] only — thinking shows streaming state", () => {
    const message = makeMessage(
      [{ kind: "thinking", text: "still reasoning" }],
      true,
    );

    render(
      <NextIntlClientProvider locale="zh" messages={messages}>
        <MessageBubble message={message} locale="zh" />
      </NextIntlClientProvider>,
    );

    // Thinking is the last (and only) block — must show the streaming header.
    expect(screen.getByText("Ash 思考中…")).toBeInTheDocument();
  });

  it("renders the Ash logo mark in assistant message identity", () => {
    const message = makeMessage(
      [{ kind: "text", text: "Hello user" }],
      false,
    );

    const { container } = render(
      <NextIntlClientProvider locale="zh" messages={messages}>
        <MessageBubble message={message} locale="zh" />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("ASH")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="logo-mark"]')).toBeInTheDocument();
  });
});
