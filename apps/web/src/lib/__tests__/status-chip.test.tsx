import { render, screen } from "@testing-library/react";
import { StatusChip } from "@ash/ui/status-chip";
import { describe, expect, it } from "vitest";

describe("StatusChip", () => {
  it("renders its children", () => {
    render(<StatusChip variant="running">3/5</StatusChip>);
    expect(screen.getByText("3/5")).toBeInTheDocument();
  });

  it("applies the variant's status token classes", () => {
    render(<StatusChip variant="success">2</StatusChip>);
    const chip = screen.getByText("2");
    expect(chip.className).toContain("bg-status-success-soft");
    expect(chip.className).toContain("text-status-success-foreground");
  });

  it("defaults to the neutral variant", () => {
    render(<StatusChip>idle</StatusChip>);
    const chip = screen.getByText("idle");
    expect(chip.className).toContain("bg-muted");
    expect(chip.className).toContain("text-muted-foreground");
  });
});
