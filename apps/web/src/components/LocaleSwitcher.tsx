"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

const locales = ["ru", "kk", "en"] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("locales");
  const router = useRouter();

  function switchLocale(nextLocale: string) {
    // Set locale via cookie (no URL prefix — we use localePrefix: "never")
    document.cookie = `NEXT_LOCALE=${nextLocale};path=/;max-age=31536000;SameSite=lax`;
    // Reload the current page to apply the new locale
    router.refresh();
    // Small delay to ensure cookie is set before refresh takes effect
    setTimeout(() => window.location.reload(), 100);
  }

  return (
    <div className="grid grid-cols-3 gap-1 rounded-card bg-pale p-1">
      {locales.map((next) => (
        <button
          key={next}
          onClick={() => switchLocale(next)}
          className={cn(
            "rounded-chip px-3 py-2 text-xs font-extrabold transition",
            locale === next ? "bg-white text-navy shadow-card" : "text-cobalt"
          )}
        >
          {t(next)}
        </button>
      ))}
    </div>
  );
}
