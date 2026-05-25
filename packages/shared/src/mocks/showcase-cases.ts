export type ShowcaseCaseId = "case1" | "case2" | "case3" | "case4";

export interface ShowcaseCaseMapping {
  caseId: ShowcaseCaseId;
  conversationId: string;
  /** i18n key (under ShowcaseReplay namespace) for narrative banner copy. */
  narrativeKey: string;
}

export const showcaseCaseMap: Record<ShowcaseCaseId, ShowcaseCaseMapping> = {
  case1: { caseId: "case1", conversationId: "conv-1", narrativeKey: "case1" },
  case2: { caseId: "case2", conversationId: "conv-2", narrativeKey: "case2" },
  case3: { caseId: "case3", conversationId: "conv-3", narrativeKey: "case3" },
  case4: { caseId: "case4", conversationId: "conv-4", narrativeKey: "case4" },
};

export function isShowcaseCaseId(value: string): value is ShowcaseCaseId {
  return value === "case1" || value === "case2" || value === "case3" || value === "case4";
}

/**
 * Lookup is locale-independent (mapping is structural). Consumers fetch
 * locale-specific narrative copy via the i18n key (`narrativeKey`).
 */
export function getShowcaseCase(caseId: string): ShowcaseCaseMapping | undefined {
  return isShowcaseCaseId(caseId) ? showcaseCaseMap[caseId] : undefined;
}
