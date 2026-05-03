"use client";

import * as React from "react";
import { ChevronUp, ChevronDown, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

const flagFor: Record<string, string> = {
  KZ: "🇰🇿",
  RU: "🇷🇺",
  UZ: "🇺🇿",
  KG: "🇰🇬",
  TJ: "🇹🇯",
  TM: "🇹🇲",
  UA: "🇺🇦",
  BY: "🇧🇾",
  GE: "🇬🇪",
  AM: "🇦🇲",
  AZ: "🇦🇿"
};

function countryFlag(countryCode: string) {
  const code = countryCode.trim().toUpperCase();
  if (flagFor[code]) return flagFor[code];
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
}

export function CityCard({
  city,
  country,
  rank,
  trend,
  highlight,
  className
}: {
  city: string;
  country: string;
  rank: number;
  trend: "up" | "down" | "flat";
  highlight?: boolean;
  className?: string;
}) {
  const trendIcon =
    trend === "up" ? (
      <ChevronUp className="h-4 w-4 text-winGreen" />
    ) : trend === "down" ? (
      <ChevronDown className="h-4 w-4 text-lossRed" />
    ) : (
      <Minus className="h-4 w-4 text-muted" />
    );

  return (
    <div
      className={cn(
        "rounded-card p-4 shadow-card",
        highlight ? "bg-pale ring-2 ring-sky" : "bg-white",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl leading-none">{countryFlag(country)}</span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-extrabold uppercase tracking-widest text-muted">
            City rank
          </div>
          <div className="truncate text-lg font-extrabold text-navy">{city}</div>
        </div>
        <div className="text-right">
          <div className="tabnum text-2xl font-extrabold text-cobalt">#{rank}</div>
          <div className="flex items-center justify-end text-xs font-bold text-muted">
            this week {trendIcon}
          </div>
        </div>
      </div>
    </div>
  );
}

export { flagFor, countryFlag };
