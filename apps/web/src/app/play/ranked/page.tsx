"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Coins, Loader2, Trophy, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { AleoMascot } from "@/components/AleoMascot";
import { ChunkyButton } from "@/components/ChunkyButton";
import { RankBadge } from "@/components/RankBadge";
import { useAuth } from "@/lib/auth/store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { bootstrapProfile } from "@/lib/auth/actions";
import { cn } from "@/lib/cn";

const TIME_CONTROLS = ["1+0", "3+0", "5+0", "10+0"] as const;
const WAGERS = [0, 50, 100, 200] as const;

type WagerAllowance = {
  coin_balance: number;
  total_staked_today: number;
  remaining_daily_wager: number;
  wagers_enabled: boolean;
};

function RankedPageContent() {
  const t = useTranslations("ranked");
  const format = useFormatter();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const status = useAuth((s) => s.status);
  const [timeControl, setTimeControl] = React.useState<(typeof TIME_CONTROLS)[number]>("5+0");
  const [wager, setWager] = React.useState<(typeof WAGERS)[number]>(0);
  const [queued, setQueued] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [allowance, setAllowance] = React.useState<WagerAllowance | null>(null);

  React.useEffect(() => {
    const requested = searchParams.get("tc");
    if (TIME_CONTROLS.includes(requested as (typeof TIME_CONTROLS)[number])) {
      setTimeControl(requested as (typeof TIME_CONTROLS)[number]);
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (status === "unauthenticated") {
      void getSupabaseBrowserClient().auth.signInAnonymously();
    }
  }, [status]);

  React.useEffect(() => {
    if (!queued) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [queued]);

  React.useEffect(() => {
    if (!user?.id) return;
    const supabase = getSupabaseBrowserClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase.rpc as any)("get_wager_allowance").then(({ data }: { data: WagerAllowance | null }) => setAllowance(data));
  }, [user?.id]);

  React.useEffect(() => {
    if (!user?.id) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`user:${user.id}`);
    channel.on("broadcast", { event: "matched" }, (payload) => {
      const msg = payload.payload as { gameId?: string };
      if (msg.gameId) router.push(`/g/${msg.gameId}`);
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, user?.id]);

  async function queue() {
    if (!user?.id) return;
    setError(null);
    setSeconds(0);

    const boot = await bootstrapProfile();
    if (!boot.ok) {
      setError(boot.error);
      return;
    }

    const coins = allowance?.coin_balance ?? profile?.coin_balance ?? 0;
    if (wager > 0 && allowance?.wagers_enabled === false) {
      setError("Wagers unlock 24 hours after signup.");
      return;
    }
    if (wager > coins) {
      setError("Not enough coins for this wager.");
      return;
    }
    if (wager > (allowance?.remaining_daily_wager ?? 1000)) {
      setError(t("dailyWagerCap"));
      return;
    }

    const supabase = getSupabaseBrowserClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.rpc as any)("queue_ranked_match", {
      p_time_control: timeControl,
      p_wager_amount: wager,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setQueued(true);
    void supabase.functions.invoke("matchmake");
  }

  async function cancel() {
    if (!user?.id) return;
    const supabase = getSupabaseBrowserClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("matchmaking_queue") as any).delete().eq("user_id", user.id);
    setQueued(false);
    setSeconds(0);
  }

  const elo = profile?.elo_rating ?? 1200;
  const balance = allowance?.coin_balance ?? profile?.coin_balance ?? 0;
  const remainingDailyWager = allowance?.remaining_daily_wager ?? 1000;
  const wagersEnabled = allowance?.wagers_enabled ?? true;

  return (
    <main className="relative flex min-h-[100dvh] flex-col bg-gradient-to-b from-pale via-white to-pale px-5 pb-10 pt-6">
      <header className="flex items-center gap-3">
        <Link href="/play" className="grid h-10 w-10 place-items-center rounded-full bg-white text-cobalt shadow-card">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-navy">{t("title")}</h1>
          <p className="text-sm font-bold text-muted">{t("subtitle")}</p>
        </div>
      </header>

      <section className="mx-auto mt-6 flex w-full max-w-md flex-col items-center rounded-hero bg-white p-5 text-center shadow-hero">
        {queued ? <Loader2 className="mb-3 h-8 w-8 animate-spin text-cobalt" /> : <AleoMascot mood="pointing" size={112} />}
        <RankBadge elo={elo} size={92} showLabel />
        <p className="mt-2 tabnum text-sm font-extrabold text-cobalt">{elo} Elo</p>
        {queued && <p className="mt-3 text-sm font-extrabold text-navy">{t("searching", { seconds })}</p>}
      </section>

      <section className="mx-auto mt-6 w-full max-w-md space-y-5">
        <div>
          <h2 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-cobalt">{t("timeControl")}</h2>
          <div className="grid grid-cols-4 gap-2">
            {TIME_CONTROLS.map((tc) => (
              <button
                key={tc}
                disabled={queued}
                onClick={() => setTimeControl(tc)}
                className={cn(
                  "rounded-card py-3 text-sm font-extrabold transition",
                  timeControl === tc ? "bg-sky text-white shadow-chunky" : "bg-white text-navy shadow-card"
                )}
              >
                {tc}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-cobalt">{t("optionalWager")}</h2>
            <span className="tabnum rounded-chip bg-white px-2 py-1 text-xs font-extrabold text-navy shadow-card">
              🪙 {format.number(balance)} · {t("left", { amount: format.number(remainingDailyWager) })}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {WAGERS.map((amount) => {
              const disabled = queued || amount > balance || amount > remainingDailyWager || (amount > 0 && !wagersEnabled);
              return (
                <button
                  key={amount}
                  disabled={disabled}
                  onClick={() => setWager(amount)}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-card py-3 text-sm font-extrabold transition disabled:opacity-40",
                    wager === amount ? "bg-proGold text-navy shadow-chunkyGold" : "bg-white text-navy shadow-card"
                  )}
                >
                  <Coins className="h-4 w-4" /> {amount}
                </button>
              );
            })}
          </div>
          {!wagersEnabled && (
            <p className="mt-2 rounded-card bg-pale px-3 py-2 text-xs font-bold text-muted">
              {t("wagersLocked")}
            </p>
          )}
          {balance < 50 && (
            <p className="mt-2 rounded-card bg-proGold/20 px-3 py-2 text-xs font-bold text-navy">
              {t("lowBalance")}
            </p>
          )}
        </div>

        {error && <div className="rounded-card border-2 border-lossRed/30 bg-lossRed/5 p-3 text-center text-sm font-bold text-lossRed">{error}</div>}

        {queued ? (
          <ChunkyButton block size="lg" pill variant="danger" iconLeft={<X className="h-5 w-5" />} onClick={cancel}>
            {t("cancel")}
          </ChunkyButton>
        ) : (
          <ChunkyButton block size="xl" pill variant="pro" iconLeft={<Trophy className="h-5 w-5" />} onClick={queue} disabled={!user?.id}>
            {t("find")}
          </ChunkyButton>
        )}
      </section>
    </main>
  );
}

export default function RankedPage() {
  return (
    <React.Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center bg-surfaceLight">
          <Loader2 className="h-8 w-8 animate-spin text-cobalt" />
        </main>
      }
    >
      <RankedPageContent />
    </React.Suspense>
  );
}
