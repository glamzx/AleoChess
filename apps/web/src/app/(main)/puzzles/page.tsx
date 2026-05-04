"use client";

import * as React from "react";
import Link from "next/link";
import { Zap, Timer } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChunkyButton } from "@/components/ChunkyButton";
import { DailyPuzzleCard } from "@/components/DailyPuzzleCard";
import { puzzlePacks } from "@/lib/mock";

function ProgressRing({ value, color }: { value: number; color: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
      <circle cx={24} cy={24} r={r} fill="none" stroke="#E1F5FF" strokeWidth={5} />
      <circle
        cx={24}
        cy={24}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
      />
    </svg>
  );
}

export default function PuzzlesPage() {
  const t = useTranslations("puzzles");
  return (
    <div className="space-y-5 pt-2">
      <h1 className="text-3xl font-extrabold text-navy">{t("title")}</h1>

      <DailyPuzzleCard />

      {/* Puzzle Rush */}
      <Link
        href="/puzzles/rush"
        className="block overflow-hidden rounded-hero bg-gradient-to-br from-lossRed to-[#C73838] p-5 text-white shadow-hero"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/20">
            <Zap className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h3 className="text-xl font-extrabold">{t("rush")}</h3>
            <p className="text-xs font-bold text-white/80">
              {t("rushBody")}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-chip bg-white/15 px-2 py-1 text-xs font-extrabold">
            <Timer className="h-3 w-3" /> 3:00
          </span>
        </div>
        <div className="mt-3">
          <ChunkyButton
            variant="pro"
            size="md"
            pill
            className="!bg-white !text-lossRed !shadow-[0_4px_0_0_#C73838]"
          >
            {t("startRush")}
          </ChunkyButton>
        </div>
      </Link>

      {/* themed packs */}
      <section>
        <h3 className="mb-2 text-base font-extrabold text-navy">{t("themes")}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {puzzlePacks.map((p) => {
            const pct = p.solved / p.total;
            return (
              <Link
                key={p.name}
                href="/puzzles"
                className="flex flex-col items-start gap-2 rounded-card bg-white p-4 shadow-card transition active:scale-[0.99]"
              >
                <div className="flex w-full items-center justify-between">
                  <ProgressRing value={pct} color={p.hue} />
                  <span className="tabnum text-sm font-extrabold text-cobalt">
                    {p.solved}/{p.total}
                  </span>
                </div>
                <div>
                  <div className="text-base font-extrabold text-navy">{p.name}</div>
                  <div className="text-xs font-bold text-muted">
                    {pct === 0
                      ? t("startNow")
                      : pct === 1
                      ? t("allDone")
                      : t("donePercent", { percent: Math.round(pct * 100) })}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
