"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { rankTierFromElo } from "@/lib/chess/elo";

export type RankTier =
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond"
  | "Master"
  | "Grandmaster";

const tierData: Record<
  RankTier,
  { fill: string; rim: string; gem: string; star?: number }
> = {
  Bronze: { fill: "#CD7F32", rim: "#7B4717", gem: "#FFD89A" },
  Silver: { fill: "#C0C0C0", rim: "#7A7A7A", gem: "#FFFFFF" },
  Gold: { fill: "#FFD23F", rim: "#A88500", gem: "#FFF6B0" },
  Platinum: { fill: "#9FE6DA", rim: "#3F8E7E", gem: "#E8FFFB" },
  Diamond: { fill: "#7CC1FF", rim: "#0047BB", gem: "#E1F5FF" },
  Master: { fill: "#A86BFF", rim: "#5C2FAA", gem: "#F2E5FF", star: 1 },
  Grandmaster: { fill: "#FF4B4B", rim: "#9A1F1F", gem: "#FFD3D3", star: 3 }
};

export interface RankBadgeProps {
  tier?: RankTier;
  size?: number;
  showLabel?: boolean;
  className?: string;
  elo?: number;
}

export function RankBadge({
  tier,
  size = 64,
  showLabel,
  elo,
  className
}: RankBadgeProps) {
  const derivedTier = tier ?? rankTierFromElo(elo ?? 1200);
  const t = tierData[derivedTier];
  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <svg
        viewBox="0 0 80 80"
        width={size}
        height={size}
        aria-label={`Rank: ${derivedTier}`}
        role="img"
      >
        {/* shield */}
        <path
          d="M40 6 L70 16 V40 Q70 64 40 76 Q10 64 10 40 V16 Z"
          fill={t.fill}
          stroke={t.rim}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        {/* gem inset */}
        <circle cx={40} cy={38} r={14} fill={t.gem} stroke={t.rim} strokeWidth={3} />
        {/* shine */}
        <path d="M30 30 q6 -8 18 -6" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.7} />
        {/* tier-specific stars */}
        {t.star &&
          Array.from({ length: t.star }).map((_, i) => (
            <path
              key={i}
              d="M0 -5 L1.5 -1.5 L5 -1 L2.2 1.4 L3 5 L0 3 L-3 5 L-2.2 1.4 L-5 -1 L-1.5 -1.5 Z"
              fill="#FFD700"
              stroke={t.rim}
              strokeWidth={1}
              transform={`translate(${28 + i * 12} 60)`}
            />
          ))}
      </svg>
      {showLabel && (
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-cobalt">
            {derivedTier}
          </span>
          {typeof elo === "number" && (
            <span className="tabnum text-xs font-extrabold text-navy">
              {elo} Elo
            </span>
          )}
        </div>
      )}
    </div>
  );
}
