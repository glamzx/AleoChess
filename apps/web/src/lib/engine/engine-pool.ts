"use client";

/**
 * Singleton engine pool.
 *
 * Maintains one Stockfish worker for live opponent play and a separate one
 * for post-game analysis. Workers are reused across games to avoid the
 * ~400 ms WASM re-initialization cost.
 *
 * Usage:
 *   const engine = getOpponentEngine();
 *   engine.send({ type: "setoption", name: "Skill Level", value: "5" });
 *   engine.send({ type: "position", moves: ["e2e4", "e7e5"] });
 *   engine.send({ type: "go", movetimeMs: 500 });
 */

import { createEngine, type Engine } from "./index";

let opponentEngine: Engine | null = null;
let analysisEngine: Engine | null = null;

/**
 * Get the singleton opponent engine. Lazily creates and initializes
 * the worker on first call.
 */
export function getOpponentEngine(): Engine {
  if (!opponentEngine) {
    opponentEngine = createEngine();
    opponentEngine.send({ type: "init" });
  }
  return opponentEngine;
}

/**
 * Get the singleton analysis engine (separate worker so analysis
 * never blocks the live game engine).
 */
export function getAnalysisEngine(): Engine {
  if (!analysisEngine) {
    analysisEngine = createEngine();
    analysisEngine.send({ type: "init" });
  }
  return analysisEngine;
}

/**
 * Reset the opponent engine for a new game without destroying the worker.
 * Sends `ucinewgame` + `isready` to flush engine state.
 */
export function resetOpponentEngine(): void {
  if (!opponentEngine) return;
  opponentEngine.send({
    type: "setoption",
    name: "Clear Hash",
    value: "",
  });
  // The worker's handleEngineLine will emit `ready` again after isready/readyok.
}

/**
 * Terminate all workers and release resources. Call on app teardown
 * or when the user navigates away from game features.
 */
export function destroyAll(): void {
  opponentEngine?.destroy();
  analysisEngine?.destroy();
  opponentEngine = null;
  analysisEngine = null;
}
