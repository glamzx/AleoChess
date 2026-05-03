"use client";

import * as React from "react";
import { ChevronUp, ChevronDown, Minus } from "lucide-react";
import { RankBadge, type RankTier } from "./RankBadge";
import { cn } from "@/lib/cn";

type Variant = "city" | "clan" | "friend" | "global";

export interface LeaderboardRowProps {
  variant: Variant;
  rank: number;
  name: string;
  subtitle?: string;
  flag?: string;
  points?: number;
  trend?: "up" | "down" | "flat";
  rankBadge?: RankTier;
  online?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
  rightSlot?: React.ReactNode;
}

const trendIcon = {
  up: <ChevronUp className="h-4 w-4 text-winGreen" />,
  down: <ChevronDown className="h-4 w-4 text-lossRed" />,
  flat: <Minus className="h-4 w-4 text-muted" />
};

export function LeaderboardRow({
  variant,
  rank,
  name,
  subtitle,
  flag,
  points,
  trend = "flat",
  rankBadge,
  online,
  highlighted,
  onClick,
  rightSlot
}: LeaderboardRowProps) {
  const isPodium = rank <= 3;
  const podiumColor =
    rank === 1
      ? "bg-proGold text-navy"
      : rank === 2
      ? "bg-[#C0C0C0] text-navy"
      : rank === 3
      ? "bg-[#CD7F32] text-white"
      : "bg-pale text-cobalt";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-card bg-white p-3 text-left shadow-card transition",
        highlighted && "ring-2 ring-sky",
        onClick && "hover:bg-pale active:scale-[0.99]"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-extrabold tabnum",
          isPodium ? podiumColor : "bg-pale text-cobalt"
        )}
      >
        {rank}
      </div>

      {variant === "city" && flag && (
        <span className="text-2xl leading-none">{flag}</span>
      )}

      {variant === "friend" && rankBadge && <RankBadge tier={rankBadge} size={36} />}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-extrabold text-navy">{name}</span>
          {online && (
            <span className="h-2 w-2 rounded-full bg-winGreen" aria-label="online" />
          )}
        </div>
        {subtitle && (
          <div className="truncate text-xs font-bold text-muted">{subtitle}</div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {typeof points === "number" && (
          <span className="tabnum text-sm font-extrabold text-navy">
            {points.toLocaleString("en-US")}
          </span>
        )}
        {variant !== "friend" && trendIcon[trend]}
        {rightSlot}
      </div>
    </button>
  );
}
