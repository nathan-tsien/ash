import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import type { Conversation, PendingQuestion } from "@ash/shared";
import { WorkbenchChat } from "../workbench-chat";

// Distinct labels so the composer textarea and the AnswerPrompt input are
// addressable separately. Other keys fall back to their path (next-intl does not
// throw on a missing key), which is fine for this routing test.
const messages = {
  Workbench: {
    textareaAria: "compose-input",
    answerLabel: "answer-input",
    cancelTask: "取消任务",
    send: "发送",
  },
};

const wrap = (ui: React.ReactNode) => (
  <NextIntlClientProvider locale="zh" messages={messages}>
    {ui}
  </NextIntlClientProvider>
);

const conversation = (status: Conversation["status"]): Conversation => ({
  id: "conv-1",
  title: "任务",
  preview: "",
  updatedAt: "t",
  status,
  messages: [],
  plan: [],
  toolTraces: [],
  artifacts: [],
});

const workspace = { collapsed: false, onToggle: vi.fn() };
const pending: PendingQuestion = { askId: "ask-1", text: "面向什么受众？", attachments: [] };

function typeAndSend(text: string) {
  const textarea = screen.getByLabelText("compose-input");
  fireEvent.change(textarea, { target: { value: text } });
  fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
}

describe("WorkbenchChat composer routing", () => {
  it("routes to onAnswer (not onFollowUp) while awaiting_input", () => {
    const onAnswer = vi.fn();
    const onFollowUp = vi.fn(async () => {});
    render(
      wrap(
        <WorkbenchChat
          locale="zh"
          active={conversation("idle")}
          workspace={workspace}
          pendingQuestion={pending}
          onAnswer={onAnswer}
          onFollowUp={onFollowUp}
        />,
      ),
    );
    typeAndSend("观众是高管");
    expect(onAnswer).toHaveBeenCalledWith("观众是高管");
    expect(onFollowUp).not.toHaveBeenCalled();
  });

  it("routes to onFollowUp when there is no pending question", () => {
    const onAnswer = vi.fn();
    const onFollowUp = vi.fn(async () => {});
    render(
      wrap(
        <WorkbenchChat
          locale="zh"
          active={conversation("completed")}
          workspace={workspace}
          onAnswer={onAnswer}
          onFollowUp={onFollowUp}
        />,
      ),
    );
    typeAndSend("再补一页结尾");
    expect(onFollowUp).toHaveBeenCalledWith("再补一页结尾");
    expect(onAnswer).not.toHaveBeenCalled();
  });
});

describe("WorkbenchChat composer IME handling", () => {
  it("does not send while an IME composition is active, but sends once it ends", () => {
    const onFollowUp = vi.fn(async () => {});
    render(
      wrap(
        <WorkbenchChat
          locale="zh"
          active={conversation("completed")}
          workspace={workspace}
          onFollowUp={onFollowUp}
        />,
      ),
    );
    const textarea = screen.getByLabelText("compose-input");
    fireEvent.change(textarea, { target: { value: "观众" } });

    // The Enter that confirms an IME candidate must NOT submit the message.
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false, isComposing: true });
    expect(onFollowUp).not.toHaveBeenCalled();

    // A real Enter once composition is over sends as usual.
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onFollowUp).toHaveBeenCalledWith("观众");
  });
});

describe("WorkbenchChat cancel control", () => {
  it("shows the cancel button only when onCancel is provided", () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      wrap(
        <WorkbenchChat locale="zh" active={conversation("running")} workspace={workspace} onCancel={onCancel} />,
      ),
    );
    fireEvent.click(screen.getByText("取消任务"));
    expect(onCancel).toHaveBeenCalledTimes(1);

    // No onCancel (e.g. project view) → no cancel control even when running.
    rerender(
      wrap(<WorkbenchChat locale="zh" active={conversation("running")} workspace={workspace} />),
    );
    expect(screen.queryByText("取消任务")).toBeNull();
  });
});
