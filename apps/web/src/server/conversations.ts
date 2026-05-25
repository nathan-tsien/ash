import "server-only";

import {
  getConversation as getMockConversation,
  getMockConversations,
  type AshLocale,
  type Conversation,
} from "@ash/shared";

/** Phase 1: backed by deterministic mocks; Phase 2 swaps internals to ash-server. */
export async function listConversations(
  locale: AshLocale,
): Promise<Conversation[]> {
  return getMockConversations(locale);
}

export async function getActiveConversation(
  id: string,
  locale: AshLocale,
): Promise<Conversation | undefined> {
  return getMockConversation(id, locale);
}
