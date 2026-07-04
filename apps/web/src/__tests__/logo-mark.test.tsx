import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LogoMark } from "@ash/ui/logo-mark";

describe("LogoMark", () => {
  it("is decorative by default", () => {
    const { container } = render(<LogoMark data-testid="ash-logo" />);

    const logo = screen.getByTestId("ash-logo");
    expect(logo).toHaveAttribute("aria-hidden", "true");
    expect(logo).not.toHaveAttribute("role");
    expect(
      container.querySelector('[data-slot="logo-mark-ember"]'),
    ).toBeInTheDocument();
  });

  it("is accessible when a title is provided", () => {
    render(<LogoMark title="Ash logo" />);

    const logo = screen.getByRole("img", { name: "Ash logo" });
    expect(logo).toHaveAttribute("data-slot", "logo-mark");
    expect(screen.getByText("Ash logo")).toBeInTheDocument();
  });

  it("uses semantic token fills for the core and ember", () => {
    const { container } = render(<LogoMark />);

    expect(container.querySelector('[data-slot="logo-mark-core"]')).toHaveAttribute(
      "fill",
      "var(--background)",
    );
    expect(
      container.querySelector('[data-slot="logo-mark-ember"]'),
    ).toHaveAttribute("fill", "var(--ember)");
  });
});
