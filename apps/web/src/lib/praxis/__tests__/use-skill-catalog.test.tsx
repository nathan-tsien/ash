import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const listSkills = vi.fn();
vi.mock("../client", () => ({ getPraxisClient: () => ({ listSkills }) }));

import { useSkillCatalog, __resetSkillCatalogCache } from "../use-skill-catalog";

function Probe() {
  const { skills, loading, error } = useSkillCatalog();
  return <div>{loading ? "loading" : error ? "error" : skills.map((s) => s.id).join(",")}</div>;
}

afterEach(() => {
  __resetSkillCatalogCache();
  vi.clearAllMocks();
});

describe("useSkillCatalog", () => {
  it("loads skills from the client once", async () => {
    listSkills.mockResolvedValue({
      items: [{ id: "web-search", kind: "skill", display_name: "web-search", description: "d", scope: "global", binding: "hint" }],
      next_cursor: null,
    });

    render(<><Probe /><Probe /></>);

    await waitFor(() => expect(screen.getAllByText("web-search").length).toBe(2));
    expect(listSkills).toHaveBeenCalledTimes(1);
  });

  it("exposes error state when the fetch fails", async () => {
    listSkills.mockRejectedValue(new Error("boom"));
    render(<Probe />);
    await waitFor(() => expect(screen.getByText("error")).toBeInTheDocument());
  });

  it("refetches on a later mount after an error (cache reset)", async () => {
    listSkills.mockRejectedValueOnce(new Error("boom"));
    const first = render(<Probe />);
    await waitFor(() => expect(screen.getByText("error")).toBeInTheDocument());
    first.unmount();

    listSkills.mockResolvedValueOnce({
      items: [{ id: "web-search", kind: "skill", display_name: "web-search", description: "d", scope: "global", binding: "hint" }],
      next_cursor: null,
    });
    render(<Probe />);
    await waitFor(() => expect(screen.getByText("web-search")).toBeInTheDocument());
    expect(listSkills).toHaveBeenCalledTimes(2);
  });
});
