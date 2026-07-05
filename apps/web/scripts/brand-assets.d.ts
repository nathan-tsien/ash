export interface BrandAsset {
  path: string;
  contents: string;
}

export interface LightBrandTokens {
  background: string;
  foreground: string;
  ember: string;
  emberSoft: string;
}

export function readLightBrandTokens(cssText: string): LightBrandTokens;
export function buildBrandAssets(cssText: string): BrandAsset[];
export function writeBrandAssets(): Promise<BrandAsset[]>;
