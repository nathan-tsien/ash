import type { Conversation } from "@ash/shared";

/** Resolve the default workbench entry href from conversation inventory. */
export function firstWorkbenchHref(conversations: Conversation[]): string {
  return conversations[0] ? `/c/${conversations[0].id}` : "/c/conv-1";
}
