import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { AnswerPrompt } from "../answer-prompt";

const messages = { Workbench: { answerPlaceholder: "Type your answer", answerSubmit: "Send", answerLabel: "Answer the question" } };

function renderPrompt(onAnswer = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AnswerPrompt question={{ askId: "q1", text: "Which audience?", attachments: [] }} onAnswer={onAnswer} />
    </NextIntlClientProvider>,
  );
  return onAnswer;
}

describe("AnswerPrompt", () => {
  it("renders the question text", () => {
    renderPrompt();
    expect(screen.getByText("Which audience?")).toBeInTheDocument();
  });

  it("submits the typed answer via onAnswer", () => {
    const onAnswer = renderPrompt();
    fireEvent.change(screen.getByLabelText("Answer the question"), { target: { value: "marketers" } });
    fireEvent.click(screen.getByText("Send"));
    expect(onAnswer).toHaveBeenCalledWith("marketers");
  });

  it("does not submit an empty answer", () => {
    const onAnswer = renderPrompt();
    fireEvent.click(screen.getByText("Send"));
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
