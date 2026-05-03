"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChessboardWrapper } from "./ChessboardWrapper";
import { ChunkyButton } from "./ChunkyButton";
import { dailyPuzzle } from "@/lib/mock";

export function DailyPuzzleCard({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("dailyPuzzle");
  return (
    <div className="rounded-hero bg-gradient-to-br from-pale to-white p-4 shadow-card">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-proGoldDark" />
        <span className="text-xs font-extrabold uppercase tracking-widest text-cobalt">
          {t("label")}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-chip bg-white px-2 py-0.5 text-[11px] font-extrabold text-navy">
          <Clock className="h-3 w-3" /> 18:42
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className={compact ? "scale-90 origin-left" : ""}>
          <ChessboardWrapper
            position={dailyPuzzle.fen}
            size={compact ? 140 : 180}
            showCoords={false}
            boardTheme="ocean"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-extrabold leading-tight text-navy">
            {t("title")}
          </h3>
          <p className="mt-1 text-xs font-bold text-muted">
            {t("theme", { theme: dailyPuzzle.theme, rating: dailyPuzzle.rating })}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-chip bg-coin/30 px-2 py-1 text-[11px] font-extrabold text-navy">
              {t("reward", { reward: dailyPuzzle.reward })}
            </span>
            <Link href="/puzzles">
              <ChunkyButton size="sm">{t("solve")}</ChunkyButton>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
