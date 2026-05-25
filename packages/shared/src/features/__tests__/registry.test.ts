import { describe, expect, it } from "vitest";
import { featureRegistry, getFeature } from "../../features";

describe("featureRegistry", () => {
  it("enables the core feature pack", () => {
    expect(featureRegistry.find((f) => f.id === "core")?.enabled).toBe(true);
  });

  it("returns undefined for unknown feature ids", () => {
    expect(getFeature("nonexistent")).toBeUndefined();
  });
});
