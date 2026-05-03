"use client";

/**
 * Zustand game-state store.
 *
 * Central source of truth for an in-progress chess game. Uses chess.js
 * internally for move validation and status detection. Supports both
 * bot mode and multiplayer mode.
 */

import { create } from "zustand";
import { Chess } from "chess.js";
import { playSfx } from "@/lib/sounds";
import { STARTING_FEN } from "@aleo/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GameStatus =
  | "idle"
  | "waiting"
  | "playing"
  | "checkmate"
  | "stalemate"
  | "draw"
  | "resigned"
  | "timeout"
  | "aborted";

export type GameResult = "1-0" | "0-1" | "1/2-1/2" | null;

export type GameMode = "bot" | "multiplayer";

export type TimeControl = {
  initialMs: number;
  incrementMs: number;
};

export type BotDifficulty = "easy" | "casual" | "club" | "strong";

export const DIFFICULTY_SKILL: Record<BotDifficulty, number> = {
  easy: 0,
  casual: 5,
  club: 10,
  strong: 15,
};

export const DIFFICULTY_THINK_MS: Record<BotDifficulty, number> = {
  easy: 200,
  casual: 500,
  club: 1500,
  strong: 3000,
};

export interface GameConfig {
  playerColor: "w" | "b";
  timeControl: TimeControl;
  difficulty: BotDifficulty;
  gameId: string;
  mode?: GameMode;
  opponentName?: string;
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface GameState {
  // Game identity
  gameId: string | null;
  mode: GameMode;

  // Board state
  fen: string;
  moveHistory: string[]; // SAN
  uciHistory: string[]; // UCI (e2e4)
  pgn: string;
  turn: "w" | "b";

  // Configuration
  playerColor: "w" | "b";
  difficulty: BotDifficulty;
  opponentName: string;

  // Clock
  clock: {
    whiteMs: number;
    blackMs: number;
    incrementMs: number;
  };

  // Status
  status: GameStatus;
  result: GameResult;

  // Last move highlight
  lastMove: { from: string; to: string } | null;

  // Internal chess.js instance (not serializable — do NOT persist)
  _chess: Chess;

  // Actions
  initGame: (config: GameConfig) => void;
  makeMove: (uci: string) => boolean;
  /** Apply an opponent's move (received via Realtime). No turn check. */
  applyRemoteMove: (uci: string) => boolean;
  resign: () => void;
  offerDraw: () => void;
  setStatus: (status: GameStatus, result?: GameResult) => void;
  tickClock: (side: "w" | "b", elapsedMs: number) => void;
  addIncrement: (side: "w" | "b") => void;
  setClock: (whiteMs: number, blackMs: number) => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveStatus(chess: Chess): GameStatus {
  if (chess.isCheckmate()) return "checkmate";
  if (chess.isStalemate()) return "stalemate";
  if (chess.isDraw()) return "draw";
  return "playing";
}

function deriveResult(chess: Chess, status: GameStatus): GameResult {
  if (status === "checkmate") {
    return chess.turn() === "w" ? "0-1" : "1-0";
  }
  if (status === "stalemate" || status === "draw") return "1/2-1/2";
  return null;
}

function playSoundForMove(
  chess: Chess,
  status: GameStatus,
  isCapture: boolean
) {
  if (status === "checkmate") {
    playSfx("checkmate");
  } else if (chess.isCheck()) {
    playSfx("check");
  } else if (isCapture) {
    playSfx("capture");
  } else {
    playSfx("pieceMove");
  }
}

function applyMoveInternal(chess: Chess, uci: string) {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci[4] : undefined;
  return chess.move({
    from,
    to,
    promotion: promotion as "q" | "r" | "b" | "n" | undefined,
  });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useGameStore = create<GameState>((set, get) => ({
  gameId: null,
  mode: "bot",
  fen: STARTING_FEN,
  moveHistory: [],
  uciHistory: [],
  pgn: "",
  turn: "w",
  playerColor: "w",
  difficulty: "casual",
  opponentName: "Opponent",
  clock: { whiteMs: 300_000, blackMs: 300_000, incrementMs: 0 },
  status: "idle",
  result: null,
  lastMove: null,
  _chess: new Chess(),

  initGame: (config) => {
    const chess = new Chess();
    set({
      gameId: config.gameId,
      mode: config.mode ?? "bot",
      fen: STARTING_FEN,
      moveHistory: [],
      uciHistory: [],
      pgn: "",
      turn: "w",
      playerColor: config.playerColor,
      difficulty: config.difficulty,
      opponentName: config.opponentName ?? (config.mode === "multiplayer" ? "Friend" : `Stockfish (${config.difficulty})`),
      clock: {
        whiteMs: config.timeControl.initialMs,
        blackMs: config.timeControl.initialMs,
        incrementMs: config.timeControl.incrementMs,
      },
      status: "playing",
      result: null,
      lastMove: null,
      _chess: chess,
    });
  },

  makeMove: (uci: string) => {
    const { _chess: chess, status, uciHistory, mode, turn, playerColor } = get();
    if (status !== "playing") return false;

    // In multiplayer, only allow moves on your own turn
    if (mode === "multiplayer" && turn !== playerColor) return false;

    const move = applyMoveInternal(chess, uci);
    if (!move) return false;

    const newStatus = deriveStatus(chess);
    const newResult = deriveResult(chess, newStatus);
    const isCapture = move.captured !== undefined;

    playSoundForMove(chess, newStatus, isCapture);

    set({
      fen: chess.fen(),
      moveHistory: [...get().moveHistory, move.san],
      uciHistory: [...uciHistory, uci],
      pgn: chess.pgn(),
      turn: chess.turn() as "w" | "b",
      status: newStatus,
      result: newResult,
      lastMove: { from: move.from, to: move.to },
    });

    return true;
  },

  applyRemoteMove: (uci: string) => {
    const { _chess: chess, status, uciHistory } = get();
    if (status !== "playing") return false;

    const move = applyMoveInternal(chess, uci);
    if (!move) return false;

    const newStatus = deriveStatus(chess);
    const newResult = deriveResult(chess, newStatus);
    const isCapture = move.captured !== undefined;

    playSoundForMove(chess, newStatus, isCapture);

    set({
      fen: chess.fen(),
      moveHistory: [...get().moveHistory, move.san],
      uciHistory: [...uciHistory, uci],
      pgn: chess.pgn(),
      turn: chess.turn() as "w" | "b",
      status: newStatus,
      result: newResult,
      lastMove: { from: move.from, to: move.to },
    });

    return true;
  },

  resign: () => {
    const { status, playerColor } = get();
    if (status !== "playing") return;
    set({
      status: "resigned",
      result: playerColor === "w" ? "0-1" : "1-0",
    });
  },

  offerDraw: () => {
    const { status, mode } = get();
    if (status !== "playing") return;
    // In bot games, auto-accept. In multiplayer, this would need negotiation.
    if (mode === "bot") {
      set({ status: "draw", result: "1/2-1/2" });
    }
    // TODO: For multiplayer, broadcast draw offer via Realtime
  },

  setStatus: (status, result) => {
    set({ status, result: result ?? null });
  },

  tickClock: (side, elapsedMs) => {
    set((s) => {
      const newClock = { ...s.clock };
      if (side === "w") {
        newClock.whiteMs = Math.max(0, newClock.whiteMs - elapsedMs);
      } else {
        newClock.blackMs = Math.max(0, newClock.blackMs - elapsedMs);
      }
      if (newClock.whiteMs <= 0 || newClock.blackMs <= 0) {
        const loser = newClock.whiteMs <= 0 ? "w" : "b";
        return {
          clock: newClock,
          status: "timeout" as GameStatus,
          result: (loser === "w" ? "0-1" : "1-0") as GameResult,
        };
      }
      return { clock: newClock };
    });
  },

  addIncrement: (side) => {
    set((s) => {
      const newClock = { ...s.clock };
      if (side === "w") {
        newClock.whiteMs += newClock.incrementMs;
      } else {
        newClock.blackMs += newClock.incrementMs;
      }
      return { clock: newClock };
    });
  },

  setClock: (whiteMs, blackMs) => {
    set((s) => ({ clock: { ...s.clock, whiteMs, blackMs } }));
  },

  reset: () => {
    set({
      gameId: null,
      mode: "bot",
      fen: STARTING_FEN,
      moveHistory: [],
      uciHistory: [],
      pgn: "",
      turn: "w",
      playerColor: "w",
      difficulty: "casual",
      opponentName: "Opponent",
      clock: { whiteMs: 300_000, blackMs: 300_000, incrementMs: 0 },
      status: "idle",
      result: null,
      lastMove: null,
      _chess: new Chess(),
    });
  },
}));
