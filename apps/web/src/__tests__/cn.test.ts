import { describe, expect, it, vi } from "vitest";
import { cn } from "@ash/ui/lib/utils";

// The global setup mocks @ash/ui/lib/utils with a plain join; this suite
// must exercise the real tailwind-merge-backed implementation.
vi.unmock("@ash/ui/lib/utils");

// TYPE-2 named type-scale utilities must merge as font sizes, not text colors.
// Default tailwind-merge misclassifies text-label etc. as colors and drops
// them when a real color utility (e.g. text-muted-foreground) follows.
describe("cn", () => {
  it("keeps named type-scale utilities alongside text color utilities", () => {
    const result = cn("text-label", "text-muted-foreground");
    expect(result).toContain("text-label");
    expect(result).toContain("text-muted-foreground");
  });

  it("merges named type-scale utilities against stock font sizes", () => {
    const result = cn("text-sm", "text-label");
    expect(result).toBe("text-label");
  });
});
