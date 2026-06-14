import { describe, it, expect } from "vitest";
import { getPraxisClient } from "../client";
import { httpPraxisClient } from "../http-client";
import { fakePraxisClient } from "../fake-client";

describe("getPraxisClient transport discipline", () => {
  // Discipline: the fake/mock client may be used ONLY in the unit-test phase
  // (imported directly by fake-client tests, or via module mocks). At runtime
  // the selector must ALWAYS return the real transport — dev and prod talk to
  // the real praxis through the BFF, never the in-memory fake.
  it("always returns the real HTTP client, never the fake", () => {
    expect(getPraxisClient()).toBe(httpPraxisClient);
    expect(getPraxisClient()).not.toBe(fakePraxisClient);
  });
});
