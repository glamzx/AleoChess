import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type QueueRow = {
  user_id: string;
  elo: number;
  time_control: string;
  queued_at: string;
  wager_amount: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function matchWindow(row: QueueRow, nowMs: number) {
  const waitedSeconds = Math.max(0, (nowMs - new Date(row.queued_at).getTime()) / 1000);
  return Math.min(400, 100 + Math.floor(waitedSeconds / 5) * 50);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { data: rows, error } = await supabase
    .from("matchmaking_queue")
    .select("*")
    .order("time_control", { ascending: true })
    .order("queued_at", { ascending: true });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
  }

  const queue = (rows ?? []) as QueueRow[];
  const matched = new Set<string>();
  const matches: string[] = [];
  const nowMs = Date.now();

  for (let i = 0; i < queue.length; i++) {
    const a = queue[i]!;
    if (matched.has(a.user_id)) continue;

    const window = matchWindow(a, nowMs);
    const b = queue.find((candidate, idx) => {
      if (idx <= i) return false;
      if (matched.has(candidate.user_id)) return false;
      if (candidate.time_control !== a.time_control) return false;
      if (candidate.wager_amount !== a.wager_amount) return false;
      return Math.abs(candidate.elo - a.elo) <= window;
    });

    if (!b) continue;

    const whiteFirst = crypto.getRandomValues(new Uint8Array(1))[0]! % 2 === 0;
    const white = whiteFirst ? a : b;
    const black = whiteFirst ? b : a;

    const { data: gameId, error: gameError } = await supabase.rpc("create_ranked_wager_game", {
      p_white_id: white.user_id,
      p_black_id: black.user_id,
      p_time_control: a.time_control,
      p_wager_amount: a.wager_amount,
      p_white_elo: white.elo,
      p_black_elo: black.elo
    });

    if (gameError || !gameId) continue;

    matched.add(a.user_id);
    matched.add(b.user_id);
    matches.push(gameId as string);

    await Promise.all([
      supabase.channel(`user:${a.user_id}`).send({
        type: "broadcast",
        event: "matched",
        payload: { gameId, color: white.user_id === a.user_id ? "w" : "b" }
      }),
      supabase.channel(`user:${b.user_id}`).send({
        type: "broadcast",
        event: "matched",
        payload: { gameId, color: white.user_id === b.user_id ? "w" : "b" }
      })
    ]);
  }

  return Response.json({ ok: true, matched: matches.length, gameIds: matches }, { headers: corsHeaders });
});
