"use client";

/**
 * /play/friend — Friend Match lobby.
 *
 * The player picks time control + side → creates a game room → gets a
 * shareable URL they can send to a friend. When the friend opens the
 * URL they auto-join and both are redirected to the live game.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Zap,
  Copy,
  Check,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { ChunkyButton } from "@/components/ChunkyButton";
import { AleoMascot } from "@/components/AleoMascot";
import { createGameRoom } from "@/lib/multiplayer/realtime";
import { useAuth } from "@/lib/auth/store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

// ---- Config ----
const TIME_CONTROLS = [
  { label: "1+0", sub: "Bullet", initialMs: 60_000, incrementMs: 0 },
  { label: "3+0", sub: "Blitz", initialMs: 180_000, incrementMs: 0 },
  { label: "5+3", sub: "Blitz", initialMs: 300_000, incrementMs: 3_000 },
  { label: "10+0", sub: "Rapid", initialMs: 600_000, incrementMs: 0 },
];

const SIDES = [
  { value: "white" as const, label: "White", icon: "♔" },
  { value: "random" as const, label: "Random", icon: "🎲" },
  { value: "black" as const, label: "Black", icon: "♚" },
];

export default function FriendLobbyPage() {
  const router = useRouter();
  const _userId = useAuth((s) => s.user?.id ?? null);
  const authStatus = useAuth((s) => s.status);

  const [tc, setTc] = React.useState(TIME_CONTROLS[2]!);
  const [side, setSide] = React.useState<"white" | "random" | "black">("random");
  const [creating, setCreating] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState<string | null>(null);
  const [gameId, setGameId] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [friendJoined, setFriendJoined] = React.useState(false);

  // Auto sign-in anonymously if not authenticated
  React.useEffect(() => {
    if (authStatus === "unauthenticated") {
      const supabase = getSupabaseBrowserClient();
      void supabase.auth.signInAnonymously();
    }
  }, [authStatus]);

  React.useEffect(() => {
    if (!gameId || !shareUrl) return;

    const supabase = getSupabaseBrowserClient();
    let redirected = false;

    function goToBoardSoon() {
      if (redirected) return;
      redirected = true;
      setFriendJoined(true);
      setTimeout(() => router.push(`/g/${gameId}`), 450);
    }

    async function checkGame() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("games") as any)
        .select("status, white_id, black_id")
        .eq("id", gameId)
        .maybeSingle();

      if (data?.status === "active" || (data?.white_id && data?.black_id)) {
        goToBoardSoon();
      }
    }

    const channel = supabase
      .channel(`game:${gameId}`)
      .on("broadcast", { event: "player_joined" }, goToBoardSoon)
      .on(
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
            goToBoardSoon();
          }
        }
      )
      .subscribe();

    void checkGame();
    const interval = window.setInterval(checkGame, 750);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [gameId, router, shareUrl]);

  // Ensure we have a userId — sign in anonymously if needed
  async function ensureAuth(): Promise<string> {
    const currentUserId = useAuth.getState().user?.id;
    if (currentUserId) return currentUserId;

    // If not authenticated yet, force anonymous sign-in via browser client
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInAnonymously();

    // Wait for the auth store to hydrate via onAuthStateChange
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const check = setInterval(() => {
        const uid = useAuth.getState().user?.id;
        if (uid) {
          clearInterval(check);
          resolve(uid);
        }
        if (++attempts > 30) {
          clearInterval(check);
          reject(new Error("Auth timeout"));
        }
      }, 200);
    });
  }

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    setError(null);

    try {
      // Ensure we're authenticated before creating
      await ensureAuth();

      const result = await createGameRoom(
        { initialMs: tc.initialMs, incrementMs: tc.incrementMs },
        tc.label,
        side
      );

      const url = `${window.location.origin}/g/${result.gameId}`;
      setShareUrl(url);
      setGameId(result.gameId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      console.error("Failed to create game:", err);
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleGoToGame() {
    if (gameId) {
      router.push(`/g/${gameId}`);
    }
  }

  const telegramUrl = shareUrl
    ? `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Let's play chess! ♟️")}`
    : null;
  const whatsappUrl = shareUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Let's play chess! ♟️ ${shareUrl}`)}`
    : null;

  return (
    <main className="relative flex min-h-[100dvh] flex-col bg-gradient-to-b from-pale via-white to-pale px-5 pb-10 pt-6">
      <div className="absolute inset-x-0 top-0 -z-0 h-48 bg-gradient-to-b from-sky/20 to-transparent" />

      <Link
        href="/play"
        className="z-10 flex w-fit items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-cobalt shadow-card"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 mx-auto mt-4 w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <AleoMascot mood="cheer" size={80} bobbing />
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Play a Friend</h1>
            <p className="text-sm font-bold text-muted">
              Create a match and share the link
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!shareUrl ? (
            <motion.div
              key="config"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 space-y-6"
            >
              {/* Time control */}
              <div>
                <h2 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-cobalt">
                  Time Control
                </h2>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_CONTROLS.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => setTc(t)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-card border-2 py-3 text-center transition",
                        tc.label === t.label
                          ? "border-sky bg-sky/10 text-sky shadow-card"
                          : "border-pale bg-white text-navy hover:border-sky/50"
                      )}
                    >
                      <span className="text-lg font-extrabold">{t.label}</span>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                        {t.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Side */}
              <div>
                <h2 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-cobalt">
                  Pick Your Side
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {SIDES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSide(s.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-card border-2 py-3 text-center transition",
                        side === s.value
                          ? "border-navy bg-navy text-white shadow-card"
                          : "border-pale bg-white text-navy hover:border-navy/50"
                      )}
                    >
                      <span className="text-2xl">{s.icon}</span>
                      <span className="text-xs font-extrabold">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Create button */}
              <ChunkyButton
                block
                size="xl"
                pill
                iconLeft={creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? "Creating..." : "Create Match"}
              </ChunkyButton>

              {error && (
                <div className="rounded-card border-2 border-lossRed/30 bg-lossRed/5 p-3 text-center text-sm font-bold text-lossRed">
                  {error}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="share"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-4"
            >
              {/* Share card */}
              <div className="overflow-hidden rounded-hero bg-gradient-to-br from-sky to-cobalt p-5 text-white shadow-hero">
                <h2 className="text-lg font-extrabold">Match created!</h2>
                <p className="mt-1 text-sm font-bold text-white/80">
                  Share this link with your friend to start playing
                </p>

                {/* URL display */}
                <div className="mt-4 flex items-center gap-2 rounded-card bg-white/15 px-3 py-2">
                  <span className="flex-1 truncate text-sm font-bold">
                    {shareUrl}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 rounded-chip bg-white/25 px-2 py-1 text-xs font-extrabold transition hover:bg-white/35"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                </div>

                {/* Share intents */}
                <div className="mt-3 flex gap-2">
                  {telegramUrl && (
                    <a
                      href={telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-chip bg-[#2AABEE] px-3 py-2 text-xs font-extrabold text-white transition hover:bg-[#229ED9]"
                    >
                      <ExternalLink className="h-3 w-3" /> Telegram
                    </a>
                  )}
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-chip bg-[#25D366] px-3 py-2 text-xs font-extrabold text-white transition hover:bg-[#1DA851]"
                    >
                      <ExternalLink className="h-3 w-3" /> WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {/* Waiting indicator */}
              <div className="flex flex-col items-center gap-3 rounded-hero bg-white p-5 shadow-card">
                <AleoMascot mood="thinking" size={100} bobbing />
                <div className="flex items-center gap-2 text-sm font-extrabold text-navy">
                  {friendJoined ? (
                    <Check className="h-4 w-4 text-winGreen" />
                  ) : (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-cobalt/30 border-t-cobalt" />
                  )}
                  {friendJoined ? "Friend joined — opening board…" : "Waiting for your friend to join…"}
                </div>
                <p className="text-center text-xs font-bold text-muted">
                  When they open the link, the game starts automatically
                </p>
              </div>

              {/* Go to game (manual) */}
              <ChunkyButton
                block
                size="lg"
                pill
                onClick={handleGoToGame}
                iconLeft={<ExternalLink className="h-4 w-4" />}
              >
                Go to Game Board
              </ChunkyButton>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
