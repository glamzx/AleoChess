"use client";

/**
 * Game.tsx — Full interactive game board component.
 *
 * Supports both bot mode (engine moves) and multiplayer mode (Realtime).
 * Mounts <ChessboardWrapper />, subscribes to the Zustand game store,
 * runs the clock interval, and handles engine or network moves.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Flag, Handshake, ChevronUp, Wifi, WifiOff, X, Check } from "lucide-react";
import { Chess } from "chess.js";
import { ChessboardWrapper, type BoardTheme } from "@/components/ChessboardWrapper";
import { ChunkyButton } from "@/components/ChunkyButton";
import { PlayerStrip } from "@/components/PlayerStrip";
import { useGameStore, DIFFICULTY_THINK_MS } from "@/lib/chess/game-state";
import { getOpponentEngine } from "@/lib/engine/engine-pool";
import { useGameChannel, submitMove, updateGameStatus } from "@/lib/multiplayer/realtime";
import { formatClock } from "@aleo/shared";
import { cn } from "@/lib/cn";
import { fetchEquippedBoardTheme } from "@/lib/store";
import type { EngineEvent } from "@aleo/shared";

export interface GameProps {
  onGameEnd?: (gameId: string, result: string) => void;
}

export function Game({ onGameEnd }: GameProps) {
  const t = useTranslations("game");

  // ---- Store selectors ----
  const fen = useGameStore((s) => s.fen);
  const turn = useGameStore((s) => s.turn);
  const status = useGameStore((s) => s.status);
  const result = useGameStore((s) => s.result);
  const playerColor = useGameStore((s) => s.playerColor);
  const difficulty = useGameStore((s) => s.difficulty);
  const mode = useGameStore((s) => s.mode);
  const opponentName = useGameStore((s) => s.opponentName);
  const clock = useGameStore((s) => s.clock);
  const moveHistory = useGameStore((s) => s.moveHistory);
  const uciHistory = useGameStore((s) => s.uciHistory);
  const lastMove = useGameStore((s) => s.lastMove);
  const gameId = useGameStore((s) => s.gameId);
  const pgn = useGameStore((s) => s.pgn);
  const makeMove = useGameStore((s) => s.makeMove);
  const applyRemoteMove = useGameStore((s) => s.applyRemoteMove);
  const resign = useGameStore((s) => s.resign);
  const setStatus = useGameStore((s) => s.setStatus);
  const tickClock = useGameStore((s) => s.tickClock);
  const addIncrement = useGameStore((s) => s.addIncrement);

  const [drawer, setDrawer] = React.useState(false);
  const [boardSize, setBoardSize] = React.useState(360);
  const [botThinking, setBotThinking] = React.useState(false);
  const [drawOfferPending, setDrawOfferPending] = React.useState(false);
  const [drawOfferReceived, setDrawOfferReceived] = React.useState(false);
  const [boardTheme, setBoardTheme] = React.useState<BoardTheme>("ocean");

  // ---- Multiplayer Realtime ----
  const {
    opponentOnline,
    opponentDisconnectedSecs,
    incomingMoves,
    clearMoves,
    gameStatus,
    gameResult,
    broadcastClock,
    broadcastMove,
    broadcastResign,
    broadcastDrawOffer,
    broadcastDrawAccept,
    incomingAction,
    clearAction,
  } = useGameChannel(gameId, mode === "multiplayer");

  React.useEffect(() => {
    let cancelled = false;
    void fetchEquippedBoardTheme().then((theme) => {
      if (!cancelled) setBoardTheme(theme);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Responsive board size ----
  React.useEffect(() => {
    function update() {
      setBoardSize(Math.min(420, window.innerWidth - 32));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ---- Clock interval ----
  const clockRef = React.useRef<ReturnType<typeof setInterval>>();
  const lastTickRef = React.useRef<number>(Date.now());

  React.useEffect(() => {
    if (status !== "playing") {
      if (clockRef.current) clearInterval(clockRef.current);
      return;
    }

    lastTickRef.current = Date.now();
    clockRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;
      tickClock(turn, elapsed);

      // In multiplayer, broadcast clock every ~200ms when it's our turn
      if (mode === "multiplayer" && turn === playerColor) {
        const currentClock = useGameStore.getState().clock;
        broadcastClock(currentClock.whiteMs, currentClock.blackMs);
      }
    }, 100);

    return () => {
      if (clockRef.current) clearInterval(clockRef.current);
    };
  }, [status, turn, tickClock, mode, playerColor, broadcastClock]);

  // ---- Process incoming multiplayer moves ----
  React.useEffect(() => {
    if (mode !== "multiplayer" || incomingMoves.length === 0) return;

    for (const move of incomingMoves) {
      // Only apply if it's the opponent's move (our moves come through makeMove)
      const moveSide = move.ply % 2 === 0 ? "w" : "b";
      if (moveSide !== playerColor && !useGameStore.getState().uciHistory.includes(move.uci)) {
        const applied = applyRemoteMove(move.uci);
        // Update clock from server time
        if (applied) {
          const opponentSide = playerColor === "w" ? "b" : "w";
          addIncrement(opponentSide);
        }
      }
    }
    clearMoves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingMoves, mode, playerColor]);

  // ---- Process incoming game actions (resign, draw) ----
  React.useEffect(() => {
    if (!incomingAction) return;

    if (incomingAction.type === "resign") {
      // Opponent resigned → we win
      const winResult = playerColor === "w" ? "1-0" : "0-1";
      setStatus("resigned", winResult as "1-0" | "0-1");
      clearAction();
    } else if (incomingAction.type === "draw_offer") {
      // Show draw offer UI
      setDrawOfferReceived(true);
      clearAction();
    } else if (incomingAction.type === "draw_accept") {
      // Draw accepted by opponent
      setStatus("draw", "1/2-1/2");
      setDrawOfferPending(false);
      clearAction();
    }
  }, [incomingAction, playerColor, setStatus, clearAction]);

  React.useEffect(() => {
    if (mode !== "multiplayer") return;
    if (!gameStatus || gameStatus === "waiting" || gameStatus === "active") return;
    setStatus(gameStatus as Parameters<typeof setStatus>[0], gameResult as Parameters<typeof setStatus>[1]);
  }, [mode, gameStatus, gameResult, setStatus]);

  // ---- Bot move trigger (bot mode only) ----
  React.useEffect(() => {
    if (mode !== "bot") return;
    if (status !== "playing") return;
    if (turn === playerColor) return;

    setBotThinking(true);

    const engine = getOpponentEngine();
    const thinkMs = DIFFICULTY_THINK_MS[difficulty];

    if (uciHistory.length === 0) {
      engine.send({ type: "position" });
    } else {
      engine.send({ type: "position", moves: uciHistory });
    }
    engine.send({ type: "go", movetimeMs: thinkMs });

    const off = engine.on((event: EngineEvent) => {
      if (event.type === "bestmove") {
        off();
        setBotThinking(false);
        const success = makeMove(event.uci);
        if (success) {
          const botColor = playerColor === "w" ? "b" : "w";
          addIncrement(botColor);
        }
      }
    });

    return () => { off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, status, playerColor, mode]);

  // ---- Game end callback ----
  React.useEffect(() => {
    if (
      status !== "playing" &&
      status !== "idle" &&
      status !== "waiting" &&
      result &&
      gameId
    ) {
      // In multiplayer, persist game end status
      if (mode === "multiplayer") {
        void updateGameStatus(gameId, status, result, fen, pgn);
      }
      onGameEnd?.(gameId, result);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, result]);

  // ---- User move handler ----
  async function handleUserMove(from: string, to: string) {
    if (status !== "playing") return;
    if (turn !== playerColor) return;

    const uci = `${from}${to}`;
    const rank = to[1];
    const isPawnPromotion =
      (playerColor === "w" && rank === "8") ||
      (playerColor === "b" && rank === "1");
    const moveUci = isPawnPromotion ? `${uci}q` : uci;

    const success = makeMove(moveUci);
    if (!success) return;

    addIncrement(playerColor);

    // In multiplayer: broadcast INSTANTLY, then persist to DB in background
    if (mode === "multiplayer" && gameId) {
      const store = useGameStore.getState();
      const lastSan = store.moveHistory[store.moveHistory.length - 1] ?? "";
      const timeLeft = playerColor === "w" ? store.clock.whiteMs : store.clock.blackMs;
      const ply = store.moveHistory.length - 1;

      // 1. Broadcast for instant delivery (~50ms)
      broadcastMove({
        ply,
        san: lastSan,
        uci: moveUci,
        fenAfter: store.fen,
        timeLeftMs: timeLeft,
      });

      // 2. Persist to DB in background (don't await — no delay)
      void submitMove(gameId, moveUci, lastSan, store.fen, timeLeft);
    }
  }

  // ---- Resign handler (with broadcast) ----
  function handleResign() {
    if (mode === "multiplayer") {
      broadcastResign();
    }
    resign();
  }

  // ---- Draw offer handler ----
  function handleOfferDraw() {
    if (status !== "playing") return;

    if (mode === "bot") {
      // In bot games, auto-accept
      setStatus("draw", "1/2-1/2");
    } else if (mode === "multiplayer") {
      // Send draw offer to opponent
      broadcastDrawOffer();
      setDrawOfferPending(true);
    }
  }

  // ---- Accept draw ----
  function handleAcceptDraw() {
    broadcastDrawAccept();
    setStatus("draw", "1/2-1/2");
    setDrawOfferReceived(false);
  }

  // ---- Decline draw ----
  function handleDeclineDraw() {
    setDrawOfferReceived(false);
  }

  // ---- Claim win on disconnect ----
  function handleClaimWin() {
    if (mode !== "multiplayer") return;
    if (opponentDisconnectedSecs < 30) return;
    const winResult = playerColor === "w" ? "1-0" : "0-1";
    setStatus("timeout", winResult as "1-0" | "0-1");
  }

  // ---- Move list ----
  const movePairs = React.useMemo(() => {
    const pairs: { num: number; white: string; black?: string }[] = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: moveHistory[i]!,
        black: moveHistory[i + 1],
      });
    }
    return pairs;
  }, [moveHistory]);

  const captured = React.useMemo(() => {
    const byWhite: Array<"p" | "n" | "b" | "r" | "q"> = [];
    const byBlack: Array<"p" | "n" | "b" | "r" | "q"> = [];
    const replay = new Chess();
    for (const uci of uciHistory) {
      const move = replay.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? "q" });
      if (move?.captured && move.captured !== "k") {
        const bucket = move.color === "w" ? byWhite : byBlack;
        bucket.push(move.captured as "p" | "n" | "b" | "r" | "q");
      }
    }
    return { w: byWhite, b: byBlack };
  }, [uciHistory]);

  // ---- Derived display ----
  const isPlayerTurn = turn === playerColor;
  const playerName = "You";
  const displayOpponent = mode === "multiplayer" ? opponentName : `Stockfish (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})`;

  const topName = playerColor === "w" ? displayOpponent : playerName;
  const bottomName = playerColor === "w" ? playerName : displayOpponent;
  const topColor = playerColor === "w" ? "b" : "w";
  const bottomColor = playerColor;
  const topClock = playerColor === "w" ? formatClock(clock.blackMs) : formatClock(clock.whiteMs);
  const bottomClock = playerColor === "w" ? formatClock(clock.whiteMs) : formatClock(clock.blackMs);
  const topElo = playerColor === "w" ? 0 : 1200;
  const bottomElo = playerColor === "w" ? 1200 : 0;
  const isGameOver = !["playing", "idle", "waiting"].includes(status);

  return (
    <main className="flex min-h-[100dvh] flex-col bg-surfaceLight">
      {/* Multiplayer connection status */}
      {mode === "multiplayer" && (
        <div className={cn(
          "flex items-center justify-center gap-2 py-1 text-xs font-extrabold",
          opponentOnline ? "bg-winGreen/10 text-winGreen" : "bg-lossRed/10 text-lossRed"
        )}>
          {opponentOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {opponentOnline ? "Opponent connected" : `Opponent disconnected (${opponentDisconnectedSecs}s)`}
          {!opponentOnline && opponentDisconnectedSecs >= 30 && !isGameOver && (
            <button
              onClick={handleClaimWin}
              className="ml-2 rounded-chip bg-lossRed px-2 py-0.5 text-[10px] font-extrabold text-white"
            >
              Claim Win
            </button>
          )}
        </div>
      )}

      {/* Draw offer received banner */}
      {drawOfferReceived && !isGameOver && (
        <div className="flex items-center justify-center gap-3 bg-proGold/10 py-2 text-sm font-extrabold text-navy">
          <Handshake className="h-4 w-4 text-proGold" />
          Opponent offers a draw
          <button
            onClick={handleAcceptDraw}
            className="flex items-center gap-1 rounded-chip bg-winGreen px-3 py-1 text-xs font-extrabold text-white"
          >
            <Check className="h-3 w-3" /> Accept
          </button>
          <button
            onClick={handleDeclineDraw}
            className="flex items-center gap-1 rounded-chip bg-lossRed px-3 py-1 text-xs font-extrabold text-white"
          >
            <X className="h-3 w-3" /> Decline
          </button>
        </div>
      )}

      {/* Draw offer pending (sent by us) */}
      {drawOfferPending && !isGameOver && (
        <div className="flex items-center justify-center gap-2 bg-sky/10 py-1.5 text-xs font-extrabold text-cobalt">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-cobalt/30 border-t-cobalt" />
          Draw offer sent — waiting for opponent…
        </div>
      )}

      {/* Opponent strip */}
      <header className="sticky top-0 z-20 flex flex-col gap-2 bg-surfaceLight px-3 pb-2 pt-3">
        <PlayerStrip
          name={topName}
          elo={topElo}
          rank="Bronze"
          clock={topClock}
          active={
            !isGameOver &&
            ((playerColor === "w" && turn === "b") ||
              (playerColor === "b" && turn === "w"))
          }
          capturedTypes={captured[topColor]}
        />
      </header>

      {/* Board */}
      <section className="flex flex-1 flex-col items-center justify-center gap-3 px-3 py-3 lg:flex-row lg:items-start lg:gap-6">
        <div className="flex w-full justify-center">
          <ChessboardWrapper
            position={fen}
            size={boardSize}
            boardTheme={boardTheme}
            orientation={playerColor === "w" ? "white" : "black"}
            highlightLast={lastMove ?? undefined}
            onMove={handleUserMove}
          />
        </div>

        {/* Desktop side panel */}
        <aside className="hidden w-72 flex-shrink-0 rounded-card bg-white p-4 shadow-card lg:block">
          <h3 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted">
            {t("moves")}
          </h3>
          <ol className="max-h-72 space-y-1 overflow-auto text-sm font-bold text-navy">
            {movePairs.map((m) => (
              <li
                key={m.num}
                className="grid grid-cols-[24px_1fr_1fr] gap-2 rounded-chip px-2 py-1 odd:bg-pale"
              >
                <span className="tabnum text-muted">{m.num}.</span>
                <span>{m.white}</span>
                <span>{m.black ?? ""}</span>
              </li>
            ))}
          </ol>

          {botThinking && (
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-cobalt">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-cobalt/30 border-t-cobalt" />
              Stockfish is thinking…
            </div>
          )}
        </aside>
      </section>

      {/* Player strip */}
      <div className="px-3 pb-2">
        <PlayerStrip
          name={bottomName}
          elo={bottomElo}
          rank="Gold"
          clock={bottomClock}
          active={!isGameOver && isPlayerTurn}
          capturedTypes={captured[bottomColor]}
        />
      </div>

      {/* Game over banner */}
      {isGameOver && (
        <div className="mx-3 mb-2 rounded-card bg-gradient-to-r from-sky to-cobalt p-4 text-center text-white shadow-hero">
          <h2 className="text-xl font-extrabold">
            {status === "checkmate" && ((result === "1-0" && playerColor === "w") || (result === "0-1" && playerColor === "b"))
              ? "Checkmate — You win!"
              : status === "checkmate"
                ? "Checkmate — You lose"
                : status === "timeout" && ((result === "1-0" && playerColor === "w") || (result === "0-1" && playerColor === "b"))
                  ? "Time out — You win!"
                  : status === "timeout"
                    ? "Time out — You lose"
                    : status === "stalemate"
                      ? "Stalemate — Draw"
                      : status === "draw"
                        ? "Draw"
                        : status === "resigned"
                          ? ((result === "1-0" && playerColor === "w") || (result === "0-1" && playerColor === "b"))
                            ? "Opponent Resigned — You win!"
                            : "You Resigned"
                          : status === "aborted"
                            ? "Game aborted"
                            : "Game Over"}
          </h2>
          <p className="mt-1 text-sm font-bold text-white/80">{result ?? ""}</p>
        </div>
      )}

      {/* Action bar */}
      <div className="sticky bottom-0 z-20 flex items-center gap-2 border-t-2 border-pale bg-white px-3 py-3">
        <ChunkyButton
          variant="danger"
          size="sm"
          iconLeft={<Flag className="h-4 w-4" />}
          onClick={handleResign}
          disabled={isGameOver}
        >
          {t("resign")}
        </ChunkyButton>
        <ChunkyButton
          variant="ghost"
          size="sm"
          iconLeft={<Handshake className="h-4 w-4" />}
          onClick={handleOfferDraw}
          disabled={isGameOver || drawOfferPending}
        >
          {t("draw")}
        </ChunkyButton>
        <button
          onClick={() => setDrawer((d) => !d)}
          className="ml-auto flex items-center gap-1 rounded-full bg-pale px-3 py-2 text-xs font-extrabold text-cobalt lg:hidden"
        >
          {t("moves")}
          <ChevronUp
            className={cn("h-4 w-4 transition", drawer && "rotate-180")}
          />
        </button>
      </div>

      {/* Mobile move drawer */}
      {drawer && (
        <div className="fixed inset-x-0 bottom-16 z-30 max-h-72 overflow-auto rounded-t-hero border-t-2 border-pale bg-white p-4 shadow-hero lg:hidden">
          <h3 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted">
            {t("moves")}
          </h3>
          <ol className="space-y-1 text-sm font-bold text-navy">
            {movePairs.map((m) => (
              <li
                key={m.num}
                className="grid grid-cols-[24px_1fr_1fr] gap-2 rounded-chip px-2 py-1 odd:bg-pale"
              >
                <span className="tabnum text-muted">{m.num}.</span>
                <span>{m.white}</span>
                <span>{m.black ?? ""}</span>
              </li>
            ))}
          </ol>
          {botThinking && (
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-cobalt">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-cobalt/30 border-t-cobalt" />
              Stockfish is thinking…
            </div>
          )}
        </div>
      )}
    </main>
  );
}
