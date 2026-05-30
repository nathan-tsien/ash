import "server-only";

import type { AshLocale, Conversation } from "@ash/shared";

export async function listConversations(
  _locale: AshLocale,
): Promise<Conversation[]> {
  return [];
}

export async function getActiveConversation(
  _id: string,
  _locale: AshLocale,
): Promise<Conversation | undefined> {
  return undefined;
}
