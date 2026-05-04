import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, isLocale } from "./i18n-config";

export default getRequestConfig(async ({ requestLocale }) => {
  // Try requestLocale first, then fall back to cookie
  let locale: string | undefined;

  try {
    locale = await requestLocale;
  } catch {
    // requestLocale may not be available
  }

  // Fall back to cookie
  if (!locale || !isLocale(locale)) {
    try {
      const cookieStore = await cookies();
      locale = cookieStore.get("NEXT_LOCALE")?.value;
    } catch {
      // cookies() may not be available in some contexts
    }
  }

  const finalLocale = isLocale(locale) ? locale : defaultLocale;

  return {
    locale: finalLocale,
    messages: (await import(`./messages/${finalLocale}.json`)).default
  };
});
