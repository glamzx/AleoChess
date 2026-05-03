"use client";

import { CoinIcon } from "./CoinBalance";
import { cn } from "@/lib/cn";

export function WagerIndicator({
  pot,
  leftAvatar,
  rightAvatar,
  className
}: {
  pot: number;
  leftAvatar?: string;
  rightAvatar?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-proGold px-3 py-1.5 shadow-chunkyGold",
        className
      )}
    >
      {leftAvatar && (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[10px] font-extrabold text-cobalt">
          {leftAvatar}
        </span>
      )}
      <CoinIcon size={18} />
      <span className="tabnum text-sm font-extrabold text-navy">
        {pot.toLocaleString("en-US")} pot
      </span>
      {rightAvatar && (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[10px] font-extrabold text-cobalt">
          {rightAvatar}
        </span>
      )}
    </div>
  );
}
