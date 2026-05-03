"use client";

import { Chess, type Move } from "chess.js";
import { getAnalysisEngine } from "@/lib/engine/engine-pool";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EngineEvent } from "@aleo/shared";

export type MoveClassification = "best" | "good" | "inaccuracy" | "mistake" | "blunder" | "brilliant" | "book";

export type ReviewMove = {
  ply: number;
  fenBefore: string;
  fenAfter: string;
  playedUci: string;
  playedSan: string;
  bestUci: string | null;
  bestSan: string | null;
  evalBeforeCp: number | null;
  evalAfterCp: number | null;
  evalDeltaCp: number;
  classification: MoveClassification;
};

type EngineLine = {
  multipv: number;
  cp: number;
  pv: string[];
};

type Book = Record<string, string[]>;

const pieceValues: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function bookKey(fen: string) {
  return fen.split(" ").slice(0, 4).join(" ");
}

function mateToCp(mate: number) {
  return mate > 0 ? 100000 - mate : -100000 - mate;
}

function materialFor(chess: Chess, color: "w" | "b") {
  return chess.board().flat().reduce((sum, piece) => {
    if (!piece || piece.color !== color) return sum;
    return sum + (pieceValues[piece.type] ?? 0);
  }, 0);
}

function sanFor(fen: string, uci: string | null) {
  if (!uci) return null;
  try {
    const chess = new Chess(fen);
    const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? "q" });
    return move?.san ?? uci;
  } catch {
    return uci;
  }
}

function classifyMove({
  ply,
  playedUci,
  bestUci,
  evalDeltaCp,
  topGapCp,
  sacrifice,
  inBook,
}: {
  ply: number;
  playedUci: string;
  bestUci: string | null;
  evalDeltaCp: number;
  topGapCp: number;
  sacrifice: boolean;
  inBook: boolean;
}): MoveClassification {
  if (inBook && ply < 12) return "book";
  if (playedUci === bestUci && sacrifice && topGapCp >= 200) return "brilliant";
  if (playedUci === bestUci) return "best";
  if (evalDeltaCp <= 49) return "good";
  if (evalDeltaCp <= 149) return "inaccuracy";
  if (evalDeltaCp <= 299) return "mistake";
  return "blunder";
}

function waitForAnalysis(moves: string[], depth = 18): Promise<EngineLine[]> {
  const engine = getAnalysisEngine();
  const lines = new Map<number, EngineLine>();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      off();
      reject(new Error("Stockfish analysis timed out"));
    }, 45_000);

    const off = engine.on((event: EngineEvent) => {
      if (event.type === "info" && event.depth === depth && event.pv?.[0]) {
        lines.set(event.multipv ?? 1, {
          multipv: event.multipv ?? 1,
          cp: typeof event.cp === "number" ? event.cp : typeof event.mate === "number" ? mateToCp(event.mate) : 0,
          pv: event.pv,
        });
      }
      if (event.type === "bestmove") {
        window.clearTimeout(timeout);
        off();
        resolve([...lines.values()].sort((a, b) => a.multipv - b.multipv));
      }
      if (event.type === "error") {
        window.clearTimeout(timeout);
        off();
        reject(new Error(event.message));
      }
    });

    engine.send({ type: "position", moves });
    engine.send({ type: "go", depth, multipv: 2 });
  });
}

async function loadBook(): Promise<Book> {
  try {
    const response = await fetch("/book.json");
    if (!response.ok) return {};
    return (await response.json()) as Book;
  } catch {
    return {};
  }
}

export async function analyzeGameMoves(uciMoves: string[], onProgress?: (done: number, total: number) => void) {
  const book = await loadBook();
  const output: ReviewMove[] = [];
  const replay = new Chess();
  const playedMoves: string[] = [];

  for (let ply = 0; ply < uciMoves.length; ply++) {
    const playedUci = uciMoves[ply]!;
    const fenBefore = replay.fen();
    const mover = replay.turn();
    const beforeMaterial = materialFor(replay, mover);
    const bookMoves = book[bookKey(fenBefore)] ?? [];

    const beforeLines = await waitForAnalysis(playedMoves);
    const best = beforeLines[0] ?? null;
    const second = beforeLines[1] ?? null;
    const bestUci = best?.pv[0] ?? null;
    const evalBeforeCp = best?.cp ?? null;
    const topGapCp = best && second ? best.cp - second.cp : 0;

    const playedMove = replay.move({ from: playedUci.slice(0, 2), to: playedUci.slice(2, 4), promotion: playedUci[4] ?? "q" }) as Move | null;
    if (!playedMove) break;

    const fenAfter = replay.fen();
    const afterLines = await waitForAnalysis([...playedMoves, playedUci]);
    const afterCpSideToMove = afterLines[0]?.cp ?? 0;
    const evalAfterCp = -afterCpSideToMove;
    const evalDeltaCp = Math.max(0, (evalBeforeCp ?? evalAfterCp) - evalAfterCp);
    const afterMaterial = materialFor(replay, mover);
    const sacrifice = afterMaterial < beforeMaterial;
    const classification = classifyMove({
      ply,
      playedUci,
      bestUci,
      evalDeltaCp,
      topGapCp,
      sacrifice,
      inBook: bookMoves.includes(playedUci),
    });

    output.push({
      ply,
      fenBefore,
      fenAfter,
      playedUci,
      playedSan: playedMove.san,
      bestUci,
      bestSan: sanFor(fenBefore, bestUci),
      evalBeforeCp,
      evalAfterCp,
      evalDeltaCp,
      classification,
    });

    playedMoves.push(playedUci);
    onProgress?.(ply + 1, uciMoves.length);
  }

  return output;
}

export async function saveMoveAnalyses(gameId: string, analyses: ReviewMove[]) {
  const supabase = getSupabaseBrowserClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.rpc as any)("save_move_analyses", {
    p_game_id: gameId,
    p_analyses: analyses.map((move) => ({
      ply: move.ply,
      played_uci: move.playedUci,
      best_uci: move.bestUci,
      eval_before_cp: move.evalBeforeCp,
      eval_after_cp: move.evalAfterCp,
      classification: move.classification,
    })),
  });
}
