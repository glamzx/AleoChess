"use client";

import * as React from "react";
import { RankBadge, type RankTier } from "./RankBadge";
import { cn } from "@/lib/cn";

const pieceUnicode = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛"
} as const;

export function PlayerStrip({
  name,
  elo,
  rank,
  clock,
  capturedTypes,
  active,
  onTop = false
}: {
  name: string;
  elo: number;
  rank: RankTier;
  clock: string;
  capturedTypes?: Array<keyof typeof pieceUnicode>;
  active?: boolean;
  onTop?: boolean;
}) {
  const lowTime = parseInt(clock.split(":")[0] ?? "1", 10) === 0;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-card bg-white p-2.5 pr-3 shadow-card",
        active && "ring-2 ring-sky"
      )}
    >
      <RankBadge tier={rank} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-extrabold text-navy">{name}</span>
          <span className="tabnum text-[11px] font-extrabold text-muted">
            {elo}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-0.5 text-sm leading-none text-muted">
          {capturedTypes?.map((p, i) => (
            <span key={i} className="opacity-70">
              {pieceUnicode[p]}
            </span>
          ))}
        </div>
      </div>
      <div
        className={cn(
          "tabnum rounded-card px-3 py-2 text-lg font-extrabold shadow-card",
          lowTime
            ? "animate-flame bg-lossRed text-white"
            : active
            ? "bg-sky text-white"
            : "bg-pale text-navy"
        )}
        aria-label="Clock"
      >
        {clock}
      </div>
    </div>
  );
}
