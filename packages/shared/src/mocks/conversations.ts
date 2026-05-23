import type { Conversation } from "../types";
import { bcp47Locale, type AshLocale } from "./locale";
import { mockConversationsEn } from "./conversations-en";
import { mockConversationsZh, mockUser } from "./conversations-zh";

export { mockUser };

export function getMockConversations(locale: AshLocale): Conversation[] {
  return locale === "en" ? mockConversationsEn : mockConversationsZh;
}

export function getConversation(
  id: string,
  locale: AshLocale,
): Conversation | undefined {
  return getMockConversations(locale).find((c) => c.id === id);
}

export function formatRelativeTime(iso: string, locale: AshLocale): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat(bcp47Locale(locale), {
    numeric: "auto",
  });

  const past = diffMs >= 0;
  const sign = past ? -1 : 1;

  if (Math.abs(diffSec) < 45) return rtf.format(sign * diffSec, "second");
  if (Math.abs(diffMin) < 60) return rtf.format(sign * diffMin, "minute");
  if (Math.abs(diffHour) < 24) return rtf.format(sign * diffHour, "hour");
  if (Math.abs(diffDay) < 7) return rtf.format(sign * diffDay, "day");

  return date.toLocaleDateString(bcp47Locale(locale), {
    month: "short",
    day: "numeric",
  });
}
