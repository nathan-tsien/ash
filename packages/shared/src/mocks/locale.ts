/** URL / app locale identifiers used by ash web and mocks. */
export type AshLocale = "zh" | "en";

export const ASH_LOCALES: AshLocale[] = ["zh", "en"];

export function isAshLocale(value: string): value is AshLocale {
  return value === "zh" || value === "en";
}

export function bcp47Locale(locale: AshLocale): string {
  return locale === "en" ? "en-US" : "zh-CN";
}
