"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Bot, Crown, Flame, Gift, Users2, Trophy, X, Zap } from "lucide-react";
import { ChunkyButton } from "@/components/ChunkyButton";
import { AleoMascot } from "@/components/AleoMascot";
import { DailyPuzzleCard } from "@/components/DailyPuzzleCard";
import { CityCard } from "@/components/CityCard";
import { DailyQuestList } from "@/components/DailyQuestList";
import { RankBadge } from "@/components/RankBadge";
import { BattlePassTrack } from "@/components/BattlePassTrack";
import { me } from "@/lib/mock";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth/store";
import { getCityRank, type CityLeaderboardEntry } from "@/lib/cities/leaderboard";
import { fallbackRetentionSummary, fetchRetentionSummary, type RetentionSummary } from "@/lib/retention";

const timeControls = [
  { label: "1+0", sub: "Bullet" },
  { label: "3+0", sub: "Blitz" },
  { label: "5+0", sub: "Blitz" },
  { label: "10+0", sub: "Rapid" },
  { label: "Daily", sub: "Daily" }
];

export default function PlayHome() {
  const t = useTranslations();
  const [tc, setTc] = React.useState("5+0");
  const [rewardAvailable, setRewardAvailable] = React.useState(false);
  const [tutorialStep, setTutorialStep] = React.useState(0);
  const profile = useAuth((s) => s.profile);
  const [myCity, setMyCity] = React.useState<CityLeaderboardEntry | null>(null);
  const [retention, setRetention] = React.useState<RetentionSummary>(fallbackRetentionSummary());
  const name = profile?.display_name ?? profile?.username ?? me.name;
  const elo = profile?.elo_rating ?? me.elo;
  const streak = profile?.streak_count ?? retention.profile.streak_count;

  React.useEffect(() => {
    setRewardAvailable(window.localStorage.getItem("aleo:dailyRewardAvailable") === "1");
    setTutorialStep(window.localStorage.getItem("aleo:tutorialPending") === "1" ? 1 : 0);
  }, []);

  React.useEffect(() => {
    if (!profile?.city_id) return;
    void getCityRank(profile.city_id).then(setMyCity).catch(() => setMyCity(null));
  }, [profile?.city_id]);

  React.useEffect(() => {
    let cancelled = false;
    void fetchRetentionSummary().then((summary) => {
      if (!cancelled && summary) setRetention(summary);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function claimDailyReward() {
    window.localStorage.removeItem("aleo:dailyRewardAvailable");
    window.localStorage.setItem("aleo:lastDailyReward", new Date().toISOString());
    setRewardAvailable(false);
  }

  function closeTutorial() {
    window.localStorage.removeItem("aleo:tutorialPending");
    setTutorialStep(0);
  }

  return (
    <div className="space-y-5 pt-2">
      {/* greeting */}
      <header className="hidden items-center gap-3 lg:flex">
        <RankBadge tier={me.rank} size={56} />
        <div>
          <h1 className="text-2xl font-extrabold text-navy">
            {t("home.greeting", { name })}
          </h1>
          <p className="text-sm font-bold text-muted">
            {elo} Elo · {myCity?.name ?? me.city}
          </p>
        </div>
      </header>

      {/* hero */}
      <section data-tour="play" className="relative overflow-hidden rounded-hero bg-gradient-to-br from-sky to-cobalt p-5 text-white shadow-hero">
        <span className="pointer-events-none absolute -bottom-6 -right-6 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="flex items-start gap-3">
          <motion.div
            initial={{ scale: 0.85, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 14 }}
          >
            <AleoMascot mood="cheer" size={120} bobbing />
          </motion.div>
          <div className="flex-1 pt-2">
            <span className="rounded-chip bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest">
              {t("home.quickPlay")}
            </span>
            <h2 className="mt-2 text-2xl font-extrabold leading-tight">
              {t("home.ready", { name })}
            </h2>
            <p className="text-xs font-bold text-white/85">
              {t("home.winsToRank")}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {timeControls.map((t) => {
            const active = tc === t.label;
            return (
              <button
                key={t.label}
                onClick={() => setTc(t.label)}
                className={cn(
                  "flex flex-shrink-0 flex-col items-center gap-0.5 rounded-chip px-3 py-2 text-xs font-extrabold transition",
                  active
                    ? "bg-white text-navy shadow-card"
                    : "bg-white/15 text-white hover:bg-white/25"
                )}
              >
                <span className="text-base font-extrabold">{t.label}</span>
                <span className="text-[10px] uppercase tracking-widest opacity-80">
                  {t.sub}
                </span>
              </button>
            );
          })}
        </div>

        <Link
          href={`/play/ranked?tc=${encodeURIComponent(tc)}`}
          className="mt-4 block"
        >
          <ChunkyButton
            block
            size="xl"
            pill
            variant="pro"
            iconLeft={<Zap className="h-5 w-5" />}
            className="!bg-white !text-cobalt !shadow-[0_4px_0_0_#B4DCFA] active:!shadow-[0_2px_0_0_#B4DCFA]"
          >
            {t("home.playNow")} · {tc}
          </ChunkyButton>
        </Link>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold">
          <Flame className="h-4 w-4" />
          {t("home.streak", { count: streak })}
        </div>
      </section>

      {rewardAvailable && (
        <section className="rounded-hero border-2 border-proGold/40 bg-gradient-to-br from-[#FFF7C7] to-white p-4 shadow-card">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-proGold text-navy shadow-chunkyGold">
              <Gift className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <h3 className="text-base font-extrabold text-navy">{t("home.dailyRewardReady")}</h3>
              <p className="text-xs font-bold text-muted">
                {t("home.dailyRewardBody")}
              </p>
            </div>
            <ChunkyButton size="sm" pill variant="pro" onClick={claimDailyReward}>
              {t("home.claimCoins")}
            </ChunkyButton>
          </div>
        </section>
      )}

      {!profile?.pro_until && (
        <Link
          href="/store"
          className="flex items-center gap-3 rounded-card bg-white p-4 shadow-card transition active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-proGold text-navy shadow-chunkyGold">
            <Crown className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h3 className="text-sm font-extrabold text-navy">{t("home.upgradeTitle")}</h3>
            <p className="text-xs font-bold text-muted">{t("home.upgradeBody")}</p>
          </div>
          <span className="rounded-chip bg-pale px-2 py-1 text-[10px] font-extrabold uppercase text-cobalt">
            {t("home.soon")}
          </span>
        </Link>
      )}

      {/* secondary cards */}
      <section data-tour="modes" className="grid grid-cols-3 gap-3">
        {[
          { icon: Users2, label: t("home.secondary.friend"), color: "#A86BFF", href: "/play/friend" },
          { icon: Bot, label: t("home.secondary.bot"), color: "#58CC02", href: "/play/bot" },
          { icon: Trophy, label: t("home.secondary.tournaments"), color: "#FFC800", href: "/play" }
        ].map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              href={c.href}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-card bg-white p-3 text-center shadow-card transition active:scale-95"
            >
              <span
                className="grid h-12 w-12 place-items-center rounded-full text-white shadow"
                style={{ background: c.color }}
              >
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-xs font-extrabold leading-tight text-navy">
                {c.label}
              </span>
            </Link>
          );
        })}
      </section>

      {/* daily puzzle preview */}
      <DailyPuzzleCard />

      {/* city widget */}
      {myCity && (
        <section>
          <CityCard
            city={myCity.name}
            country={myCity.country_code}
            rank={myCity.rank}
            trend={myCity.trend}
            highlight
          />
          <p className="mt-2 px-1 text-sm font-bold text-cobalt">
            {t("home.cityWidget", { city: myCity.name, rank: myCity.rank })}
          </p>
        </section>
      )}

      <div data-tour="quests">
        <DailyQuestList quests={retention.daily_quests} />
      </div>

      <section>
        <Link href="/battle-pass" className="mb-2 inline-block text-xs font-extrabold uppercase tracking-widest text-cobalt">
          {t("home.battlePassOpen")}
        </Link>
        <BattlePassTrack summary={retention} compact />
      </section>

      {tutorialStep > 0 && (
        <div className="fixed inset-0 z-50 flex items-end bg-navy/70 p-4 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-hero bg-white p-5 shadow-hero">
            <div className="flex items-start justify-between gap-3">
              <AleoMascot mood="pointing" size={84} bobbing={false} />
              <button onClick={closeTutorial} className="grid h-9 w-9 place-items-center rounded-full bg-pale text-cobalt">
                <X className="h-4 w-4" />
              </button>
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-navy">{t("home.tutorialTitle")}</h2>
            <div className="mt-3 space-y-2 text-sm font-bold text-muted">
              <p>{t("home.tutorialPlay")}</p>
              <p>{t("home.tutorialModes")}</p>
              <p>{t("home.tutorialQuests")}</p>
            </div>
            <ChunkyButton block size="lg" pill className="mt-5" onClick={closeTutorial}>{t("home.gotIt")}</ChunkyButton>
          </div>
        </div>
      )}
    </div>
  );
}
