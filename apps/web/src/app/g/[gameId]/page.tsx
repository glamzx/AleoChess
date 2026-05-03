"use client";

/**
 * /g/[gameId] — Multiplayer game page.
 *
 * If the game is 'waiting' and the current user is not the creator,
 * auto-joins the game. Then renders the Game component in multiplayer mode.
 * Also used by the game creator to view their own game board.
 */

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { Game } from "@/components/game/Game";
import { PostGameMock } from "@/components/game/PostGameMock";
import { useGameStore } from "@/lib/chess/game-state";
import { joinGameRoom } from "@/lib/multiplayer/realtime";
import { useAuth } from "@/lib/auth/store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AleoMascot } from "@/components/AleoMascot";
import { ChunkyButton } from "@/components/ChunkyButton";
import Link from "next/link";

// Time control parser
function parseTimeControl(tc: string): { initialMs: number; incrementMs: number } {
  const parts = tc.split("+");
  const minutes = parseInt(parts[0] ?? "5", 10);
  const increment = parseInt(parts[1] ?? "0", 10);
  return {
    initialMs: minutes * 60_000,
    incrementMs: increment * 1_000,
  };
}

type PageState =
  | "loading"
  | "auth-pending"
  | "joining"
  | "waiting-for-opponent"
  | "playing"
  | "game-over"
  | "error";

export default function MultiplayerGamePage() {
  const params = useParams();
  const _router = useRouter();
  const gameId = params.gameId as string;

  const userId = useAuth((s) => s.user?.id ?? null);
  const authStatus = useAuth((s) => s.status);
  const initGame = useGameStore((s) => s.initGame);
  const storeStatus = useGameStore((s) => s.status);
  const result = useGameStore((s) => s.result);
  const playerColor = useGameStore((s) => s.playerColor);

  const [pageState, setPageState] = React.useState<PageState>("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [initialized, setInitialized] = React.useState(false);

  // Auto sign-in if needed — use browser client directly so onAuthStateChange fires
  React.useEffect(() => {
    if (authStatus === "unauthenticated") {
      setPageState("auth-pending");
      const supabase = getSupabaseBrowserClient();
      void supabase.auth.signInAnonymously().then(({ error: authErr }) => {
        if (authErr) {
          setError("Sign-in failed: " + authErr.message);
          setPageState("error");
        }
      });
    } else if (authStatus === "loading") {
      setPageState("loading");
    }
  }, [authStatus]);

  // Listen for opponent join via broadcast + DB update + short polling.
  React.useEffect(() => {
    if (!gameId || pageState !== "waiting-for-opponent") return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`game:${gameId}`);

    function startGame() {
      useGameStore.setState({
        status: "playing",
        opponentName: "Friend",
      });
      setPageState("playing");
    }

    async function checkGame() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("games") as any)
        .select("status, white_id, black_id")
        .eq("id", gameId)
        .maybeSingle();
      if (data?.status === "active" || (data?.white_id && data?.black_id)) {
        startGame();
      }
    }

    channel.on("broadcast", { event: "player_joined" }, (payload) => {
      const msg = payload.payload as { userId: string; status: string };
      if (msg.userId !== userId) {
        startGame();
      }
    });

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `id=eq.${gameId}`
      },
      (payload) => {
        const row = payload.new as {
          status?: string;
          white_id?: string | null;
          black_id?: string | null;
        };
        if (row.status === "active" || (row.white_id && row.black_id)) {
          startGame();
        }
      }
    );

    channel.subscribe();
    void checkGame();
    const interval = window.setInterval(checkGame, 500);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [gameId, pageState, userId]);

  // Main initialization logic
  React.useEffect(() => {
    if (!userId || initialized) return;

    async function init() {
      try {
        const supabase = getSupabaseBrowserClient();

        // Fetch the game
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: game, error: fetchErr } = await (supabase.from("games") as any)
          .select("*")
          .eq("id", gameId)
          .maybeSingle();

        if (fetchErr || !game) {
          setError("Game not found");
          setPageState("error");
          return;
        }

        const isCreator = game.white_id === userId || game.black_id === userId;

        if (game.status === "waiting") {
          if (isCreator) {
            // Creator: show waiting screen, init game but don't start yet
            const creatorColor = game.white_id === userId ? "w" : "b";
            const tc = parseTimeControl(game.time_control);

            initGame({
              gameId,
              playerColor: creatorColor as "w" | "b",
              timeControl: tc,
              difficulty: "casual",
              mode: "multiplayer",
              opponentName: "Waiting...",
            });

            // Override status to waiting
            useGameStore.setState({ status: "waiting" });
            setPageState("waiting-for-opponent");
            setInitialized(true);
          } else {
            // Joiner: join the game
            setPageState("joining");
            try {
              const joinResult = await joinGameRoom(gameId);
              const tc = parseTimeControl(joinResult.timeControl);

              initGame({
                gameId,
                playerColor: joinResult.playerColor,
                timeControl: tc,
                difficulty: "casual",
                mode: "multiplayer",
                opponentName: "Friend",
              });

              setPageState("playing");
              setInitialized(true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (joinErr: any) {
              setError(joinErr.message ?? "Failed to join game");
              setPageState("error");
            }
          }
        } else if (game.status === "active") {
          // Game already active — rejoin
          const myColor = game.white_id === userId ? "w" : (game.black_id === userId ? "b" : null);
          if (!myColor) {
            setError("You are not a participant in this game");
            setPageState("error");
            return;
          }

          const tc = parseTimeControl(game.time_control);
          initGame({
            gameId,
            playerColor: myColor,
            timeControl: tc,
            difficulty: "casual",
            mode: "multiplayer",
            opponentName: "Friend",
          });

          // Replay existing moves
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: moves } = await (supabase.from("game_moves") as any)
            .select("*")
            .eq("game_id", gameId)
            .order("ply", { ascending: true });

          if (moves && moves.length > 0) {
            const applyRemoteMove = useGameStore.getState().applyRemoteMove;
            for (const m of moves) {
              applyRemoteMove(m.uci);
            }
          }

          setPageState("playing");
          setInitialized(true);
        } else {
          // Game is already finished
          setError(`Game has ended (${game.status})`);
          setPageState("error");
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setError(err.message ?? "Something went wrong");
        setPageState("error");
      }
    }

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Track game end
  React.useEffect(() => {
    if (storeStatus !== "playing" && storeStatus !== "idle" && storeStatus !== "waiting" && result) {
      setPageState("game-over");
    }
  }, [storeStatus, result]);

  function handleGameEnd(_gId: string, _res: string) {
    setPageState("game-over");
  }

  // ---- Render ----
  if (pageState === "loading" || pageState === "auth-pending") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-surfaceLight">
        <Loader2 className="h-8 w-8 animate-spin text-cobalt" />
        <p className="mt-3 text-sm font-extrabold text-navy">
          {pageState === "auth-pending" ? "Signing in..." : "Loading game..."}
        </p>
      </main>
    );
  }

  if (pageState === "error") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-surfaceLight px-6">
        <AlertCircle className="h-12 w-12 text-lossRed" />
        <h1 className="text-xl font-extrabold text-navy">Oops!</h1>
        <p className="text-center text-sm font-bold text-muted">{error}</p>
        <Link href="/play">
          <ChunkyButton pill>Back to Home</ChunkyButton>
        </Link>
      </main>
    );
  }

  if (pageState === "joining") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-surfaceLight">
        <AleoMascot mood="cheer" size={120} bobbing />
        <Loader2 className="mt-4 h-6 w-6 animate-spin text-cobalt" />
        <p className="mt-3 text-sm font-extrabold text-navy">
          Joining game...
        </p>
      </main>
    );
  }

  if (pageState === "waiting-for-opponent") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-surfaceLight px-6">
        <AleoMascot mood="thinking" size={140} bobbing />
        <h1 className="text-xl font-extrabold text-navy">
          Waiting for your friend…
        </h1>
        <p className="text-center text-sm font-bold text-muted">
          Share the link to invite them to this game
        </p>
        <div className="flex items-center gap-2 rounded-card bg-white px-4 py-2 shadow-card">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-cobalt/30 border-t-cobalt" />
          <span className="text-xs font-extrabold text-cobalt">
            Listening for opponent…
          </span>
        </div>
        <button
          onClick={async () => {
            const url = `${window.location.origin}/g/${gameId}`;
            await navigator.clipboard.writeText(url);
          }}
          className="mt-2 rounded-full bg-sky px-4 py-2 text-sm font-extrabold text-white shadow-card transition hover:bg-cobalt"
        >
          Copy Game Link
        </button>
      </main>
    );
  }

  if (pageState === "game-over" && result) {
    return (
      <PostGameMock
        result={result as "1-0" | "0-1" | "1/2-1/2"}
        playerColor={playerColor}
        difficulty="friend"
        gameId={gameId}
      />
    );
  }

  return <Game onGameEnd={handleGameEnd} />;
}
