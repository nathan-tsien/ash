import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatRelativeTime,
  getConversation,
  getMockConversations,
} from "../conversations";

describe("conversation mocks", () => {
  it("returns non-empty zh conversation inventory", () => {
    expect(getMockConversations("zh").length).toBeGreaterThan(0);
  });

  it("resolves a known conversation by id", () => {
    const conv = getConversation("conv-1", "zh");
    expect(conv?.title).toBeTruthy();
  });

  describe("formatRelativeTime", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-23T12:00:00+08:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("formats seconds ago for recent timestamps", () => {
      const result = formatRelativeTime("2026-05-23T11:59:30+08:00", "zh");
      expect(result.length).toBeGreaterThan(0);
    });

    it("formats days ago within a week", () => {
      const result = formatRelativeTime("2026-05-20T12:00:00+08:00", "zh");
      expect(result).toMatch(/天/);
    });

    it("falls back to short date beyond a week", () => {
      const result = formatRelativeTime("2026-04-01T12:00:00+08:00", "en");
      expect(result).toMatch(/Apr/);
    });
  });
});
