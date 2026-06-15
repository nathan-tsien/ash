import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

const useSkillCatalog = vi.fn();
vi.mock("@/lib/praxis/use-skill-catalog", () => ({ useSkillCatalog: () => useSkillCatalog() }));

import { SkillsSection } from "../skills-section";

const messages = {
  Settings: {
    "skills.heading": "技能",
    "skills.description": "可在任务开始时建议使用的技能。",
    "skills.empty": "暂无可用技能",
    "skills.error": "技能列表加载失败",
    "skills.loading": "加载中…",
  },
};

function renderSection() {
  return render(
    <NextIntlClientProvider locale="zh" messages={messages}>
      <SkillsSection />
    </NextIntlClientProvider>,
  );
}

afterEach(() => vi.clearAllMocks());

describe("SkillsSection", () => {
  it("lists skills from the catalog", () => {
    useSkillCatalog.mockReturnValue({
      skills: [{ id: "web-search", kind: "skill", display_name: "web-search", description: "搜索网页", scope: "global", binding: "hint" }],
      loading: false,
      error: false,
    });
    renderSection();
    expect(screen.getByText("web-search")).toBeInTheDocument();
    expect(screen.getByText("搜索网页")).toBeInTheDocument();
  });

  it("shows an error line when the catalog fails", () => {
    useSkillCatalog.mockReturnValue({ skills: [], loading: false, error: true });
    renderSection();
    expect(screen.getByText("技能列表加载失败")).toBeInTheDocument();
  });
});
