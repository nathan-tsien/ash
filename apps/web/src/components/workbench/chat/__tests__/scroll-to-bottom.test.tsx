import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScrollToBottom } from "../scroll-to-bottom";
import { createRef } from "react";
import gsap from "gsap";

describe("ScrollToBottom", () => {
  beforeEach(() => {
    vi.mocked(gsap.fromTo).mockClear();
    vi.mocked(gsap.to).mockClear();
  });

  it("renders button with correct aria-label", () => {
    const scrollAreaRef = createRef<HTMLDivElement>();
    const targetRef = createRef<HTMLDivElement>();
    render(
      <ScrollToBottom scrollAreaRef={scrollAreaRef} targetRef={targetRef} />,
    );
    const button = screen.getByLabelText("Workbench.scrollToBottom");
    expect(button).toBeInTheDocument();
  });

  it("shows arrow-down icon and label", () => {
    const scrollAreaRef = createRef<HTMLDivElement>();
    const targetRef = createRef<HTMLDivElement>();
    render(
      <ScrollToBottom scrollAreaRef={scrollAreaRef} targetRef={targetRef} />,
    );
    expect(screen.getByTestId("arrow-down")).toBeInTheDocument();
    expect(screen.getByText("Workbench.scrollToBottom")).toBeInTheDocument();
  });

  it("starts hidden (visibility: hidden, opacity: 0)", () => {
    const scrollAreaRef = createRef<HTMLDivElement>();
    const targetRef = createRef<HTMLDivElement>();
    render(
      <ScrollToBottom scrollAreaRef={scrollAreaRef} targetRef={targetRef} />,
    );
    const button = screen.getByLabelText("Workbench.scrollToBottom");
    expect(button).toHaveStyle({ visibility: "hidden", opacity: 0 });
  });

  it("scrolls target into view on click", () => {
    const targetEl = document.createElement("div");
    targetEl.scrollIntoView = vi.fn();
    const scrollAreaRef = createRef<HTMLDivElement>();
    const targetRef = { current: targetEl };

    render(
      <ScrollToBottom scrollAreaRef={scrollAreaRef} targetRef={targetRef} />,
    );
    const button = screen.getByLabelText("Workbench.scrollToBottom");
    fireEvent.click(button);
    expect(targetEl.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
    });
  });

  it("triggers GSAP show animation when distance from bottom > 200px", () => {
    // Create a scroll area with a Radix viewport child
    const scrollArea = document.createElement("div");
    const viewport = document.createElement("div");
    viewport.setAttribute("data-radix-scroll-area-viewport", "");
    Object.defineProperty(viewport, "scrollHeight", {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(viewport, "scrollTop", {
      value: 0,
      configurable: true,
    });
    Object.defineProperty(viewport, "clientHeight", {
      value: 500,
      configurable: true,
    });
    scrollArea.appendChild(viewport);

    const scrollAreaRef = { current: scrollArea };
    const targetRef = createRef<HTMLDivElement>();

    render(
      <ScrollToBottom scrollAreaRef={scrollAreaRef} targetRef={targetRef} />,
    );

    // distanceFromBottom = 1000 - 0 - 500 = 500 > 200 → visible
    // Initial checkDistance fires on mount → gsap.fromTo called (show)
    expect(gsap.fromTo).toHaveBeenCalledWith(
      expect.anything(),
      { autoAlpha: 0, y: 8 },
      expect.objectContaining({ autoAlpha: 1, y: 0 }),
    );

    vi.mocked(gsap.fromTo).mockClear();
    vi.mocked(gsap.to).mockClear();

    // Scroll near bottom: distanceFromBottom = 1000 - 900 - 500 = -400 < 200 → hide
    Object.defineProperty(viewport, "scrollTop", {
      value: 900,
      configurable: true,
    });
    fireEvent.scroll(viewport);
    expect(gsap.to).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ autoAlpha: 0 }),
    );

    vi.mocked(gsap.to).mockClear();

    // Scroll back up: distanceFromBottom = 1000 - 200 - 500 = 300 > 200 → show again
    Object.defineProperty(viewport, "scrollTop", {
      value: 200,
      configurable: true,
    });
    fireEvent.scroll(viewport);
    expect(gsap.fromTo).toHaveBeenCalledWith(
      expect.anything(),
      { autoAlpha: 0, y: 8 },
      expect.objectContaining({ autoAlpha: 1, y: 0 }),
    );
  });
});
