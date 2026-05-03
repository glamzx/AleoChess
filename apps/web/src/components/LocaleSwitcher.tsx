"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const locales = ["ru", "kk", "en"] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("locales");
  const router = useRouter();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();

  function switchLocale(nextLocale: string) {
    const withoutLocale = pathname.replace(/^\/(ru|kk|en)(?=\/|$)/, "") || "/";
    const query = searchParams.toString();
    router.replace(`/${nextLocale}${withoutLocale === "/" ? "" : withoutLocale}${query ? `?${query}` : ""}`);
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
