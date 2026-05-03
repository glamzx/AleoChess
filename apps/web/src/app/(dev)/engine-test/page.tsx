"use client";

/**
 * /engine-test
 *
 * Sanity-check page that proves end-to-end the Stockfish WASM engine works.
 *
 * It spawns one engine worker, sends `position startpos moves e2e4` followed
 * by `go depth 12`, and prints the bestmove + intermediate `info` lines on
 * the screen.
 *
 * If you see "engine worker error" or
 * "Stockfish WASM glue not loaded", run:
 *
 *   pnpm engine:build
 *
 * to compile `engine/Stockfish/` to `apps/web/public/engine/stockfish.{js,wasm}`.
 */

import * as React from "react";
import { createEngine, type Engine, type EngineEvent } from "@/lib/engine";

interface InfoSnapshot {
  depth?: number;
  cp?: number;
  mate?: number;
  pv?: string[];
  nps?: number;
  nodes?: number;
  timeMs?: number;
}

export default function EngineTestPage() {
  const [bestmove, setBestmove] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<InfoSnapshot>({});
  const [logLines, setLogLines] = React.useState<string[]>([]);
  const [phase, setPhase] = React.useState<
    "idle" | "loading" | "ready" | "thinking" | "done" | "error"
  >("idle");
  const [error, setError] = React.useState<string | null>(null);
  const engineRef = React.useRef<Engine | null>(null);

  const appendLog = React.useCallback((line: string) => {
    setLogLines((prev) => {
      const next = [...prev, line];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, []);

  const handleStart = React.useCallback(() => {
    if (engineRef.current) return;
    setPhase("loading");
    setError(null);
    setBestmove(null);
    setInfo({});
    setLogLines([]);

    const engine = createEngine();
    engineRef.current = engine;

    engine.on((event: EngineEvent) => {
      switch (event.type) {
        case "ready":
          setPhase("thinking");
          // Test scenario: 1.e4 then ask for bestmove at depth 12.
          engine.send({ type: "position", moves: ["e2e4"] });
          engine.send({ type: "go", depth: 12 });
          break;
        case "info":
          setInfo({
            depth: event.depth,
            cp: event.cp,
            mate: event.mate,
            pv: event.pv,
            nps: event.nps,
            nodes: event.nodes,
            timeMs: event.timeMs
          });
          break;
        case "bestmove":
          setBestmove(event.uci);
          setPhase("done");
          break;
        case "error":
          setError(event.message);
          setPhase("error");
          break;
        case "log":
          appendLog(event.line);
          break;
      }
    });

    engine.send({ type: "init", threads: 1, hashMb: 16 });
  }, [appendLog]);

  const handleStop = React.useCallback(() => {
    engineRef.current?.destroy();
    engineRef.current = null;
    setPhase("idle");
  }, []);

  React.useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 p-6 font-mono">
      <header className="space-y-1">
        <span className="rounded bg-aleo-pale px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-aleo-cobalt">
          dev
        </span>
        <h1 className="text-2xl font-extrabold text-aleo-navy">
          Stockfish WASM smoke test
        </h1>
        <p className="text-sm text-slate-600">
          Spawns one engine worker, sends{" "}
          <code className="rounded bg-slate-100 px-1">
            position startpos moves e2e4
          </code>{" "}
          + <code className="rounded bg-slate-100 px-1">go depth 12</code>, and
          prints the bestmove.
        </p>
      </header>

      <div className="flex items-center gap-3">
        <button
          onClick={handleStart}
          disabled={phase === "loading" || phase === "thinking"}
          className="rounded-lg bg-aleo-sky px-4 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_0_#0047BB] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_#0047BB] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {phase === "loading"
            ? "Loading WASM..."
            : phase === "thinking"
              ? "Thinking..."
              : phase === "done"
                ? "Run again"
                : "Spawn engine + go depth 12"}
        </button>
        <button
          onClick={handleStop}
          disabled={!engineRef.current}
          className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Terminate
        </button>
        <span
          className={
            "rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-widest " +
            (phase === "error"
              ? "bg-lossRed/15 text-lossRed"
              : phase === "done"
                ? "bg-winGreen/15 text-winGreen"
                : phase === "thinking" || phase === "loading"
                  ? "bg-coin/20 text-amber-700"
                  : "bg-slate-200 text-slate-700")
          }
        >
          {phase}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border-2 border-lossRed/40 bg-lossRed/5 p-4 text-sm text-lossRed">
          <strong>Error:</strong> {error}
          <p className="mt-2 text-xs text-slate-600">
            Tip: did you run <code>pnpm engine:build</code>?
          </p>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
            Bestmove
          </h2>
          <p className="mt-1 text-3xl font-extrabold text-aleo-cobalt">
            {bestmove ?? "—"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            (Worker received <code>position</code> + <code>go depth 12</code>)
          </p>
        </div>

        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
            Latest info
          </h2>
          <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-slate-500">depth</dt>
            <dd className="font-extrabold">{info.depth ?? "—"}</dd>
            <dt className="text-slate-500">cp / mate</dt>
            <dd className="font-extrabold">
              {info.mate !== undefined
                ? `M${info.mate}`
                : info.cp !== undefined
                  ? `${info.cp >= 0 ? "+" : ""}${(info.cp / 100).toFixed(2)}`
                  : "—"}
            </dd>
            <dt className="text-slate-500">nodes</dt>
            <dd className="font-extrabold">
              {info.nodes?.toLocaleString("en-US") ?? "—"}
            </dd>
            <dt className="text-slate-500">nps</dt>
            <dd className="font-extrabold">
              {info.nps?.toLocaleString("en-US") ?? "—"}
            </dd>
            <dt className="text-slate-500">time</dt>
            <dd className="font-extrabold">
              {info.timeMs !== undefined ? `${info.timeMs} ms` : "—"}
            </dd>
            <dt className="col-span-2 mt-2 text-slate-500">PV</dt>
            <dd className="col-span-2 break-all font-extrabold">
              {info.pv?.slice(0, 12).join(" ") ?? "—"}
            </dd>
          </dl>
        </div>
      </section>

      <section className="rounded-xl border-2 border-slate-200 bg-slate-950 p-3 text-[11px] text-slate-200">
        <h2 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">
          UCI log (last 200 lines)
        </h2>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-mono leading-relaxed">
          {logLines.length === 0 ? "(no output yet)" : logLines.join("\n")}
        </pre>
      </section>
    </main>
  );
}
