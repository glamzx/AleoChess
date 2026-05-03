"use client";

/**
 * /play/bot/[gameId] — Active bot game.
 *
 * Reads config from search params, initializes the game store + engine,
 * then mounts the Game component. On game end, persists to Supabase
 * and navigates to the post-game review.
 */

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Chess } from "chess.js";
import { useGameStore, DIFFICULTY_SKILL } from "@/lib/chess/game-state";
import { getOpponentEngine } from "@/lib/engine/engine-pool";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/store";
import { Game } from "@/components/game/Game";
import type { BotDifficulty, TimeControl } from "@/lib/chess/game-state";
import type { GameInsert } from "@aleo/shared";

export default function BotGamePage({
  params,
}: {
  params: { gameId: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = useAuth((s) => s.user?.id ?? null);
  const _status = useGameStore((s) => s.status);
  const initGame = useGameStore((s) => s.initGame);

  const [initialized, setInitialized] = React.useState(false);

  // ---- Parse config from query params ----
  const config = React.useMemo(() => {
    const d = (searchParams.get("d") ?? "casual") as BotDifficulty;
    const tParts = (searchParams.get("t") ?? "300000,3000").split(",");
    const s = (searchParams.get("s") ?? "white") as "white" | "black";
    const tc: TimeControl = {
      initialMs: Number(tParts[0]) || 300_000,
      incrementMs: Number(tParts[1]) || 0,
    };
    return {
      difficulty: d,
      timeControl: tc,
      playerColor: (s === "black" ? "b" : "w") as "w" | "b",
      timeControlLabel: searchParams.get("tc") ?? "5+3",
    };
  }, [searchParams]);

  // ---- Initialize game + engine on mount ----
  React.useEffect(() => {
    if (initialized) return;
    setInitialized(true);

    // Init game store
    initGame({
      gameId: params.gameId,
      playerColor: config.playerColor,
      timeControl: config.timeControl,
      difficulty: config.difficulty,
    });

    // Configure engine
    const engine = getOpponentEngine();
    engine.send({
      type: "setoption",
      name: "Skill Level",
      value: String(DIFFICULTY_SKILL[config.difficulty]),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Handle game end ----
  const handleGameEnd = React.useCallback(
    async (gameId: string, result: string) => {
      const store = useGameStore.getState();

      // Persist to Supabase (best-effort — don't block navigation)
      try {
        const supabase = getSupabaseBrowserClient();
        const isPlayerWhite = config.playerColor === "w";

        const gameStatus = store.status === "checkmate"
          ? "checkmate" as const
          : store.status === "stalemate"
            ? "stalemate" as const
            : store.status === "draw"
              ? "draw" as const
              : store.status === "resigned"
                ? "resigned" as const
                : "aborted" as const;

        const payload: GameInsert = {
          id: gameId,
          white_id: isPlayerWhite ? userId : null,
          black_id: isPlayerWhite ? null : userId,
          mode: "bot",
          time_control: config.timeControlLabel,
          status: gameStatus,
          result: result as "1-0" | "0-1" | "1/2-1/2",
          pgn: store.pgn || "*",
          final_fen: store.fen,
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("games") as any).insert(payload);

        const replay = new Chess();
        const moves = store.uciHistory.map((uci, ply) => {
          const move = replay.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? "q" });
          return {
            game_id: gameId,
            ply,
            san: move?.san ?? store.moveHistory[ply] ?? uci,
            uci,
            fen_after: replay.fen(),
            time_left_ms: 0,
          };
        });
        if (moves.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("game_moves") as any).insert(moves);
        }

        if (userId) {
          const won = (isPlayerWhite && result === "1-0") || (!isPlayerWhite && result === "0-1");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.rpc as any)("process_retention_event", {
            p_user_id: userId,
            p_event: {
              kind: "game_played",
              game_id: gameId,
              mode: "bot",
              status: gameStatus,
              result,
              color: isPlayerWhite ? "white" : "black",
              won,
              wager_amount: 0,
              elo_delta: 0,
              moves: Math.ceil(store.uciHistory.length / 2),
              time_control: config.timeControlLabel,
              time_control_family: config.timeControlLabel.includes("10") ? "rapid" : "blitz"
            }
          });
        }
      } catch (err) {
        console.error("[BotGame] Failed to persist game:", err);
      }

      // Navigate to post-game review
      router.push(`/games/${gameId}/review`);
    },
    [config.playerColor, config.timeControlLabel, userId, router]
  );

  if (!initialized) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-surfaceLight">
        <div className="flex flex-col items-center gap-3">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky/30 border-t-sky" />
          <p className="text-sm font-extrabold text-cobalt">
            Setting up game…
          </p>
        </div>
      </main>
    );
  }

  return <Game onGameEnd={handleGameEnd} />;
}
