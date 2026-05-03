"use client";

/**
 * Multiplayer realtime module.
 *
 * Uses a SINGLE Supabase broadcast channel per game for ALL events:
 *   - `move` — instant move delivery
 *   - `player_joined` — opponent join notification
 *   - `clock_tick` — clock sync
 *   - `game_action` — resign, draw offer/accept
 *
 * IMPORTANT: Channel name must be IDENTICAL for all participants:
 *   `game:${gameId}` — no random suffixes!
 */

import * as React from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/store";
import type { TimeControl } from "@/lib/chess/game-state";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RealtimeMove {
  ply: number;
  san: string;
  uci: string;
  fenAfter: string;
  timeLeftMs: number;
}

// ---------------------------------------------------------------------------
// Room management
// ---------------------------------------------------------------------------

/**
 * Create a new friend-match game room.
 */
export async function createGameRoom(
  timeControl: TimeControl,
  timeControlLabel: string,
  creatorSide: "white" | "black" | "random"
): Promise<{ gameId: string; creatorColor: "w" | "b" }> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be signed in to create a game");

  const resolvedSide =
    creatorSide === "random"
      ? Math.random() < 0.5 ? "white" : "black"
      : creatorSide;

  const creatorColor: "w" | "b" = resolvedSide === "white" ? "w" : "b";
  const gameId = crypto.randomUUID();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("games") as any).insert({
    id: gameId,
    white_id: resolvedSide === "white" ? user.id : null,
    black_id: resolvedSide === "black" ? user.id : null,
    mode: "friend",
    time_control: timeControlLabel,
    status: "waiting",
    pgn: "",
    started_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  return { gameId, creatorColor };
}

/**
 * Join an existing friend-match game room.
 * Broadcasts join event on the SAME channel the creator is listening on.
 */
export async function joinGameRoom(gameId: string): Promise<{
  playerColor: "w" | "b";
  opponentId: string;
  timeControl: string;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be signed in to join a game");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: game, error: fetchErr } = await (supabase.from("games") as any)
    .select("*")
    .eq("id", gameId)
    .maybeSingle();

  if (fetchErr || !game) throw new Error("Game not found");
  if (game.status !== "waiting") throw new Error("Game is no longer waiting");

  if (game.white_id === user.id || game.black_id === user.id) {
    throw new Error("You are already in this game");
  }

  const isWhiteEmpty = !game.white_id;
  const targetColumn = isWhiteEmpty ? "white_id" : "black_id";
  const updateData = isWhiteEmpty
    ? { white_id: user.id, status: "active", last_move_at: new Date().toISOString() }
    : { black_id: user.id, status: "active", last_move_at: new Date().toISOString() };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (supabase.from("games") as any)
    .update(updateData)
    .eq("id", gameId)
    .eq("status", "waiting")
    .is(targetColumn, null);

  if (updateErr) throw new Error(updateErr.message);

  // Broadcast join on the EXACT same channel name the creator listens on
  const ch = supabase.channel(`game:${gameId}`);
  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(() => {
      supabase.removeChannel(ch);
      resolve();
    }, 900);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        window.clearTimeout(timeout);
        ch.send({
          type: "broadcast",
          event: "player_joined",
          payload: { userId: user.id, status: "active" },
        });
        setTimeout(() => {
          supabase.removeChannel(ch);
          resolve();
        }, 300);
      }
    });
  });

  return {
    playerColor: isWhiteEmpty ? "w" : "b",
    opponentId: isWhiteEmpty ? game.black_id! : game.white_id!,
    timeControl: game.time_control,
  };
}

/**
 * Submit a move via RPC (anti-cheat + persistence).
 * Move delivery to opponent is handled by broadcast, NOT this function.
 */
export async function submitMove(
  gameId: string,
  uci: string,
  san: string,
  fenAfter: string,
  timeLeftMs: number
): Promise<{ ok: boolean; ply?: number; error?: string }> {
  const supabase = getSupabaseBrowserClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("submit_move", {
    p_game_id: gameId,
    p_uci: uci,
    p_san: san,
    p_fen_after: fenAfter,
    p_time_left_ms: timeLeftMs,
  });

  if (error) return { ok: false, error: error.message };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = data as any;
  if (!result?.ok) return { ok: false, error: result?.error ?? "Unknown error" };
  return { ok: true, ply: result.ply };
}

/**
 * Update game status when game ends.
 */
export async function updateGameStatus(
  gameId: string,
  status: string,
  result: string,
  finalFen: string,
  pgn: string
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("games") as any)
    .update({
      status,
      result,
      final_fen: finalFen,
      pgn,
      ended_at: new Date().toISOString(),
    })
    .eq("id", gameId);

  await supabase.functions.invoke("apply-elo", {
    body: { gameId },
  });
}

// ---------------------------------------------------------------------------
// Realtime hook
// ---------------------------------------------------------------------------

interface UseGameChannelReturn {
  opponentOnline: boolean;
  opponentDisconnectedSecs: number;
  incomingMoves: RealtimeMove[];
  clearMoves: () => void;
  gameStatus: string | null;
  gameResult: string | null;
  broadcastClock: (whiteMs: number, blackMs: number) => void;
  remoteClock: { whiteMs: number; blackMs: number } | null;
  broadcastMove: (move: RealtimeMove) => void;
  broadcastResign: () => void;
  broadcastDrawOffer: () => void;
  broadcastDrawAccept: () => void;
  incomingAction: { type: "resign" | "draw_offer" | "draw_accept"; sender: string } | null;
  clearAction: () => void;
}

/**
 * React hook for multiplayer game Realtime.
 *
 * CRITICAL: Channel name is `game:${gameId}` — must match joinGameRoom().
 */
export function useGameChannel(
  gameId: string | null,
  enabled: boolean = true
): UseGameChannelReturn {
  const userId = useAuth((s) => s.user?.id ?? null);
  const [opponentOnline, setOpponentOnline] = React.useState(false);
  const [opponentLastSeen, setOpponentLastSeen] = React.useState(Date.now());
  const [disconnectedSecs, setDisconnectedSecs] = React.useState(0);
  const [incomingMoves, setIncomingMoves] = React.useState<RealtimeMove[]>([]);
  const [gameStatus, setGameStatus] = React.useState<string | null>(null);
  const [gameResult, setGameResult] = React.useState<string | null>(null);
  const [remoteClock, setRemoteClock] = React.useState<{ whiteMs: number; blackMs: number } | null>(null);
  const [incomingAction, setIncomingAction] = React.useState<{ type: "resign" | "draw_offer" | "draw_accept"; sender: string } | null>(null);
  const channelRef = React.useRef<ReturnType<typeof getSupabaseBrowserClient>["channel"] extends (name: string) => infer R ? R : never>();
  const channelReadyRef = React.useRef(false);
  const queuedBroadcastsRef = React.useRef<
    { event: string; payload: Record<string, unknown> }[]
  >([]);
  const subscribedRef = React.useRef(false);

  React.useEffect(() => {
    if (!gameId || !enabled || !userId) return;

    // Prevent duplicate subscriptions
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    const supabase = getSupabaseBrowserClient();

    // MUST use the exact same channel name as joinGameRoom: `game:${gameId}`
    const channel = supabase.channel(`game:${gameId}`, {
      config: { presence: { key: userId } },
    });

    function queueOrSend(event: string, payload: Record<string, unknown>) {
      if (!channelReadyRef.current) {
        queuedBroadcastsRef.current.push({ event, payload });
        return;
      }
      void channel.send({ type: "broadcast", event, payload });
    }

    // ---- ALL listeners BEFORE subscribe() ----

    // Instant move delivery via broadcast
    channel.on("broadcast", { event: "move" }, (payload) => {
      const msg = payload.payload as RealtimeMove & { sender: string };
      if (msg.sender !== userId) {
        setIncomingMoves((prev) => [...prev, {
          ply: msg.ply,
          san: msg.san,
          uci: msg.uci,
          fenAfter: msg.fenAfter,
          timeLeftMs: msg.timeLeftMs,
        }]);
      }
    });

    // Opponent joined
    channel.on("broadcast", { event: "player_joined" }, (payload) => {
      const msg = payload.payload as { userId: string; status: string };
      if (msg.userId !== userId) {
        setOpponentOnline(true);
        setOpponentLastSeen(Date.now());
        setGameStatus("active");
      }
    });

    // Clock sync
    channel.on("broadcast", { event: "clock_tick" }, (payload) => {
      const msg = payload.payload as { whiteMs: number; blackMs: number; sender: string };
      if (msg.sender !== userId) {
        setRemoteClock({ whiteMs: msg.whiteMs, blackMs: msg.blackMs });
      }
    });

    // Game actions (resign, draw)
    channel.on("broadcast", { event: "game_action" }, (payload) => {
      const msg = payload.payload as { type: "resign" | "draw_offer" | "draw_accept"; sender: string };
      if (msg.sender !== userId) {
        setIncomingAction(msg);
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
          result?: string | null;
        };
        if (row.status) setGameStatus(row.status);
        if ("result" in row) setGameResult(row.result ?? null);
        if (row.white_id && row.black_id) {
          setOpponentOnline(true);
          setOpponentLastSeen(Date.now());
        }
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "game_moves",
        filter: `game_id=eq.${gameId}`
      },
      (payload) => {
        const row = payload.new as {
          ply: number;
          san: string;
          uci: string;
          fen_after: string;
          time_left_ms: number;
        };
        setIncomingMoves((prev) => [
          ...prev,
          {
            ply: row.ply,
            san: row.san,
            uci: row.uci,
            fenAfter: row.fen_after,
            timeLeftMs: row.time_left_ms
          }
        ]);
      }
    );

    // Presence
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const keys = Object.keys(state);
      const opponentPresent = keys.some((k) => k !== userId);
      setOpponentOnline(opponentPresent);
      if (opponentPresent) setOpponentLastSeen(Date.now());
    });

    channel.on("presence", { event: "leave" }, () => {
      setOpponentOnline(false);
    });

    // Subscribe AFTER all listeners
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        channelReadyRef.current = true;
        await channel.track({ userId, joinedAt: Date.now() });
        queueOrSend("heartbeat", { userId, at: Date.now() });
        for (const queued of queuedBroadcastsRef.current.splice(0)) {
          void channel.send({
            type: "broadcast",
            event: queued.event,
            payload: queued.payload
          });
        }
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channelRef.current = channel as any;

    return () => {
      subscribedRef.current = false;
      channelReadyRef.current = false;
      queuedBroadcastsRef.current = [];
      supabase.removeChannel(channel);
    };
  }, [gameId, enabled, userId]);

  // Disconnection timer
  React.useEffect(() => {
    if (opponentOnline) {
      setDisconnectedSecs(0);
      return;
    }
    const interval = setInterval(() => {
      setDisconnectedSecs(Math.floor((Date.now() - opponentLastSeen) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [opponentOnline, opponentLastSeen]);

  const clearMoves = React.useCallback(() => setIncomingMoves([]), []);

  const broadcastClock = React.useCallback(
    (whiteMs: number, blackMs: number) => {
      if (!channelRef.current || !userId) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void (channelRef.current as any).send({
        type: "broadcast",
        event: "clock_tick",
        payload: { whiteMs, blackMs, sender: userId },
      });
    },
    [userId]
  );

  const broadcastMove = React.useCallback(
    (move: RealtimeMove) => {
      if (!userId) return;
      const payload = { ...move, sender: userId };
      if (!channelRef.current || !channelReadyRef.current) {
        queuedBroadcastsRef.current.push({ event: "move", payload });
        return;
      }
      void channelRef.current.send({
        type: "broadcast",
        event: "move",
        payload,
      });
    },
    [userId]
  );

  const broadcastAction = React.useCallback(
    (actionType: "resign" | "draw_offer" | "draw_accept") => {
      if (!userId) return;
      const payload = { type: actionType, sender: userId };
      if (!channelRef.current || !channelReadyRef.current) {
        queuedBroadcastsRef.current.push({ event: "game_action", payload });
        return;
      }
      void channelRef.current.send({
        type: "broadcast",
        event: "game_action",
        payload,
      });
    },
    [userId]
  );

  const broadcastResign = React.useCallback(() => broadcastAction("resign"), [broadcastAction]);
  const broadcastDrawOffer = React.useCallback(() => broadcastAction("draw_offer"), [broadcastAction]);
  const broadcastDrawAccept = React.useCallback(() => broadcastAction("draw_accept"), [broadcastAction]);
  const clearAction = React.useCallback(() => setIncomingAction(null), []);

  return {
    opponentOnline,
    opponentDisconnectedSecs: disconnectedSecs,
    incomingMoves,
    clearMoves,
    gameStatus,
    gameResult,
    broadcastClock,
    remoteClock,
    broadcastMove,
    broadcastResign,
    broadcastDrawOffer,
    broadcastDrawAccept,
    incomingAction,
    clearAction,
  };
}
