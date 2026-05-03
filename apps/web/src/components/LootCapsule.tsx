"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

const rarityColor: Record<string, { fill: string; stroke: string; label: string }> = {
  Common: { fill: "#B7C2D6", stroke: "#5C6B85", label: "Common" },
  Rare: { fill: "#2AB2FF", stroke: "#0047BB", label: "Rare" },
  Epic: { fill: "#A86BFF", stroke: "#5C2FAA", label: "Epic" },
  Legendary: { fill: "#FFD23F", stroke: "#A88500", label: "Legendary" }
};

export function LootCapsule({
  rarity = "Rare",
  reward = "Aleo Sticker",
  size = 96,
  onOpen,
  className
}: {
  rarity?: keyof typeof rarityColor;
  reward?: string;
  size?: number;
  onOpen?: () => void;
  className?: string;
}) {
  const [opened, setOpened] = React.useState(false);
  const c = rarityColor[rarity] ?? { fill: "#B7C2D6", stroke: "#5C6B85", label: "Common" };

  function handleClick() {
    if (opened) return;
    setOpened(true);
    onOpen?.();
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative inline-flex flex-col items-center gap-2 focus:outline-none",
        className
      )}
      aria-label={`${rarity} loot capsule, ${reward}`}
    >
      <AnimatePresence>
        {!opened && (
          <motion.div
            key="capsule"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0, rotate: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="animate-wobble cursor-pointer"
          >
            <svg width={size} height={size} viewBox="0 0 96 96">
              <ellipse cx={48} cy={86} rx={28} ry={4} fill="#0A6FD9" opacity={0.25} />
              <path
                d="M48 8 a36 32 0 0 1 36 32 v8 a36 32 0 0 1 -72 0 v-8 a36 32 0 0 1 36 -32z"
                fill={c.fill}
                stroke={c.stroke}
                strokeWidth={4}
              />
              <path
                d="M12 48 h72 v6 a36 32 0 0 1 -72 0z"
                fill="#fff"
                stroke={c.stroke}
                strokeWidth={4}
              />
              <circle cx={48} cy={32} r={6} fill="#fff" stroke={c.stroke} strokeWidth={3} />
              <path
                d="M28 24 q8 -10 24 -8"
                stroke="#fff"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                opacity={0.6}
              />
            </svg>
          </motion.div>
        )}

        {opened && (
          <motion.div
            key="open"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 14 }}
            className="relative flex flex-col items-center"
          >
            {/* confetti */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute h-2 w-2 rounded-full"
                style={{
                  background: ["#FFC800", "#2AB2FF", "#FF4B4B", "#58CC02"][i % 4]
                }}
                initial={{ x: 0, y: 0, scale: 0 }}
                animate={{
                  x: Math.cos((i / 8) * Math.PI * 2) * (size / 1.4),
                  y: Math.sin((i / 8) * Math.PI * 2) * (size / 1.4),
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0]
                }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            ))}
            <div
              className="rounded-card border-4 px-3 py-2 text-center"
              style={{ borderColor: c.stroke, background: c.fill }}
            >
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-white/90">
                {c.label}
              </div>
              <div className="text-sm font-extrabold text-white">{reward}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <span
        className="rounded-chip px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-white"
        style={{ background: c.stroke }}
      >
        {c.label}
      </span>
    </button>
  );
}
