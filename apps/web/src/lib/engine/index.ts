/**
 * Public engine API for the web app.
 *
 * Wraps the Stockfish WASM Web Worker with a typed `createEngine()` factory.
 * Uses the stockfish NPM package (v18) which provides a ready-to-use
 * Web Worker that communicates via postMessage/onmessage with UCI strings.
 *
 * Do NOT add another chess engine package — this is the single source of truth.
 */

import type { EngineEvent, EngineRequest } from "@aleo/shared";

export type { EngineEvent, EngineRequest } from "@aleo/shared";

export interface Engine {
  /** Send a typed request (will be queued until `ready`). */
  send: (req: EngineRequest) => void;
  /** Subscribe to typed events from the engine. Returns an unsubscribe fn. */
  on: (cb: (event: EngineEvent) => void) => () => void;
  /** Terminate the worker and release resources. */
  destroy: () => void;
  /** The underlying Worker (escape hatch). */
  worker: Worker;
}

// ---- UCI line parsers ----

function parseInfoLine(line: string): EngineEvent | null {
  if (!line.startsWith("info ")) return null;
  const tokens = line.slice(5).split(/\s+/);
  const out: Extract<EngineEvent, { type: "info" }> = { type: "info" };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === undefined) continue;
    const next = tokens[i + 1];
    switch (t) {
      case "depth": out.depth = Number(next); i++; break;
      case "seldepth": out.seldepth = Number(next); i++; break;
      case "multipv": out.multipv = Number(next); i++; break;
      case "nodes": out.nodes = Number(next); i++; break;
      case "nps": out.nps = Number(next); i++; break;
      case "time": out.timeMs = Number(next); i++; break;
      case "score": {
        const kind = next;
        const value = Number(tokens[i + 2]);
        if (kind === "cp") out.cp = value;
        else if (kind === "mate") out.mate = value;
        i += 2;
        break;
      }
      case "pv": {
        out.pv = tokens.slice(i + 1).filter(Boolean) as string[];
        i = tokens.length;
        break;
      }
      default: break;
    }
  }
  return out;
}

function parseBestmove(line: string): EngineEvent | null {
  if (!line.startsWith("bestmove ")) return null;
  const parts = line.split(/\s+/);
  const uci = parts[1];
  if (!uci) return null;
  const ponder = parts[2] === "ponder" && parts[3] ? parts[3] : undefined;
  return { type: "bestmove", uci, ponder };
}

// ---- Position / Go command builders ----

function buildPositionCommand(req: Extract<EngineRequest, { type: "position" }>): string {
  const parts: string[] = ["position"];
  if (req.fen) {
    parts.push("fen", req.fen);
  } else {
    parts.push("startpos");
  }
  if (req.moves && req.moves.length > 0) {
    parts.push("moves", ...req.moves);
  }
  return parts.join(" ");
}

function buildGoCommand(
  req: Extract<EngineRequest, { type: "go" }>,
  sendCmdFn: (cmd: string) => void
): string {
  const parts: string[] = ["go"];
  if (req.depth !== undefined) parts.push("depth", String(req.depth));
  if (req.movetimeMs !== undefined) parts.push("movetime", String(req.movetimeMs));
  if (req.wtimeMs !== undefined) parts.push("wtime", String(req.wtimeMs));
  if (req.btimeMs !== undefined) parts.push("btime", String(req.btimeMs));
  if (req.wincMs !== undefined) parts.push("winc", String(req.wincMs));
  if (req.bincMs !== undefined) parts.push("binc", String(req.bincMs));
  if (req.multipv !== undefined && req.multipv > 1) {
    sendCmdFn(`setoption name MultiPV value ${req.multipv}`);
  }
  return parts.join(" ");
}

/**
 * Spawn a new Stockfish engine worker.
 *
 * The Stockfish NPM package v18 exposes a Web Worker that accepts UCI
 * commands via postMessage and sends UCI output lines back via onmessage.
 * The hash fragment tells the worker where to locate the WASM file.
 */
export function createEngine(): Engine {
  // Build the worker URL. The stockfish-single.js file uses
  // self.location.hash to find the WASM binary.
  const wasmUrl = `${window.location.origin}/engine/stockfish-single.wasm`;
  const workerUrl = `/engine/stockfish-single.js#${wasmUrl}`;

  const worker = new Worker(workerUrl);

  const listeners = new Set<(event: EngineEvent) => void>();
  let ready = false;
  const pendingCommands: string[] = [];

  function emit(event: EngineEvent) {
    for (const cb of listeners) cb(event);
  }

  function sendCmd(cmd: string) {
    if (!ready && cmd !== "uci" && !cmd.startsWith("setoption") && cmd !== "ucinewgame") {
      pendingCommands.push(cmd);
      return;
    }
    worker.postMessage(cmd);
  }

  worker.onmessage = (e: MessageEvent) => {
    const line = typeof e.data === "string" ? e.data.trim() : "";
    if (!line) return;

    emit({ type: "log", line });

    if (line === "uciok") {
      worker.postMessage("isready");
      return;
    }

    if (line === "readyok") {
      if (!ready) {
        ready = true;
        emit({ type: "ready" });
        // flush queued commands
        while (pendingCommands.length) {
          const cmd = pendingCommands.shift();
          if (cmd) worker.postMessage(cmd);
        }
      }
      return;
    }

    const info = parseInfoLine(line);
    if (info) { emit(info); return; }

    const best = parseBestmove(line);
    if (best) { emit(best); return; }
  };

  worker.onerror = (e) => {
    emit({ type: "error", message: e.message ?? "engine worker error" });
  };

  function handleRequest(req: EngineRequest) {
    switch (req.type) {
      case "init":
        // Start UCI handshake
        worker.postMessage("uci");
        if (req.threads !== undefined) {
          worker.postMessage(`setoption name Threads value ${req.threads}`);
        }
        if (req.hashMb !== undefined) {
          worker.postMessage(`setoption name Hash value ${req.hashMb}`);
        }
        worker.postMessage("ucinewgame");
        return;
      case "position":
        sendCmd(buildPositionCommand(req));
        return;
      case "go":
        sendCmd(buildGoCommand(req, sendCmd));
        return;
      case "stop":
        sendCmd("stop");
        return;
      case "setoption":
        sendCmd(`setoption name ${req.name} value ${req.value}`);
        return;
      case "quit":
        worker.postMessage("quit");
        worker.terminate();
        return;
    }
  }

  return {
    worker,
    send: handleRequest,
    on: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    destroy: () => {
      try {
        worker.postMessage("quit");
        worker.terminate();
      } catch {
        /* noop */
      }
      listeners.clear();
    }
  };
}
