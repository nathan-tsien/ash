"use server";

import { cookies } from "next/headers";
import { isAshLocale } from "@ash/shared";
import { LOCALE_COOKIE } from "@/i18n/locale-cookie";

/**
 * Persist the app-zone locale.
 *
 * The `(workbench)` root layouts resolve their locale from the `ash_locale`
 * cookie (there is no `/[locale]/` path segment), so the in-app language picker
 * writes the choice here. The caller refreshes afterwards so server components
 * re-render under the new locale.
 */
export async function setLocaleCookie(locale: string): Promise<void> {
  if (!isAshLocale(locale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    // 1 year — a deliberate, durable language preference.
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
