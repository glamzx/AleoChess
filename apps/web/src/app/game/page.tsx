"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Flag, Handshake, MessageCircle, Settings as SettingsIcon, ChevronUp } from "lucide-react";
import { ChessboardWrapper } from "@/components/ChessboardWrapper";
import { ChunkyButton } from "@/components/ChunkyButton";
import { PlayerStrip } from "@/components/PlayerStrip";
import { WagerIndicator } from "@/components/WagerIndicator";
import { recentMoves, midGameFen, me } from "@/lib/mock";
import { cn } from "@/lib/cn";

// TODO: wire to root-level Stockfish WASM for opponent moves & analysis.

export default function GamePage() {
  const t = useTranslations("game");
  const [drawer, setDrawer] = React.useState(false);
  const [whiteClock, setWhiteClock] = React.useState("4:32");
  const [blackClock] = React.useState("4:55");

  return (
    <main className="flex min-h-[100dvh] flex-col bg-surfaceLight">
      {/* opponent strip + pot */}
      <header className="sticky top-0 z-20 flex flex-col gap-2 bg-surfaceLight px-3 pb-2 pt-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/play"
            className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-cobalt shadow-card"
          >
            ← Exit
          </Link>
          <WagerIndicator pot={120} />
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-cobalt shadow-card">
            5+0 Blitz
          </span>
        </div>

        <PlayerStrip
          name="Daulet K."
          elo={1612}
          rank="Gold"
          clock={blackClock}
          capturedTypes={["p", "p", "n"]}
        />
      </header>

      {/* board + side panel */}
      <section className="flex flex-1 flex-col items-center justify-center gap-3 px-3 py-3 lg:flex-row lg:items-center lg:gap-6">
        <div className="mx-auto flex w-full max-w-[min(420px,calc(100vw-2rem))] items-center justify-center">
          <ChessboardWrapper
            position={midGameFen}
            size={380}
            boardTheme="ocean"
            highlightLast={{ from: "e2", to: "e4" }}
            responsive
          />
        </div>

        {/* desktop side panel */}
        <aside className="hidden w-72 flex-shrink-0 rounded-card bg-white p-4 shadow-card lg:block">
          <h3 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted">
            {t("moves")}
          </h3>
          <ol className="max-h-72 space-y-1 overflow-auto text-sm font-bold text-navy">
            {recentMoves.map((m, i) => (
              <li key={i} className="grid grid-cols-[24px_1fr_1fr] gap-2 rounded-chip px-2 py-1 odd:bg-pale">
                <span className="tabnum text-muted">{i + 1}.</span>
                <span>{m.white}</span>
                <span>{m.black}</span>
              </li>
            ))}
          </ol>
        </aside>
      </section>

      {/* my strip */}
      <div className="px-3 pb-2">
        <PlayerStrip
          name={me.name}
          elo={me.elo}
          rank={me.rank}
          clock={whiteClock}
          capturedTypes={["p", "b"]}
          active
        />
      </div>

      {/* action bar */}
      <div className="sticky bottom-0 z-20 flex items-center gap-2 border-t-2 border-pale bg-white px-3 py-3">
        <ChunkyButton variant="danger" size="sm" iconLeft={<Flag className="h-4 w-4" />}>
          {t("resign")}
        </ChunkyButton>
        <ChunkyButton variant="ghost" size="sm" iconLeft={<Handshake className="h-4 w-4" />}>
          {t("draw")}
        </ChunkyButton>
        <ChunkyButton
          variant="ghost"
          size="sm"
          iconLeft={<MessageCircle className="h-4 w-4" />}
        >
          {t("chat")}
        </ChunkyButton>
        <ChunkyButton variant="ghost" size="sm" iconLeft={<SettingsIcon className="h-4 w-4" />}>
          {t("settings")}
        </ChunkyButton>
        <button
          onClick={() => setDrawer((d) => !d)}
          className="ml-auto flex items-center gap-1 rounded-full bg-pale px-3 py-2 text-xs font-extrabold text-cobalt lg:hidden"
        >
          {t("moves")}
          <ChevronUp className={cn("h-4 w-4 transition", drawer && "rotate-180")} />
        </button>
      </div>

      {/* mobile move drawer */}
      {drawer && (
        <div className="fixed inset-x-0 bottom-16 z-30 max-h-72 overflow-auto rounded-t-hero border-t-2 border-pale bg-white p-4 shadow-hero lg:hidden">
          <h3 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted">
            {t("moves")}
          </h3>
          <ol className="space-y-1 text-sm font-bold text-navy">
            {recentMoves.map((m, i) => (
              <li
                key={i}
                className="grid grid-cols-[24px_1fr_1fr] gap-2 rounded-chip px-2 py-1 odd:bg-pale"
              >
                <span className="tabnum text-muted">{i + 1}.</span>
                <span>{m.white}</span>
                <span>{m.black}</span>
              </li>
            ))}
          </ol>
          <Link href="/review" className="block">
            <ChunkyButton block size="md" pill className="mt-3">
              Demo: jump to post-game
            </ChunkyButton>
          </Link>
        </div>
      )}
    </main>
  );
}
