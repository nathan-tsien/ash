import { cookies } from "next/headers";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { LOCALE_COOKIE } from "./locale-cookie";

export default getRequestConfig(async ({ requestLocale }) => {
  // 1. Prefer the path-resolved locale (the localized `/[locale]/` site zone).
  const requested = await requestLocale;
  let locale = hasLocale(routing.locales, requested) ? requested : undefined;

  // 2. App zone (`/app`, `/c`) has no path locale: fall back to the cookie.
  if (!locale) {
    const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (hasLocale(routing.locales, cookieLocale)) {
      locale = cookieLocale;
    }
  }

  // 3. Otherwise use the configured default.
  if (!locale) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    onError(error) {
      if (error.code === "MISSING_MESSAGE") {
        // Log missing keys in development instead of crashing
        if (process.env.NODE_ENV === "development") {
          console.warn(`[i18n] ${error.message}`);
        }
      } else {
        throw error;
      }
    },
  };
});
