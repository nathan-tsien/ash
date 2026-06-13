import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  CommandPaletteProvider,
  useCommandPalette,
} from "../command-palette-provider";
import { CommandPalette } from "../command-palette";
import { SettingsModalProvider } from "@/components/settings/settings-modal-provider";

// Minimal wrapper that exposes context for testing
function TestHarness({
  onToggleWorkspace,
}: {
  onToggleWorkspace?: () => void;
}) {
  return (
    <SettingsModalProvider>
      <CommandPaletteProvider>
        <CommandPalette onToggleWorkspace={onToggleWorkspace ?? vi.fn()} />
        <TriggerButton />
      </CommandPaletteProvider>
    </SettingsModalProvider>
  );
}

function TriggerButton() {
  const { openPalette, open } = useCommandPalette();
  return (
    <button data-testid="trigger" onClick={openPalette}>
      {open ? "open" : "closed"}
    </button>
  );
}

describe("CommandPaletteProvider", () => {
  it("throws when useCommandPalette is used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Bad() {
      useCommandPalette();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(
      "useCommandPalette must be used within CommandPaletteProvider",
    );
    spy.mockRestore();
  });

  it("starts closed", () => {
    render(
      <CommandPaletteProvider>
        <TriggerButton />
      </CommandPaletteProvider>,
    );
    expect(screen.getByTestId("trigger")).toHaveTextContent("closed");
  });

  it("toggles via Meta+K / Ctrl+K window keydown (IA-4)", () => {
    render(
      <CommandPaletteProvider>
        <TriggerButton />
      </CommandPaletteProvider>,
    );
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getByTestId("trigger")).toHaveTextContent("open");
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByTestId("trigger")).toHaveTextContent("closed");
  });

  it("ignores plain k without modifier", () => {
    render(
      <CommandPaletteProvider>
        <TriggerButton />
      </CommandPaletteProvider>,
    );
    fireEvent.keyDown(window, { key: "k" });
    expect(screen.getByTestId("trigger")).toHaveTextContent("closed");
  });
});

describe("CommandPalette", () => {
  it("does not render when closed", () => {
    render(<TestHarness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders when opened via context", () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByTestId("trigger"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders a backdrop overlay (Radix Dialog overlay)", () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByTestId("trigger"));
    // cmdk's Command.Dialog renders a Radix Dialog.Overlay as a sibling of the
    // content; it provides the dimmed, dismiss-on-click backdrop.
    expect(document.querySelector("[cmdk-overlay]")).toBeInTheDocument();
  });

  it("closes on Escape key (Radix dismissal)", () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByTestId("trigger"));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders command items", () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByTestId("trigger"));
    expect(
      screen.getByText("CommandPalette.switchConversation"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("CommandPalette.goHome"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("CommandPalette.openSettings"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("CommandPalette.toggleWorkspace"),
    ).toBeInTheDocument();
  });

  it("calls onToggleWorkspace when toggle workspace is selected", () => {
    const onToggleWorkspace = vi.fn();
    render(<TestHarness onToggleWorkspace={onToggleWorkspace} />);
    fireEvent.click(screen.getByTestId("trigger"));
    fireEvent.click(
      screen.getByText("CommandPalette.toggleWorkspace"),
    );
    expect(onToggleWorkspace).toHaveBeenCalledTimes(1);
  });

  it("closes after running an action", () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByTestId("trigger"));
    fireEvent.click(screen.getByText("CommandPalette.toggleWorkspace"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders search input with placeholder", () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByTestId("trigger"));
    const input = screen.getByPlaceholderText("CommandPalette.placeholder");
    expect(input).toBeInTheDocument();
  });

  it("passes a custom filter function to Command", () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByTestId("trigger"));
    const root = screen.getByRole("dialog").querySelector("[data-cmdk-root]");
    expect(root).toHaveAttribute("data-filter", "custom");
  });
});
