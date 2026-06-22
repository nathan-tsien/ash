import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const start = vi.fn().mockResolvedValue("t1");
vi.mock("../task-run-provider", () => ({ useStartTask: () => start }));
vi.mock("@/lib/praxis/use-skill-catalog", () => ({
  useSkillCatalog: () => ({
    skills: [{ id: "web-search", kind: "skill", display_name: "web-search", description: "d", scope: "global", binding: "hint" }],
    loading: false,
    error: false,
  }),
}));

// Radix dropdown-menu relies on pointer-capture + scrollIntoView, which jsdom
// does not implement; stub them so user-event can drive the real menu.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

import { WorkbenchHome } from "../workbench-home";

afterEach(() => vi.clearAllMocks());

describe("WorkbenchHome skill selection", () => {
  it("passes selected skill ids to startTask", async () => {
    render(<WorkbenchHome locale="zh" tasks={[]} projects={[]} />);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.type(screen.getByLabelText("textareaAria"), "做个PPT");
    await user.click(screen.getByText("skillPickerButton"));
    await user.click(await screen.findByText("web-search"));
    await user.click(screen.getByText("send"));
    await waitFor(() => expect(start).toHaveBeenCalledWith("做个PPT", ["web-search"]));
  });
});
