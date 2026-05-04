"use client";

/**
 * /play/bot — Bot game lobby.
 *
 * Pre-game configuration: difficulty, time control, side selection.
 * On "Start Game" → generates UUID, navigates to /play/bot/[gameId].
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Bot, Swords, Crown, Zap, Brain, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AleoMascot } from "@/components/AleoMascot";
import { ChunkyButton } from "@/components/ChunkyButton";
import { cn } from "@/lib/cn";
import type { BotDifficulty } from "@/lib/chess/game-state";

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

interface DifficultyOption {
  key: BotDifficulty;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  desc: string;
}

interface TimeOption {
  label: string;
  initialMs: number;
  incrementMs: number;
  sub: string;
}

type SideChoice = "white" | "black" | "random";

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const DIFFICULTIES: DifficultyOption[] = [
  {
    key: "easy",
    label: "Rookie Bot",
    icon: <Bot className="h-6 w-6" />,
    color: "#58CC02",
    bgColor: "bg-[#58CC02]/10",
    desc: "Casual learner · gentle moves",
  },
  {
    key: "casual",
    label: "Cafe Player",
    icon: <Swords className="h-6 w-6" />,
    color: "#2AB2FF",
    bgColor: "bg-sky/10",
    desc: "Casual challenge · knows basics",
  },
  {
    key: "club",
    label: "Club Rival",
    icon: <Crown className="h-6 w-6" />,
    color: "#FFC800",
    bgColor: "bg-[#FFC800]/10",
    desc: "Harder tactics · fewer mistakes",
  },
  {
    key: "strong",
    label: "Master Bot",
    icon: <Brain className="h-6 w-6" />,
    color: "#FF4B4B",
    bgColor: "bg-lossRed/10",
    desc: "Hard mode · engine strength",
  },
];

const TIME_CONTROLS: TimeOption[] = [
  { label: "1+0", initialMs: 60_000, incrementMs: 0, sub: "Bullet" },
  { label: "3+0", initialMs: 180_000, incrementMs: 0, sub: "Blitz" },
  { label: "5+3", initialMs: 300_000, incrementMs: 3_000, sub: "Blitz" },
  { label: "10+0", initialMs: 600_000, incrementMs: 0, sub: "Rapid" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BotLobbyPage() {
  const t = useTranslations("bot");
  const router = useRouter();

  const [difficulty, setDifficulty] = React.useState<BotDifficulty>("casual");
  const [tcIdx, setTcIdx] = React.useState(2); // 5+3 default
  const [side, setSide] = React.useState<SideChoice>("white");
  const [loading, setLoading] = React.useState(false);

  function handleStart() {
    setLoading(true);
    const gameId = crypto.randomUUID();
    const tc = TIME_CONTROLS[tcIdx]!;
    const chosenSide =
      side === "random" ? (Math.random() < 0.5 ? "white" : "black") : side;

    // Encode config in query params for the game page to consume
    const params = new URLSearchParams({
      d: difficulty,
      t: `${tc.initialMs},${tc.incrementMs}`,
      s: chosenSide,
      tc: tc.label,
    });

    router.push(`/play/bot/${gameId}?${params.toString()}`);
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center bg-gradient-to-b from-pale via-white to-pale px-5 pb-10 pt-6">
      <span className="pointer-events-none absolute -left-16 -top-10 h-48 w-48 rounded-full bg-sky/30 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-proGold/30 blur-3xl" />

      {/* Header */}
      <header className="flex w-full items-center gap-3">
        <Link
          href="/play"
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-cobalt shadow-card"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-extrabold text-navy">{t("title")}</h1>
      </header>

      {/* Mascot */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 16 }}
        className="mt-4"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot/bot-star.png" alt="Play Bot" className="h-28 w-28 object-contain drop-shadow-md" />
      </motion.div>

      {/* Difficulty picker */}
      <section className="mt-6 w-full max-w-md">
        <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-cobalt">
          {t("difficulty")}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {DIFFICULTIES.map((d) => {
            const active = difficulty === d.key;
            return (
              <button
                key={d.key}
                onClick={() => setDifficulty(d.key)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-card border-2 p-4 text-center transition active:scale-95",
                  active
                    ? "border-sky bg-white shadow-hero"
                    : "border-pale bg-white shadow-card hover:border-sky/40"
                )}
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-full text-white"
                  style={{ background: d.color }}
                >
                  {d.icon}
                </span>
                <span className="text-sm font-extrabold text-navy">
                  {d.label}
                </span>
                <span className="text-[10px] font-bold text-muted">
                  {d.desc}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Time control picker */}
      <section className="mt-6 w-full max-w-md">
        <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-cobalt">
          {t("timeControl")}
        </h2>
        <div className="flex gap-2">
          {TIME_CONTROLS.map((tc, idx) => {
            const active = tcIdx === idx;
            return (
              <button
                key={tc.label}
                onClick={() => setTcIdx(idx)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-chip py-3 text-xs font-extrabold transition",
                  active
                    ? "bg-sky text-white shadow-chunky"
                    : "bg-white text-navy shadow-card hover:bg-pale"
                )}
              >
                <span className="text-base font-extrabold">{tc.label}</span>
                <span className="text-[10px] uppercase tracking-widest opacity-80">
                  {tc.sub}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Side picker */}
      <section className="mt-6 w-full max-w-md">
        <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-cobalt">
          {t("side")}
        </h2>
        <div className="flex gap-2">
          {(
            [
              { key: "white" as SideChoice, label: t("white"), icon: "♔" },
              { key: "random" as SideChoice, label: t("random"), icon: "🎲" },
              { key: "black" as SideChoice, label: t("black"), icon: "♚" },
            ] as const
          ).map((s) => {
            const active = side === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSide(s.key)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-chip py-3 text-sm font-extrabold transition",
                  active
                    ? "bg-navy text-white shadow-chunky"
                    : "bg-white text-navy shadow-card hover:bg-pale"
                )}
              >
                <span className="text-2xl">{s.icon}</span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Start CTA */}
      <div className="mt-8 w-full max-w-md">
        <ChunkyButton
          block
          size="xl"
          pill
          variant="pro"
          iconLeft={<Zap className="h-5 w-5" />}
          onClick={handleStart}
          loading={loading}
          className="!bg-gradient-to-r !from-sky !to-cobalt !text-white !shadow-[0_4px_0_0_#0047BB] active:!shadow-[0_2px_0_0_#0047BB]"
        >
          {t("start")}
        </ChunkyButton>
      </div>
    </main>
  );
}
