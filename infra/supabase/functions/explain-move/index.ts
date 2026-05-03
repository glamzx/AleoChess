import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type Locale = "en" | "ru" | "kk";

type ExplainPayload = {
  fen_before: string;
  played_uci: string;
  played_san?: string;
  best_uci?: string | null;
  best_san?: string | null;
  classification: string;
  eval_delta_cp: number;
  locale?: Locale;
};

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

async function geminiText(prompt: string, apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.45,
          maxOutputTokens: 90,
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty explanation");
  return String(text).trim();
}

function localeName(locale: Locale) {
  if (locale === "ru") return "Russian";
  if (locale === "kk") return "Kazakh";
  return "English";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const payload = (await req.json()) as ExplainPayload;
    const locale = payload.locale ?? "en";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase env is not configured" }, 500);
    if (!apiKey) return json({ error: "GEMINI_API_KEY is not configured" }, 500);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: authData } = jwt
      ? await supabase.auth.getUser(jwt)
      : { data: { user: null } };

    if (!authData.user?.id) {
      return json({ error: "Must be signed in to use AI Coach" }, 401);
    }

    const { data: gate, error: gateError } = await supabase.rpc("consume_coach_explanation", {
      p_user_id: authData.user.id,
    });

    if (gateError) return json({ error: gateError.message }, 500);
    if (gate && gate.ok === false) {
      return json({
        error: gate.error ?? "Daily free AI Coach limit reached",
        code: "PRO_REQUIRED",
        remaining: gate.remaining ?? 0,
      }, 402);
    }

    const cacheKey = {
      fen_before: payload.fen_before,
      played_uci: payload.played_uci,
      classification: payload.classification,
    };

    const { data: cached } = await supabase
      .from("coach_explanations")
      .select("explanation")
      .match({ ...cacheKey, locale })
      .maybeSingle();

    if (cached?.explanation) {
      return json({ explanation: cached.explanation, cached: true, locale });
    }

    const { data: englishCached } = await supabase
      .from("coach_explanations")
      .select("explanation")
      .match({ ...cacheKey, locale: "en" })
      .maybeSingle();

    let english = englishCached?.explanation as string | undefined;

    if (!english) {
      const played = payload.played_san || payload.played_uci;
      const best = payload.best_san || payload.best_uci || "the engine's best move";
      const prompt = `System: You are Aleo, a friendly chess coach mascot — a small minimalistic blue cartoon horse. You speak warmly, motivationally, and never condescendingly. You write at most 2 short sentences. Use chess notation (Nf3, exd5, O-O) untranslated. Address the player as "you".\n\nUser: Position FEN: ${payload.fen_before}. The player played ${played}, classified as ${payload.classification} (eval changed by ${payload.eval_delta_cp} centipawns). The best move was ${best}. Explain in 2 short sentences why the played move was a ${payload.classification} and why the best move was better.`;
      english = await geminiText(prompt, apiKey);
      await supabase.from("coach_explanations").upsert({
        ...cacheKey,
        locale: "en",
        explanation: english,
      });
    }

    if (locale === "en") return json({ explanation: english, cached: false, locale });

    const translated = await geminiText(
      `Translate this chess coaching note to ${localeName(locale)}, preserving the friendly tone. Keep chess notation untranslated. Source: ${english}`,
      apiKey
    );

    await supabase.from("coach_explanations").upsert({
      ...cacheKey,
      locale,
      explanation: translated,
    });

    return json({ explanation: translated, cached: false, locale });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
