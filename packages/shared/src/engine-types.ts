/**
 * Typed message protocol between the main thread and the Stockfish WASM
 * Web Worker (`apps/web/src/lib/engine/engine.worker.ts`).
 *
 * Keep this file *pure types* — no runtime code — so it can be imported by
 * both the worker and React components without bundle bloat.
 */

import type { UciMove } from "./chess";

/** Messages from main thread → worker. */
export type EngineRequest =
  | { type: "init"; threads?: number; hashMb?: number }
  | { type: "position"; fen?: string; moves?: UciMove[] }
  | {
      type: "go";
      depth?: number;
      movetimeMs?: number;
      wtimeMs?: number;
      btimeMs?: number;
      wincMs?: number;
      bincMs?: number;
      multipv?: number;
    }
  | { type: "stop" }
  | { type: "quit" }
  | { type: "setoption"; name: string; value: string };

/** Messages from worker → main thread. */
export type EngineEvent =
  | { type: "ready" }
  | { type: "bestmove"; uci: UciMove; ponder?: UciMove }
  | {
      type: "info";
      depth?: number;
      seldepth?: number;
      multipv?: number;
      cp?: number;
      mate?: number;
      nodes?: number;
      nps?: number;
      timeMs?: number;
      pv?: UciMove[];
    }
  | { type: "error"; message: string }
  | { type: "log"; line: string };
