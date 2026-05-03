"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFormatter } from "next-intl";
import { cn } from "@/lib/cn";

export function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx={12} cy={12} r={10} fill="#FFC800" stroke="#9A6B00" strokeWidth={2} />
      <circle cx={12} cy={12} r={6.5} fill="#FFE57A" stroke="#9A6B00" strokeWidth={1.5} />
      <text
        x={12}
        y={16}
        textAnchor="middle"
        fontSize={9}
        fontWeight={900}
        fill="#9A6B00"
      >
        ¢
      </text>
    </svg>
  );
}

export function CoinBalance({
  amount,
  size = "md",
  className,
  showSign = false
}: {
  amount: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  showSign?: boolean;
}) {
  const format = useFormatter();
  const sizes = {
    sm: { wrap: "h-7 px-2 text-xs", icon: 14 },
    md: { wrap: "h-9 px-3 text-sm", icon: 18 },
    lg: { wrap: "h-12 px-4 text-base", icon: 22 }
  } as const;
  const s = sizes[size];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white font-extrabold text-navy shadow-card",
        s.wrap,
        className
      )}
    >
      <CoinIcon size={s.icon} />
      <AnimatePresence mode="popLayout">
        <motion.span
          key={amount}
          initial={{ y: 6, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -6, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="tabnum"
        >
          {showSign && amount >= 0 ? "+" : ""}
          {format.number(amount)}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
