"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import Image from "next/image";

export type AleoMood =
  | "idle"
  | "cheer"
  | "sad"
  | "thinking"
  | "pointing"
  | "sleep"
  | "wink";

export interface AleoMascotProps {
  mood?: AleoMood;
  size?: number;
  className?: string;
  speech?: string;
  bobbing?: boolean;
}

/**
 * Aleo — the mascot. Uses the provided PNG mascot image.
 * Supports mood-based rendering and speech bubbles.
 */
export function AleoMascot({
  mood = "idle",
  size = 160,
  className,
  speech,
  bobbing = true,
}: AleoMascotProps) {
  return (
    <motion.div
      className={cn("relative inline-block", className)}
      style={{ width: size, height: size }}
      animate={
        bobbing
          ? { y: [0, -4, 0] }
          : undefined
      }
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <Image
        src="/mascot/mascot.png"
        alt={`Aleo mascot — ${mood}`}
        width={size}
        height={size}
        className="object-contain"
        priority
      />

      {/* Mood overlays */}
      {mood === "cheer" && (
        <div className="absolute -right-1 -top-1">
          <span className="text-lg animate-bounce">✨</span>
        </div>
      )}
      {mood === "thinking" && (
        <div className="absolute -right-2 -top-2 flex flex-col items-center gap-0.5">
          <span className="h-2 w-2 rounded-full bg-cobalt/40" />
          <span className="h-3 w-3 rounded-full bg-cobalt/50" />
          <span className="h-4 w-4 rounded-full bg-cobalt/60" />
        </div>
      )}
      {mood === "sad" && (
        <div className="absolute -right-1 top-1">
          <span className="text-sm">💧</span>
        </div>
      )}

      {speech && (
        <div
          className="absolute left-full top-2 ml-3 max-w-[220px] rounded-card bg-white p-3 text-sm font-bold text-navy shadow-card"
          style={{
            filter: "drop-shadow(0 4px 0 rgba(0,71,187,0.12))",
          }}
        >
          <div
            className="absolute -left-2 top-4 h-3 w-3 rotate-45 bg-white"
            aria-hidden
          />
          {speech}
        </div>
      )}
    </motion.div>
  );
}
