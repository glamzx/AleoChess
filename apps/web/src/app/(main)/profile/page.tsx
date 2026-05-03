"use client";

import * as React from "react";
import Link from "next/link";
import { Settings as SettingsIcon, Award, Crown, Flame, Rocket, Sparkles, Target, Trophy } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { RankBadge } from "@/components/RankBadge";
import { CoinBalance } from "@/components/CoinBalance";
import { StreakFlame } from "@/components/StreakFlame";
import { LootCapsule } from "@/components/LootCapsule";
import { ChunkyButton } from "@/components/ChunkyButton";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { me, achievements, skins } from "@/lib/mock";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth/store";
import { battlePassLevel, fallbackRetentionSummary, fetchRetentionSummary, type RetentionSummary } from "@/lib/retention";

const iconFor: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  flame: Flame,
  target: Target,
  crown: Crown,
  rocket: Rocket,
  sparkle: Sparkles
};

const rarityRibbon: Record<string, { bg: string; fg: string }> = {
  Common: { bg: "#B7C2D6", fg: "#3B475A" },
  Rare: { bg: "#2AB2FF", fg: "#fff" },
  Epic: { bg: "#A86BFF", fg: "#fff" },
  Legendary: { bg: "#FFD23F", fg: "#5C3D00" }
};

export default function ProfilePage() {
  const t = useTranslations("profile");
  const format = useFormatter();
  const profile = useAuth((s) => s.profile);
  const [summary, setSummary] = React.useState<RetentionSummary>(fallbackRetentionSummary());
  const bp = battlePassLevel(summary.battlepass.user.xp);
  const name = profile?.display_name ?? profile?.username ?? me.name;
  const handle = profile?.username ? `@${profile.username}` : me.handle;
  const streak = profile?.streak_count ?? summary.profile.streak_count;
  const longest = profile?.longest_streak ?? summary.profile.longest_streak;
  const elo = profile?.elo_rating ?? me.elo;
  const coins = profile?.coin_balance ?? me.coins;

  React.useEffect(() => {
    let cancelled = false;
    void fetchRetentionSummary().then((next) => {
      if (!cancelled && next) setSummary(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5 pt-2">
      {/* hero card */}
      <section className="relative overflow-hidden rounded-hero bg-gradient-to-br from-pale to-white p-5 shadow-card">
        <div className="flex items-center gap-4">
          <RankBadge tier={me.rank} size={88} />
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-navy">{name}</h1>
            <p className="text-sm font-bold text-muted">{handle}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-chip bg-white px-2 py-0.5 text-xs font-extrabold text-cobalt shadow-card">
                {me.city}
              </span>
              <span className="rounded-chip bg-white px-2 py-0.5 tabnum text-xs font-extrabold text-cobalt shadow-card">
                {elo} Elo
              </span>
              <StreakFlame count={streak} />
            </div>
          </div>
          <Link
            href="/profile"
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-cobalt shadow-card"
            aria-label={t("settings")}
          >
            <SettingsIcon className="h-5 w-5" />
          </Link>
        </div>

        {/* xp progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-extrabold text-muted">
            <span>{t("level", { tier: bp.tier })}</span>
            <span className="tabnum">
              {t("xp", { xp: bp.xpIntoTier })}
            </span>
          </div>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-pale">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky to-cobalt"
              style={{ width: `${(bp.xpIntoTier / 1000) * 100}%` }}
            />
          </div>
        </div>
      </section>

      {/* stats grid */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t("games"), value: format.number(312) },
          { label: t("winRate"), value: "58%" },
          { label: t("currentStreak"), value: format.number(streak) },
          { label: t("bestStreak"), value: format.number(longest) },
          { label: t("seasonXp"), value: format.number(summary.battlepass.user.xp) },
          { label: t("coins"), value: format.number(coins) }
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-card bg-white p-4 text-center shadow-card"
          >
            <div className="tabnum text-2xl font-extrabold text-navy">{s.value}</div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
              {s.label}
            </div>
          </div>
        ))}
      </section>

      {/* inventory */}
      <section>
        <header className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-navy">{t("inventory")}</h3>
          <Link
            href="/store"
            className="text-xs font-extrabold uppercase tracking-widest text-cobalt"
          >
            {t("visitStore")} →
          </Link>
        </header>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {skins.map((s) => {
            const r = rarityRibbon[s.rarity] ?? { bg: "#B7C2D6", fg: "#3B475A" };
            return (
              <div
                key={s.name}
                className="relative flex w-36 flex-shrink-0 flex-col items-center gap-2 overflow-hidden rounded-card bg-white p-3 shadow-card"
              >
                <span
                  className="absolute right-0 top-2 -rotate-0 rounded-l-chip px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest"
                  style={{ background: r.bg, color: r.fg }}
                >
                  {s.rarity}
                </span>
                <div
                  className="grid h-20 w-20 place-items-center rounded-full"
                  style={{ background: `${r.bg}33` }}
                >
                  <span className="text-3xl">
                    {s.type === "board" ? "♟" : s.type === "pieces" ? "♞" : s.type === "background" ? "🌌" : "✨"}
                  </span>
                </div>
                <div className="text-center">
                  <div className="text-sm font-extrabold text-navy">{s.name}</div>
                  <div className="text-[10px] font-bold uppercase text-muted">
                    {s.type}
                  </div>
                </div>
                {"owned" in s && s.owned ? (
                  <span className="rounded-chip bg-winGreen/15 px-2 py-0.5 text-[10px] font-extrabold text-winGreen">
                    {t("equipped")}
                  </span>
                ) : (
                  <ChunkyButton size="sm" pill>
                    {t("equip")}
                  </ChunkyButton>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* achievements */}
      <section>
        <h3 className="mb-2 text-base font-extrabold text-navy">{t("achievements")}</h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {achievements.map((a) => {
            const Icon = iconFor[a.icon] ?? Award;
            return (
              <div
                key={a.name}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-card bg-white p-3 shadow-card",
                  !a.earned && "opacity-50 grayscale"
                )}
              >
                <span
                  className={cn(
                    "grid h-12 w-12 place-items-center rounded-full",
                    a.earned ? "bg-proGold text-navy" : "bg-pale text-muted"
                  )}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-center text-[10px] font-extrabold uppercase tracking-widest text-cobalt">
                  {a.name}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* loot capsules row (just for fun) */}
      <section>
        <h3 className="mb-2 text-base font-extrabold text-navy">{t("openToday")}</h3>
        <div className="flex flex-wrap items-end gap-4">
          <LootCapsule rarity="Rare" reward="Sticker pack" />
          <LootCapsule rarity="Epic" reward="Cosmic pieces" />
          <LootCapsule rarity="Legendary" reward="Royale skin" />
        </div>
      </section>

      <CoinBalance amount={coins} size="lg" />

      <section className="rounded-card bg-white p-4 shadow-card">
        <h3 className="text-base font-extrabold text-navy">{t("settings")}</h3>
        <p className="mt-1 text-xs font-bold text-muted">{t("languageHint")}</p>
        <div className="mt-3">
          <LocaleSwitcher />
        </div>
      </section>
    </div>
  );
}
