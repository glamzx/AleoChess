/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Stockfish WASM Web Worker.
 *
 * Loads the Stockfish WASM engine (from `/engine/stockfish-single.js` for
 * single-threaded compatibility) and translates typed messages from the
 * main thread into UCI commands, parsing engine output back into typed events.
 *
 * The Stockfish NPM package (v18) exposes a raw worker that communicates
 * via postMessage/onmessage with UCI strings. We spawn a sub-worker and
 * relay messages.
 */

import type { EngineEvent, EngineRequest } from "@aleo/shared";

declare const self: DedicatedWorkerGlobalScope;

let stockfishWorker: Worker | null = null;
let ready = false;
let initPromise: Promise<void> | null = null;
const pendingCommands: string[] = [];

function send(event: EngineEvent) {
  self.postMessage(event);
}

function sendCmd(cmd: string) {
  if (!stockfishWorker) {
    pendingCommands.push(cmd);
    return;
  }
  stockfishWorker.postMessage(cmd);
}

/**
 * Parse a single UCI `info ...` line into a typed `EngineEvent`.
 */
function parseInfoLine(line: string): EngineEvent | null {
  if (!line.startsWith("info ")) return null;
  const tokens = line.slice(5).split(/\s+/);
  const out: Extract<EngineEvent, { type: "info" }> = { type: "info" };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === undefined) continue;
    const next = tokens[i + 1];
    switch (t) {
      case "depth":
        out.depth = Number(next);
        i++;
        break;
      case "seldepth":
        out.seldepth = Number(next);
        i++;
        break;
      case "multipv":
        out.multipv = Number(next);
        i++;
        break;
      case "nodes":
        out.nodes = Number(next);
        i++;
        break;
      case "nps":
        out.nps = Number(next);
        i++;
        break;
      case "time":
        out.timeMs = Number(next);
        i++;
        break;
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
      default:
        break;
    }
  }
  return out;
}

function parseBestmove(line: string): EngineEvent | null {
  if (!line.startsWith("bestmove ")) return null;
  const parts = line.split(/\s+/);
  const uci = parts[1];
  if (!uci) return null;
  const ponder =
    parts[2] === "ponder" && parts[3] ? parts[3] : undefined;
  return { type: "bestmove", uci, ponder };
}

function handleEngineLine(line: string) {
  if (typeof line !== "string") return;
  line = line.trim();
  if (!line) return;

  send({ type: "log", line });

  if (line === "uciok") {
    sendCmd("isready");
    return;
  }
  if (line === "readyok") {
    if (!ready) {
      ready = true;
      send({ type: "ready" });
      // flush any commands queued before we were ready
      while (pendingCommands.length) {
        const cmd = pendingCommands.shift();
        if (cmd) stockfishWorker?.postMessage(cmd);
      }
    }
    return;
  }

  const info = parseInfoLine(line);
  if (info) {
    send(info);
    return;
  }
  const best = parseBestmove(line);
  if (best) {
    send(best);
    return;
  }
}

async function initEngine(req: Extract<EngineRequest, { type: "init" }>) {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // The stockfish NPM package exposes a worker-based API.
    // We load the single-threaded version as a sub-worker since it
    // doesn't require SharedArrayBuffer. The engine file at
    // /engine/stockfish-single.js contains the full Stockfish WASM.
    //
    // The hash format tells the Stockfish worker where to find the WASM:
    //   hash = wasmPath[,workerType]
    const wasmUrl = new URL("/engine/stockfish-single.wasm", self.location.origin).href;
    const workerUrl = `/engine/stockfish-single.js#${wasmUrl}`;

    stockfishWorker = new Worker(workerUrl);

    stockfishWorker.onmessage = (e) => {
      if (typeof e.data === "string") {
        handleEngineLine(e.data);
      }
    };

    stockfishWorker.onerror = (e) => {
      send({
        type: "error",
        message: `Stockfish worker error: ${e.message ?? "unknown"}`
      });
    };

    // UCI handshake
    sendCmd("uci");
    if (req.threads !== undefined) {
      sendCmd(`setoption name Threads value ${req.threads}`);
    }
    if (req.hashMb !== undefined) {
      sendCmd(`setoption name Hash value ${req.hashMb}`);
    }
    sendCmd("ucinewgame");
    // `readyok` from `isready` (sent after uciok) will emit our `ready` event.
  })();

  return initPromise;
}

function buildGoCommand(req: Extract<EngineRequest, { type: "go" }>): string {
  const parts: string[] = ["go"];
  if (req.depth !== undefined) parts.push("depth", String(req.depth));
  if (req.movetimeMs !== undefined) parts.push("movetime", String(req.movetimeMs));
  if (req.wtimeMs !== undefined) parts.push("wtime", String(req.wtimeMs));
  if (req.btimeMs !== undefined) parts.push("btime", String(req.btimeMs));
  if (req.wincMs !== undefined) parts.push("winc", String(req.wincMs));
  if (req.bincMs !== undefined) parts.push("binc", String(req.bincMs));
  if (req.multipv !== undefined && req.multipv > 1) {
    sendCmd(`setoption name MultiPV value ${req.multipv}`);
  }
  return parts.join(" ");
}

function buildPositionCommand(
  req: Extract<EngineRequest, { type: "position" }>
): string {
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

self.addEventListener("message", (e: MessageEvent<EngineRequest>) => {
  const req = e.data;
  if (!req || typeof req.type !== "string") return;

  switch (req.type) {
    case "init":
      void initEngine(req);
      return;
    case "position":
      sendCmd(buildPositionCommand(req));
      return;
    case "go":
      sendCmd(buildGoCommand(req));
      return;
    case "stop":
      sendCmd("stop");
      return;
    case "setoption":
      sendCmd(`setoption name ${req.name} value ${req.value}`);
      return;
    case "quit":
      sendCmd("quit");
      try {
        stockfishWorker?.terminate();
      } catch {
        /* noop */
      }
      stockfishWorker = null;
      ready = false;
      initPromise = null;
      return;
    default: {
      const _exhaustive: never = req;
      void _exhaustive;
      return;
    }
  }
});
