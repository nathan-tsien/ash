import { describe, expect, it } from "vitest";

import manifest from "../app/manifest";
import {
  buildBrandAssets,
  readLightBrandTokens,
} from "../../scripts/brand-assets.mjs";

const cssFixture = `
:root {
  --background: #f5f5f4;
  --foreground: #1c1c1a;
  --ember: #b8441f;
  --ember-soft: #f8e8e0;
}
`;

describe("brand asset generation", () => {
  it("reads the static LogoMark colors from the canonical light tokens", () => {
    expect(readLightBrandTokens(cssFixture)).toEqual({
      background: "#f5f5f4",
      foreground: "#1c1c1a",
      ember: "#b8441f",
      emberSoft: "#f8e8e0",
    });
  });

  it("generates favicon and app icon SVG assets from those tokens", () => {
    const assets = buildBrandAssets(cssFixture);

    expect(assets.map((asset) => asset.path)).toEqual([
      "src/app/icon.svg",
      "public/ash-icon.svg",
      "public/ash-maskable-icon.svg",
    ]);

    for (const asset of assets) {
      expect(asset.contents).toContain("TODO(ash-visual)");
      expect(asset.contents).not.toContain("var(");
      expect(asset.contents).toContain("#1c1c1a");
      expect(asset.contents).toContain("#b8441f");
    }

    expect(assets[0]?.contents).toContain('viewBox="0 0 32 32"');
    expect(assets[1]?.contents).toContain('viewBox="0 0 512 512"');
    expect(assets[2]?.contents).toContain('viewBox="0 0 512 512"');
  });
});

describe("web app manifest", () => {
  it("advertises the generated app icons", () => {
    expect(manifest()).toMatchObject({
      name: "Ash",
      short_name: "Ash",
      icons: [
        {
          src: "/ash-icon.svg",
          sizes: "512x512",
          type: "image/svg+xml",
          purpose: "any",
        },
        {
          src: "/ash-maskable-icon.svg",
          sizes: "512x512",
          type: "image/svg+xml",
          purpose: "maskable",
        },
      ],
    });
  });
});
