"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export function StreakFlame({
  count,
  active = true,
  size = 28,
  className
}: {
  count: number;
  active?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow-card",
        !active && "grayscale opacity-70",
        className
      )}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className={active ? "animate-flame" : ""}
        aria-hidden
      >
        <path
          d="M16 2 c4 6 10 8 10 16 a10 10 0 11-20 0 c0-6 6-8 10-16z"
          fill={active ? "#FFC800" : "#9AA8C0"}
          stroke="#9A6B00"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <path
          d="M16 12 c2 3 5 5 5 9 a5 5 0 11-10 0 c0-3 3-4 5-9z"
          fill={active ? "#FF7A00" : "#7A8AA8"}
          stroke="#7A3A00"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </svg>
      <span className="tabnum text-sm font-extrabold text-navy">{count}</span>
    </div>
  );
}

export const StreakBadge = StreakFlame;
