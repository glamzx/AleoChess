"use client";

import * as React from "react";
import { Lock, Star, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { ChunkyButton } from "./ChunkyButton";
import { LootCapsule } from "./LootCapsule";
import {
  battlePassLevel,
  claimBattlePassTier,
  fallbackRetentionSummary,
  fetchRetentionSummary,
  rewardLabel,
  type BattlePassTier,
  type RetentionSummary
} from "@/lib/retention";

export function BattlePassTrack({
  summary,
  compact = false
}: {
  summary?: RetentionSummary;
  compact?: boolean;
}) {
  const t = useTranslations("battlePass");
  const [data, setData] = React.useState<RetentionSummary>(summary ?? fallbackRetentionSummary());
  const [opening, setOpening] = React.useState<string | null>(null);
  const pass = data.battlepass.user;
  const { tier: currentTier, xpIntoTier } = battlePassLevel(pass.xp);
  const tiers = data.battlepass.tiers.slice(0, compact ? 14 : 50);

  React.useEffect(() => {
    if (summary) {
      setData(summary);
      return;
    }
    let cancelled = false;
    void fetchRetentionSummary().then((next) => {
      if (!cancelled && next) setData(next);
    });
    return () => {
      cancelled = true;
    };
  }, [summary]);

  async function claim(tier: number, track: "free" | "premium") {
    setOpening(`${track}-${tier}`);
    await claimBattlePassTier(tier, track);
    const next = await fetchRetentionSummary();
    if (next) setData(next);
  }

  function tierCell(tierItem: BattlePassTier, track: "free" | "premium") {
    const premium = track === "premium";
    const reward = premium ? tierItem.premium_reward : tierItem.free_reward;
    const claimed = premium ? tierItem.premium_claimed : tierItem.free_claimed;
    const unlocked = pass.xp >= tierItem.xp_required;
    const lockedPremium = premium && !pass.premium;
    const canClaim = unlocked && !claimed && !lockedPremium;
    const key = `${track}-${tierItem.tier}`;
    const label = reward?.type === "coins" && typeof reward.amount === "number"
      ? t("coins", { amount: reward.amount })
      : rewardLabel(reward);

    return (
      <div
        className={cn(
          "relative flex h-32 w-full flex-col items-center justify-center gap-1 rounded-card border-2 p-2 text-center",
          premium
            ? unlocked ? "border-proGold bg-[#FFF2A8]" : "border-proGold/40 bg-white"
            : unlocked ? "border-cobalt/20 bg-pale" : "border-cobalt/10 bg-white opacity-75"
        )}
      >
        {(lockedPremium || !unlocked) && (
          <Lock className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-cobalt/70" />
        )}
        {opening === key ? (
          <LootCapsule size={62} reward={label} rarity={premium ? "Epic" : "Rare"} />
        ) : (
          <>
            {premium ? <Sparkles className="h-5 w-5 text-proGoldDark" /> : <Star className="h-5 w-5 text-cobalt" />}
            <div className="min-h-8 text-[11px] font-extrabold leading-tight text-navy">
              {label}
            </div>
            <div className={cn("text-[9px] font-extrabold uppercase", premium ? "text-proGoldDark" : "text-cobalt/70")}>
              {premium ? t("premium") : t("free")}
            </div>
            {claimed ? (
              <span className="rounded-chip bg-winGreen/15 px-2 py-0.5 text-[10px] font-extrabold text-winGreen">
                {t("claimed")}
              </span>
            ) : (
              <ChunkyButton
                size="sm"
                pill
                variant={premium ? "pro" : "primary"}
                disabled={!canClaim}
                onClick={() => claim(tierItem.tier, track)}
                className="mt-1 !h-8 !px-3 !text-[10px]"
              >
                {t("claim")}
              </ChunkyButton>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <header className="flex items-end justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-navy">
            {t("heading", { season: data.battlepass.season.name })}
          </h3>
          <p className="text-sm font-bold text-cobalt/70">
            {t("tierProgress", { tier: currentTier, xp: xpIntoTier })}
          </p>
        </div>
        <span className="rounded-full bg-proGold px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-navy shadow-chunkyGold">
          {pass.premium ? t("premium") : t("free")}
        </span>
      </header>

      <div className="h-3 w-full overflow-hidden rounded-full bg-pale">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky to-proGold"
          style={{ width: `${Math.min(100, (xpIntoTier / 1000) * 100)}%` }}
        />
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <div className="flex min-w-max gap-3 pb-2">
          {tiers.map((tierItem) => (
              <div key={tierItem.tier} className="flex w-[118px] flex-shrink-0 flex-col items-center gap-2">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-cobalt/70">
                  {t("tierLabel", { tier: tierItem.tier })}
                </div>
                {tierCell(tierItem, "free")}
                {tierCell(tierItem, "premium")}
              </div>
          ))}
        </div>
      </div>
    </div>
  );
}
