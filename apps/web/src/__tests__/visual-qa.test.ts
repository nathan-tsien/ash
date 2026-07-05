import { describe, expect, it } from "vitest";

import {
  VISUAL_QA_ASSET_CHECKS,
  VISUAL_QA_CASES,
} from "../../scripts/visual-qa.mjs";

describe("visual QA matrix", () => {
  it("covers marketing, auth, and workbench in both themes", () => {
    expect(VISUAL_QA_CASES.map((item) => `${item.surface}:${item.theme}`)).toEqual([
      "marketing:light",
      "marketing:dark",
      "auth:light",
      "auth:dark",
      "workbench:light",
      "workbench:dark",
    ]);
  });

  it("checks generated manifest and icon endpoints", () => {
    expect(VISUAL_QA_ASSET_CHECKS).toEqual([
      { label: "browser icon", path: "/icon.svg", contentType: "image/svg+xml" },
      { label: "web manifest", path: "/manifest.webmanifest", contentType: "application/manifest+json" },
      { label: "app icon", path: "/ash-icon.svg", contentType: "image/svg+xml" },
      { label: "maskable app icon", path: "/ash-maskable-icon.svg", contentType: "image/svg+xml" },
    ]);
  });
});
