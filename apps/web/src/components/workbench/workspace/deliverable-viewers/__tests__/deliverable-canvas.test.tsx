/**
 * DeliverableCanvas — dialog open/close rendering tests.
 *
 * Verifies:
 *   1. When a markdown deliverable is supplied, the dialog shows the deliverable name
 *      and the rendered markdown content.
 *   2. When deliverable is null, the dialog content is absent from the DOM.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import type { Deliverable } from "@ash/shared";
import { DeliverableCanvas } from "../../deliverable-canvas";

afterEach(() => vi.restoreAllMocks());

const i18nMessages = {
  Workbench: {
    deliverableOpen: "Open",
    deliverableDownload: "Download",
    viewerOpenInNewTab: "Open in new tab",
    viewerLoading: "Loading…",
    viewerError: "Couldn't load preview",
    viewerTooLarge: "File too large to preview",
  },
};

function wrap(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={i18nMessages}>
      {ui}
    </NextIntlClientProvider>
  );
}

const markdownDeliverable: Deliverable = {
  id: "d1",
  name: "README.md",
  mimeType: "text/markdown",
  sizeBytes: 5,
  uri: "/v1/tasks/t1/attachments/d1",
  kind: "file",
};

describe("DeliverableCanvas", () => {
  it("shows the deliverable name and markdown content when open", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("# Hi", { status: 200 })),
    );

    render(wrap(<DeliverableCanvas deliverable={markdownDeliverable} onClose={() => {}} />));

    // Dialog title shows the deliverable name
    expect(screen.getByText("README.md")).toBeTruthy();

    // Markdown viewer renders (react-markdown mocked in setup as data-testid="markdown")
    await waitFor(() => {
      expect(screen.getByTestId("markdown")).toBeTruthy();
    });
    expect(screen.getByTestId("markdown").textContent).toBe("# Hi");

    // Action buttons are present
    expect(screen.getByText("Open in new tab")).toBeTruthy();
    expect(screen.getByText("Download")).toBeTruthy();
  });

  it("renders nothing visible when deliverable is null", () => {
    render(wrap(<DeliverableCanvas deliverable={null} onClose={() => {}} />));

    // No dialog title, no action buttons
    expect(screen.queryByText("README.md")).toBeNull();
    expect(screen.queryByText("Open in new tab")).toBeNull();
    expect(screen.queryByText("Download")).toBeNull();
  });
});
