import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { Reasoning } from "../reasoning";

// Provide real translated strings so header text assertions are exact.
const messages = {
  Workbench: {
    reasoningStreaming: "Ash 思考中…",
    reasoningDone: "已思考 {n} 秒",
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
