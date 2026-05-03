import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type Result = "1-0" | "0-1" | "1/2-1/2";

type Profile = {
  id: string;
  elo_rating: number;
  coin_balance: number;
  city_id: number | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function kFactor(rating: number): number {
  if (rating < 2100) return 32;
  if (rating < 2400) return 24;
  return 16;
}

function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

function score(result: Result) {
  if (result === "1-0") return { white: 1, black: 0 };
  if (result === "0-1") return { white: 0, black: 1 };
  return { white: 0.5, black: 0.5 };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  const gameId = body.gameId as string | undefined;
  if (!gameId) {
    return Response.json({ ok: false, error: "Missing gameId" }, { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, white_id, black_id, mode, status, result, wager_amount, time_control, elo_white_after, elo_black_after")
    .eq("id", gameId)
    .single();

  if (gameError || !game) {
    return Response.json({ ok: false, error: gameError?.message ?? "Game not found" }, { status: 404, headers: corsHeaders });
  }

  if (!["checkmate", "timeout", "resigned", "draw", "stalemate"].includes(game.status)) {
    return Response.json({ ok: false, error: "Game is not finished" }, { status: 400, headers: corsHeaders });
  }

  if (!game.white_id || !game.black_id || !game.result) {
    return Response.json({ ok: false, error: "Game missing players or result" }, { status: 400, headers: corsHeaders });
  }

  if (game.elo_white_after !== null || game.elo_black_after !== null) {
    return Response.json({ ok: true, skipped: true, reason: "Elo already applied" }, { headers: corsHeaders });
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, elo_rating, coin_balance, city_id")
    .in("id", [game.white_id, game.black_id]);

  if (profilesError || !profiles || profiles.length !== 2) {
    return Response.json({ ok: false, error: profilesError?.message ?? "Profiles not found" }, { status: 404, headers: corsHeaders });
  }

  const white = profiles.find((p: Profile) => p.id === game.white_id) as Profile;
  const black = profiles.find((p: Profile) => p.id === game.black_id) as Profile;
  const result = game.result as Result;
  const s = score(result);
  const whiteExpected = expectedScore(white.elo_rating, black.elo_rating);
  const blackExpected = expectedScore(black.elo_rating, white.elo_rating);
  const whiteAfter = Math.round(white.elo_rating + kFactor(white.elo_rating) * (s.white - whiteExpected));
  const blackAfter = Math.round(black.elo_rating + kFactor(black.elo_rating) * (s.black - blackExpected));
  const wager = Number(game.wager_amount ?? 0);
  const whiteDelta = whiteAfter - white.elo_rating;
  const blackDelta = blackAfter - black.elo_rating;

  let whiteCoins = white.coin_balance;
  let blackCoins = black.coin_balance;
  if (wager > 0) {
    if (result === "1-0") {
      whiteCoins += wager;
      blackCoins = Math.max(0, blackCoins - wager);
    } else if (result === "0-1") {
      blackCoins += wager;
      whiteCoins = Math.max(0, whiteCoins - wager);
    }
  }

  await supabase
    .from("games")
    .update({
      elo_white_before: white.elo_rating,
      elo_black_before: black.elo_rating,
      elo_white_after: whiteAfter,
      elo_black_after: blackAfter
    })
    .eq("id", gameId);

  await Promise.all([
    supabase.from("profiles").update({ elo_rating: whiteAfter, coin_balance: whiteCoins }).eq("id", white.id),
    supabase.from("profiles").update({ elo_rating: blackAfter, coin_balance: blackCoins }).eq("id", black.id)
  ]);

  if (game.mode === "ranked") {
    const events = [
      white.city_id ? {
        city_id: white.city_id,
        user_id: white.id,
        game_id: gameId,
        points: Math.max(0, whiteAfter - white.elo_rating)
      } : null,
      black.city_id ? {
        city_id: black.city_id,
        user_id: black.id,
        game_id: gameId,
        points: Math.max(0, blackAfter - black.elo_rating)
      } : null
    ].filter(Boolean);

    if (events.length > 0) {
      await supabase.from("city_score_events").upsert(events, { onConflict: "game_id,user_id" });
      await supabase.rpc("refresh_city_leaderboard");
    }
  }

  const retentionEvents = [
    supabase.rpc("process_retention_event", {
      p_user_id: white.id,
      p_event: {
        kind: "game_played",
        game_id: gameId,
        mode: game.mode,
        status: game.status,
        result,
        color: "white",
        won: result === "1-0",
        wager_amount: wager,
        elo_delta: whiteDelta,
        time_control: game.time_control,
        time_control_family: String(game.time_control ?? "").includes("10") || String(game.time_control ?? "").toLowerCase().includes("rapid")
          ? "rapid"
          : "blitz"
      }
    }),
    supabase.rpc("process_retention_event", {
      p_user_id: black.id,
      p_event: {
        kind: "game_played",
        game_id: gameId,
        mode: game.mode,
        status: game.status,
        result,
        color: "black",
        won: result === "0-1",
        wager_amount: wager,
        elo_delta: blackDelta,
        time_control: game.time_control,
        time_control_family: String(game.time_control ?? "").includes("10") || String(game.time_control ?? "").toLowerCase().includes("rapid")
          ? "rapid"
          : "blitz"
      }
    })
  ];

  await Promise.all(retentionEvents);

  return Response.json({
    ok: true,
    white: { before: white.elo_rating, after: whiteAfter },
    black: { before: black.elo_rating, after: blackAfter }
  }, { headers: corsHeaders });
});
