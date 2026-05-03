"use client";

import * as React from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { ChevronLeft, ChevronRight, Play, Sparkles } from "lucide-react";
import { useLocale } from "next-intl";
import { AleoMascot } from "@/components/AleoMascot";
import { ChessboardWrapper } from "@/components/ChessboardWrapper";
import { ChunkyButton } from "@/components/ChunkyButton";
import { useGameStore } from "@/lib/chess/game-state";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { analyzeGameMoves, saveMoveAnalyses, type MoveClassification, type ReviewMove } from "@/lib/analysis/review";
import { cn } from "@/lib/cn";

const classBadge: Record<MoveClassification, { label: string; bg: string; fg: string }> = {
  book: { label: "Book", bg: "#0A1F4A18", fg: "#0A1F4A" },
  best: { label: "Best", bg: "#58CC0222", fg: "#3F9101" },
  good: { label: "Good", bg: "#2AB2FF22", fg: "#0047BB" },
  inaccuracy: { label: "Inaccuracy", bg: "#FFC80022", fg: "#9A6B00" },
  mistake: { label: "Mistake", bg: "#FF8A0022", fg: "#9A4F00" },
  blunder: { label: "Blunder", bg: "#FF4B4B22", fg: "#C73838" },
  brilliant: { label: "Brilliant", bg: "#A86BFF22", fg: "#5C2FAA" },
};

const needsCoach = new Set<MoveClassification>(["inaccuracy", "mistake", "blunder", "brilliant"]);

type DbMove = { ply: number; uci: string; san: string; fen_after: string };
type DbGame = { pgn: string | null; result: string | null };
type DbAnalysis = {
  ply: number;
  played_uci: string;
  best_uci: string | null;
  eval_before_cp: number | null;
  eval_after_cp: number | null;
  classification: MoveClassification;
};

function clampEval(cp: number | null) {
  return Math.max(-500, Math.min(500, cp ?? 0));
}

function replayMoves(uciMoves: string[]) {
  const chess = new Chess();
  return uciMoves.map((uci, ply) => {
    const fenBefore = chess.fen();
    const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? "q" });
    return { ply, uci, san: move?.san ?? uci, fenBefore, fenAfter: chess.fen() };
  });
}

function buildFromPersisted(uciMoves: string[], rows: DbAnalysis[]) {
  const replayed = replayMoves(uciMoves);
  return rows
    .sort((a, b) => a.ply - b.ply)
    .map((row) => {
      const move = replayed[row.ply];
      const evalBefore = row.eval_before_cp;
      const evalAfter = row.eval_after_cp;
      return {
        ply: row.ply,
        fenBefore: move?.fenBefore ?? new Chess().fen(),
        fenAfter: move?.fenAfter ?? new Chess().fen(),
        playedUci: row.played_uci,
        playedSan: move?.san ?? row.played_uci,
        bestUci: row.best_uci,
        bestSan: row.best_uci,
        evalBeforeCp: evalBefore,
        evalAfterCp: evalAfter,
        evalDeltaCp: Math.max(0, (evalBefore ?? evalAfter ?? 0) - (evalAfter ?? 0)),
        classification: row.classification,
      } satisfies ReviewMove;
    });
}

export default function GameReviewPage({ params }: { params: { gameId: string } }) {
  const locale = useLocale();
  const storeGameId = useGameStore((s) => s.gameId);
  const storeUci = useGameStore((s) => s.uciHistory);
  const storeResult = useGameStore((s) => s.result);
  const [moves, setMoves] = React.useState<ReviewMove[]>([]);
  const [idx, setIdx] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });
  const [explanations, setExplanations] = React.useState<Record<number, string>>({});
  const [tryFen, setTryFen] = React.useState<string | null>(null);
  const selected = moves[idx];
  const evalCp = selected?.evalAfterCp ?? 0;
  const whitePct = 50 + (clampEval(evalCp) / 500) * 50;

  React.useEffect(() => {
    let canceled = false;
    async function load() {
      const supabase = getSupabaseBrowserClient();
      const [{ data: dbMoves }, { data: dbAnalyses }, { data: game }] = await Promise.all([
        supabase.from("game_moves").select("ply, uci, san, fen_after").eq("game_id", params.gameId).order("ply"),
        supabase.from("move_analyses").select("ply, played_uci, best_uci, eval_before_cp, eval_after_cp, classification").eq("game_id", params.gameId).order("ply"),
        supabase.from("games").select("pgn, result").eq("id", params.gameId).maybeSingle(),
      ]);

      if (canceled) return;

      let loadedUci = storeGameId === params.gameId && storeUci.length > 0 ? storeUci : ((dbMoves ?? []) as DbMove[]).map((m) => m.uci);
      const gameRow = game as DbGame | null;
      if (loadedUci.length === 0 && gameRow?.pgn) {
        try {
          const chess = new Chess();
          chess.loadPgn(gameRow.pgn);
          loadedUci = chess.history({ verbose: true }).map((m) => `${m.from}${m.to}${m.promotion ?? ""}`);
        } catch {
          loadedUci = [];
        }
      }

      const persisted = (dbAnalyses ?? []) as DbAnalysis[];
      if (persisted.length > 0) {
        setMoves(buildFromPersisted(loadedUci, persisted));
        setLoading(false);
        return;
      }

      if (loadedUci.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(false);
      setAnalyzing(true);
      setProgress({ done: 0, total: loadedUci.length });
      const analyzed = await analyzeGameMoves(loadedUci, (done, total) => {
        if (!canceled) setProgress({ done, total });
      });
      if (canceled) return;
      setMoves(analyzed);
      setAnalyzing(false);
      await saveMoveAnalyses(params.gameId, analyzed);
    }
    void load().catch(() => {
      if (!canceled) {
        setLoading(false);
        setAnalyzing(false);
      }
    });
    return () => {
      canceled = true;
    };
  }, [params.gameId, storeGameId, storeUci]);

  React.useEffect(() => {
    if (!selected || !needsCoach.has(selected.classification) || explanations[selected.ply]) return;
    const supabase = getSupabaseBrowserClient();
    void supabase.functions.invoke("explain-move", {
      body: {
        fen_before: selected.fenBefore,
        played_uci: selected.playedUci,
        played_san: selected.playedSan,
        best_uci: selected.bestUci,
        best_san: selected.bestSan,
        classification: selected.classification,
        eval_delta_cp: selected.evalDeltaCp,
        locale,
      },
    }).then(({ data }) => {
      if (data?.explanation) {
        setExplanations((prev) => ({ ...prev, [selected.ply]: data.explanation as string }));
      }
    });
  }, [selected, explanations, locale]);

  function tryBetterMove(from: string, to: string) {
    if (!selected?.bestUci) return;
    const uci = `${from}${to}${selected.bestUci.length > 4 ? selected.bestUci[4] : ""}`;
    if (uci !== selected.bestUci) return;
    const chess = new Chess(selected.fenBefore);
    const move = chess.move({ from, to, promotion: selected.bestUci[4] ?? "q" });
    if (move) setTryFen(chess.fen());
  }

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-surfaceLight">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky/30 border-t-sky" />
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-surfaceLight">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-surfaceLight px-4 py-3">
        <Link href="/play" className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-cobalt shadow-card">
          <ChevronLeft className="h-4 w-4" /> Home
        </Link>
        <span className="text-xs font-extrabold uppercase tracking-widest text-cobalt">AI Coach Review</span>
        <span className="rounded-chip bg-white px-2 py-1 text-xs font-extrabold text-navy shadow-card">{storeResult ?? "Review"}</span>
      </header>

      <section className="flex flex-1 flex-col items-center gap-3 px-3 pb-4 lg:flex-row lg:items-start lg:justify-center lg:px-6">
        <div className="flex w-full justify-center gap-2 lg:w-auto">
          <div className="relative h-[300px] w-6 overflow-hidden rounded-card bg-navy lg:h-[420px]">
            <div className="absolute bottom-0 w-full bg-white transition-all" style={{ height: `${whitePct}%` }} />
            <span className="absolute left-1/2 top-1 -translate-x-1/2 tabnum text-[10px] font-extrabold text-white">
              {evalCp >= 0 ? "+" : ""}{(evalCp / 100).toFixed(1)}
            </span>
          </div>
          <ChessboardWrapper
            position={tryFen ?? selected?.fenBefore ?? new Chess().fen()}
            size={300}
            boardTheme="ocean"
            highlightLast={selected ? { from: selected.playedUci.slice(0, 2), to: selected.playedUci.slice(2, 4) } : undefined}
            onMove={tryBetterMove}
            className="lg:!size-[420px]"
          />
        </div>

        <div className="flex w-full flex-1 flex-col gap-3 lg:max-w-xl">
          {analyzing && (
            <div className="rounded-hero bg-white p-4 shadow-card">
              <div className="flex items-center gap-3">
                <AleoMascot mood="thinking" size={64} />
                <div className="flex-1">
                  <p className="text-sm font-extrabold text-navy">Stockfish is reviewing your game…</p>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-pale">
                    <div className="h-full rounded-full bg-sky" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
                  </div>
                  <p className="mt-1 text-xs font-bold text-muted">{progress.done}/{progress.total} moves analyzed at depth 18</p>
                </div>
              </div>
            </div>
          )}

          {selected && (
            <div className="flex items-start gap-3 rounded-hero bg-white p-4 shadow-card">
              <AleoMascot mood={selected.classification === "blunder" ? "sad" : selected.classification === "brilliant" ? "cheer" : "thinking"} size={88} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-chip px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest" style={{ background: classBadge[selected.classification].bg, color: classBadge[selected.classification].fg }}>
                    {classBadge[selected.classification].label}
                  </span>
                  <span className="tabnum font-extrabold text-navy">{Math.floor(selected.ply / 2) + 1}{selected.ply % 2 === 0 ? "." : "..."} {selected.playedSan}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-navy">
                  {explanations[selected.ply] ?? (needsCoach.has(selected.classification) ? "Aleo is preparing your coaching note…" : "This move keeps your game on a healthy path.")}
                </p>
                {selected.bestUci && selected.classification !== "best" && selected.classification !== "book" && (
                  <div className="mt-3 rounded-card bg-pale px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-widest text-cobalt">Better:</span>
                      <span className="tabnum font-extrabold text-cobalt">{selected.bestSan ?? selected.bestUci}</span>
                      <ChunkyButton size="sm" variant="success" className="ml-auto" iconLeft={<Play className="h-3 w-3" />} onClick={() => setTryFen(null)}>
                        Try it
                      </ChunkyButton>
                    </div>
                    {tryFen && <p className="mt-2 text-xs font-extrabold text-winGreen">Nice! That is the engine's recommended continuation.</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-card bg-white p-3 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => { setTryFen(null); setIdx((i) => Math.max(0, i - 1)); }} className="grid h-9 w-9 place-items-center rounded-full bg-pale text-cobalt" aria-label="Previous">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <input type="range" min={0} max={Math.max(0, moves.length - 1)} value={idx} onChange={(e) => { setTryFen(null); setIdx(Number(e.target.value)); }} className="flex-1 accent-sky" aria-label="Move scrubber" />
              <button onClick={() => { setTryFen(null); setIdx((i) => Math.min(moves.length - 1, i + 1)); }} className="grid h-9 w-9 place-items-center rounded-full bg-pale text-cobalt" aria-label="Next">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {moves.map((move) => (
                <button
                  key={move.ply}
                  onClick={() => { setTryFen(null); setIdx(move.ply); }}
                  className={cn(
                    "rounded-chip px-2 py-1 text-xs font-extrabold transition",
                    move.ply === idx
                      ? "bg-sky text-white shadow-card"
                      : move.classification === "blunder"
                        ? "bg-lossRed/15 text-lossRed"
                        : move.classification === "mistake"
                          ? "bg-[#FF8A00]/15 text-[#9A4F00]"
                          : move.classification === "brilliant"
                            ? "bg-sparkle/15 text-sparkle"
                            : "bg-pale text-cobalt"
                  )}
                >
                  {move.classification === "brilliant" && <Sparkles className="mr-1 inline h-3 w-3" />}
                  <span className="tabnum">{Math.floor(move.ply / 2) + 1}{move.ply % 2 === 0 ? "." : "..."}</span> {move.playedSan}
                </button>
              ))}
            </div>

            {moves.length === 0 && (
              <p className="p-4 text-center text-sm font-bold text-muted">No moves were found for this game yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
