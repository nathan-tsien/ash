import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Composer } from "../composer";

describe("Composer", () => {
  const defaultProps = {
    draft: "",
    onDraftChange: vi.fn(),
    onSend: vi.fn(),
  };

  it("renders textarea with correct attributes", () => {
    render(<Composer {...defaultProps} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("aria-multiline", "true");
    expect(textarea).toHaveAttribute("aria-label", "Workbench.textareaAria");
  });

  it("calls onDraftChange when typing", () => {
    const onDraftChange = vi.fn();
    render(<Composer {...defaultProps} onDraftChange={onDraftChange} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "hello" } });
    expect(onDraftChange).toHaveBeenCalledWith("hello");
  });

  it("calls onSend on Enter key (without Shift)", () => {
    const onSend = vi.fn();
    render(<Composer {...defaultProps} onSend={onSend} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onSend on Shift+Enter", () => {
    const onSend = vi.fn();
    render(<Composer {...defaultProps} onSend={onSend} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("renders send button", () => {
    render(<Composer {...defaultProps} />);
    const button = screen.getByRole("button", { name: "Workbench.send" });
    expect(button).toBeInTheDocument();
  });

  it("calls onSend when send button is clicked", () => {
    const onSend = vi.fn();
    render(<Composer {...defaultProps} onSend={onSend} />);
    const button = screen.getByRole("button", { name: "Workbench.send" });
    fireEvent.click(button);
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("displays draft value in textarea", () => {
    render(<Composer {...defaultProps} draft="test message" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("test message");
  });

  it("shows shortcut hint", () => {
    render(<Composer {...defaultProps} />);
    expect(screen.getByText("Workbench.shortcutHint")).toBeInTheDocument();
  });

  it("auto-resizes textarea height on draft change", () => {
    const { rerender } = render(<Composer {...defaultProps} draft="" />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    // Simulate a scrollHeight by defining it on the element (jsdom has no layout)
    Object.defineProperty(textarea, "scrollHeight", {
      value: 120,
      configurable: true,
      writable: true,
    });

    // Re-render with content — triggers the useEffect
    rerender(
      <Composer {...defaultProps} draft="line 1\nline 2\nline 3" />,
    );
    expect(textarea.style.height).toBe("120px");
  });

  it("caps auto-resize at max-h 168px", () => {
    const { rerender } = render(<Composer {...defaultProps} draft="" />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    Object.defineProperty(textarea, "scrollHeight", {
      value: 300,
      configurable: true,
      writable: true,
    });

    rerender(
      <Composer
        {...defaultProps}
        draft={"a\n".repeat(50)}
      />,
    );
    expect(textarea.style.height).toBe("168px");
  });
});
