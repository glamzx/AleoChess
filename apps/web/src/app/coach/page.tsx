"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { ChessboardWrapper } from "@/components/ChessboardWrapper";
import { ChunkyButton } from "@/components/ChunkyButton";
import { AleoMascot } from "@/components/AleoMascot";
import { reviewMockMoves, midGameFen } from "@/lib/mock";
import { cn } from "@/lib/cn";

// TODO: wire to root-level Stockfish WASM for per-move evaluation + best alternatives.

const classBadge: Record<string, { label: string; bg: string; fg: string }> = {
  best: { label: "Best", bg: "#58CC0222", fg: "#3F9101" },
  good: { label: "Good", bg: "#2AB2FF22", fg: "#0047BB" },
  inaccuracy: { label: "Inaccuracy", bg: "#FFC80022", fg: "#9A6B00" },
  mistake: { label: "Mistake", bg: "#FF8A0022", fg: "#9A4F00" },
  blunder: { label: "Blunder", bg: "#FF4B4B22", fg: "#C73838" },
  brilliant: { label: "Brilliant", bg: "#A86BFF22", fg: "#5C2FAA" }
};

export default function CoachPage() {
  const [idx, setIdx] = React.useState(11); // points to the blunder for demo
  const move = reviewMockMoves[idx]!;
  const evalCp = move.evalCp;
  // simple eval bar: clamp to [-500, 500]
  const pct = Math.max(-1, Math.min(1, evalCp / 500));
  const whitePct = 50 + pct * 50;

  return (
    <main className="flex min-h-[100dvh] flex-col bg-surfaceLight">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-surfaceLight px-4 py-3">
        <Link
          href="/review"
          className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-cobalt shadow-card"
        >
          <ChevronLeft className="h-4 w-4" /> Review
        </Link>
        <span className="text-xs font-extrabold uppercase tracking-widest text-cobalt">
          AI Coach
        </span>
        <span className="w-16" />
      </header>

      <section className="flex flex-1 flex-col items-center justify-start gap-3 px-3 lg:flex-row lg:items-start lg:gap-6 lg:px-6">
        {/* eval bar + board */}
        <div className="flex w-full justify-center gap-2 lg:w-auto">
          <div className="relative h-[300px] w-6 overflow-hidden rounded-card bg-navy lg:h-[420px]">
            <div
              className="absolute bottom-0 w-full bg-white transition-all"
              style={{ height: `${whitePct}%` }}
            />
            <span className="absolute left-1/2 top-1 -translate-x-1/2 tabnum text-[10px] font-extrabold text-white">
              {evalCp >= 0 ? "+" : ""}
              {(evalCp / 100).toFixed(1)}
            </span>
          </div>
          <ChessboardWrapper
            position={midGameFen}
            size={300}
            boardTheme="ocean"
            highlightLast={{ from: "e7", to: "e6" }}
            className="lg:!size-[420px]"
          />
        </div>

        {/* speech bubble + move list */}
        <div className="flex w-full flex-1 flex-col gap-3">
          <div className="flex items-start gap-3 rounded-hero bg-white p-4 shadow-card">
            <AleoMascot mood={move.classification === "blunder" ? "sad" : "thinking"} size={88} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="rounded-chip px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest"
                  style={{
                    background: classBadge[move.classification]?.bg,
                    color: classBadge[move.classification]?.fg
                  }}
                >
                  {classBadge[move.classification]?.label}
                </span>
                <span className="tabnum font-extrabold text-navy">{move.san}</span>
              </div>
              <p className="mt-2 text-sm font-bold text-navy">
                {"comment" in move && move.comment
                  ? move.comment
                  : "Solid move — keeps the position balanced."}
              </p>
              {"bestAlt" in move && move.bestAlt && (
                <div className="mt-3 flex items-center gap-2 rounded-card bg-pale px-3 py-2">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-cobalt">
                    Better:
                  </span>
                  <span className="tabnum font-extrabold text-cobalt">
                    {move.bestAlt}
                  </span>
                  <ChunkyButton
                    size="sm"
                    variant="success"
                    className="ml-auto"
                    iconLeft={<Play className="h-3 w-3" />}
                  >
                    Try the better move
                  </ChunkyButton>
                </div>
              )}
            </div>
          </div>

          {/* move scrubber */}
          <div className="rounded-card bg-white p-3 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                className="grid h-9 w-9 place-items-center rounded-full bg-pale text-cobalt"
                aria-label="Previous"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <input
                type="range"
                min={0}
                max={reviewMockMoves.length - 1}
                value={idx}
                onChange={(e) => setIdx(Number(e.target.value))}
                className="flex-1 accent-sky"
                aria-label="Move scrubber"
              />
              <button
                onClick={() =>
                  setIdx((i) => Math.min(reviewMockMoves.length - 1, i + 1))
                }
                className="grid h-9 w-9 place-items-center rounded-full bg-pale text-cobalt"
                aria-label="Next"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {reviewMockMoves.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={cn(
                    "rounded-chip px-2 py-1 text-xs font-extrabold transition",
                    i === idx
                      ? "bg-sky text-white shadow-card"
                      : m.classification === "blunder"
                      ? "bg-lossRed/15 text-lossRed"
                      : m.classification === "mistake"
                      ? "bg-[#FF8A00]/15 text-[#9A4F00]"
                      : m.classification === "brilliant"
                      ? "bg-sparkle/15 text-sparkle"
                      : "bg-pale text-cobalt"
                  )}
                >
                  <span className="tabnum">{i + 1}.</span> {m.san}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
