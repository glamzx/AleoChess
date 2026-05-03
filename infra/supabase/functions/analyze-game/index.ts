import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase env is not configured" }, 500);

  const body = await req.json().catch(() => ({}));
  const jobId = body?.record?.id ?? body?.id;
  const gameId = body?.record?.game_id ?? body?.game_id;
  if (!jobId && !gameId) return json({ error: "Missing analysis job id or game_id" }, 400);

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const query = supabase
    .from("analysis_jobs")
    .update({ status: "running" })
    .eq("status", "pending");

  if (jobId) query.eq("id", jobId);
  else query.eq("game_id", gameId);

  const { data, error } = await query.select("id, game_id").maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ ok: true, skipped: true });

  return json({
    ok: true,
    job: data,
    note: "Queued for client-side Stockfish analysis on the review page.",
  });
});
