export const locales = ["ru", "kk", "en"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "ru";

export function isLocale(value: string | undefined): value is AppLocale {
  return value === "ru" || value === "kk" || value === "en";
}
