import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

const useSkillCatalog = vi.fn();
vi.mock("@/lib/praxis/use-skill-catalog", () => ({ useSkillCatalog: () => useSkillCatalog() }));

import { SkillPicker } from "../skill-picker";

// Radix dropdown-menu relies on pointer-capture + scrollIntoView, which jsdom
// does not implement; stub them so user-event can drive the real menu.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

const messages = {
  Workbench: {
    skillPickerButton: "技能",
    skillPickerEmpty: "暂无可用技能",
    skillPickerHint: "建议技能（非强制）",
    removeSkillAria: "移除技能",
  },
};

function renderPicker(props: { selected: string[]; onChange: (ids: string[]) => void }) {
  return render(
    <NextIntlClientProvider locale="zh" messages={messages}>
      <SkillPicker {...props} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => vi.clearAllMocks());

describe("SkillPicker", () => {
  it("renders nothing when the catalog is empty", () => {
    useSkillCatalog.mockReturnValue({ skills: [], loading: false, error: false });
    const { container } = renderPicker({ selected: [], onChange: vi.fn() });
    expect(container).toBeEmptyDOMElement();
  });

  it("selecting a skill calls onChange with its id", async () => {
    useSkillCatalog.mockReturnValue({
      skills: [{ id: "web-search", kind: "skill", display_name: "web-search", description: "d", scope: "global", binding: "hint" }],
      loading: false,
      error: false,
    });
    const onChange = vi.fn();
    renderPicker({ selected: [], onChange });

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByText("技能"));
    await user.click(await screen.findByText("web-search"));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(["web-search"]));
  });

  it("renders a removable chip for a selected skill", async () => {
    useSkillCatalog.mockReturnValue({
      skills: [{ id: "web-search", kind: "skill", display_name: "web-search", description: "d", scope: "global", binding: "hint" }],
      loading: false,
      error: false,
    });
    const onChange = vi.fn();
    renderPicker({ selected: ["web-search"], onChange });

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByLabelText("移除技能"));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
