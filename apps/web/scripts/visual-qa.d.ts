export interface VisualQaCase {
  id: string;
  surface: "marketing" | "auth" | "workbench";
  theme: "light" | "dark";
  path: string;
  expectedText?: string;
}

export interface VisualQaAssetCheck {
  label: string;
  path: string;
  contentType: string;
}

export const VISUAL_QA_CASES: VisualQaCase[];
export const VISUAL_QA_ASSET_CHECKS: VisualQaAssetCheck[];
export function runVisualQa(): Promise<unknown>;
