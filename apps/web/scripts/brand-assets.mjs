import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");

const tokenMap = {
  background: "--background",
  foreground: "--foreground",
  ember: "--ember",
  emberSoft: "--ember-soft",
};

const assetNotice =
  "TODO(ash-visual): static brand asset generated from LogoMark geometry and docs/design-guidelines token values; run pnpm --filter @ash/web gen:brand-assets after mark or token changes.";

function readLightBrandTokens(cssText) {
  const rootMatch = cssText.match(/:root\s*\{(?<body>[\s\S]*?)\n\}/);
  if (!rootMatch?.groups?.body) {
    throw new Error("Could not find the light :root token block in globals.css.");
  }

  return Object.fromEntries(
    Object.entries(tokenMap).map(([name, token]) => {
      const match = rootMatch.groups.body.match(
        new RegExp(`${token.replace("-", "\\-")}\\s*:\\s*(#[0-9a-fA-F]{6})\\s*;`),
      );
      if (!match?.[1]) {
        throw new Error(`Could not find ${token} in the light :root token block.`);
      }
      return [name, match[1].toLowerCase()];
    }),
  );
}

function logoPaths(tokens) {
  return `
  <path data-slot="logo-mark-shadow" d="M16 2.75C23.04 2.75 28.75 8.39 28.75 15.35C28.75 20.74 25.34 25.44 20.36 27.18L16 29L11.64 27.18C6.66 25.44 3.25 20.74 3.25 15.35C3.25 8.39 8.96 2.75 16 2.75Z" fill="${tokens.foreground}"/>
  <path data-slot="logo-mark-core" d="M10.55 10.35H16.95L21.45 14.6V21.55C21.45 22.33 20.83 22.95 20.05 22.95H11.95C11.17 22.95 10.55 22.33 10.55 21.55V10.35Z" fill="${tokens.background}"/>
  <path data-slot="logo-mark-fold" d="M16.95 10.35V13.35C16.95 14.04 17.51 14.6 18.2 14.6H21.45" fill="none" stroke="${tokens.foreground}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.25"/>
  <circle data-slot="logo-mark-ember" cx="16" cy="17.35" r="1.85" fill="${tokens.ember}"/>`;
}

function renderFaviconSvg(tokens) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <!-- ${assetNotice} -->${logoPaths(tokens)}
</svg>
`;
}

function renderAppIconSvg(tokens, { maskable = false } = {}) {
  const markScale = maskable ? 9.25 : 10;
  const markOffset = (512 - 32 * markScale) / 2;
  const background = maskable ? tokens.emberSoft : tokens.background;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- ${assetNotice} -->
  <rect width="512" height="512" rx="112" fill="${background}"/>
  <g transform="translate(${markOffset} ${markOffset}) scale(${markScale})">${logoPaths(tokens)}
  </g>
</svg>
`;
}

function buildBrandAssets(cssText) {
  const tokens = readLightBrandTokens(cssText);

  return [
    {
      path: "src/app/icon.svg",
      contents: renderFaviconSvg(tokens),
    },
    {
      path: "public/ash-icon.svg",
      contents: renderAppIconSvg(tokens),
    },
    {
      path: "public/ash-maskable-icon.svg",
      contents: renderAppIconSvg(tokens, { maskable: true }),
    },
  ];
}

async function writeBrandAssets() {
  const cssPath = path.join(repoRoot, "packages/ui/src/globals.css");
  const cssText = await readFile(cssPath, "utf8");
  const assets = buildBrandAssets(cssText);

  await Promise.all(
    assets.map(async (asset) => {
      const targetPath = path.join(appRoot, asset.path);
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, asset.contents, "utf8");
    }),
  );

  return assets;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const assets = await writeBrandAssets();
  for (const asset of assets) {
    console.log(`generated ${asset.path}`);
  }
}

export { buildBrandAssets, readLightBrandTokens, writeBrandAssets };
