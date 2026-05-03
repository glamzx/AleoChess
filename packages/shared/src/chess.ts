/**
 * Shared chess types & lightweight pure utilities.
 *
 * No engine logic here — anything that needs Stockfish goes through
 * `engine-types.ts` and the worker bridge in `apps/web`.
 */

export type Color = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export interface Piece {
  type: PieceType;
  color: Color;
}

export type Square =
  | `${"a" | "b" | "c" | "d" | "e" | "f" | "g" | "h"}${
      | "1"
      | "2"
      | "3"
      | "4"
      | "5"
      | "6"
      | "7"
      | "8"}`;

/** A move in long algebraic UCI notation, e.g. "e2e4", "e7e8q". */
export type UciMove = string;

export interface Move {
  from: Square;
  to: Square;
  promotion?: Exclude<PieceType, "p" | "k">;
  san?: string;
  uci?: UciMove;
}

export interface ClockState {
  whiteMs: number;
  blackMs: number;
  /** ms increment per move. */
  incMs: number;
  /** Side to move (null when game is over). */
  turn: Color | null;
}

export const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export function isSquare(value: string): value is Square {
  if (value.length !== 2) return false;
  const file = value[0];
  const rank = value[1];
  return (
    file !== undefined &&
    rank !== undefined &&
    (FILES as readonly string[]).includes(file) &&
    (RANKS as readonly string[]).includes(rank)
  );
}

/** Format milliseconds as `m:ss` or `mm:ss`, never negative. */
export function formatClock(ms: number): string {
  const safe = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Convert a centipawn score to a human eval string (e.g. "+1.24", "-0.30", "M3"). */
export function formatEval(cp: number, mateIn?: number): string {
  if (typeof mateIn === "number" && Number.isFinite(mateIn)) {
    return mateIn >= 0 ? `M${mateIn}` : `-M${Math.abs(mateIn)}`;
  }
  const v = cp / 100;
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
}

export type MoveClassification =
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "brilliant";

export interface ClassifiedMove {
  san: string;
  uci?: UciMove;
  classification: MoveClassification;
  evalCp: number;
  bestAlt?: string;
  comment?: string;
}
