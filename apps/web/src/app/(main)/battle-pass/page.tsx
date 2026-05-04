"use client";

import * as React from "react";
import { Crown } from "lucide-react";
import { useTranslations } from "next-intl";
import { BattlePassTrack } from "@/components/BattlePassTrack";
import { fallbackRetentionSummary, fetchRetentionSummary, type RetentionSummary } from "@/lib/retention";

export default function BattlePassPage() {
  const t = useTranslations("battlePass");
  const [summary, setSummary] = React.useState<RetentionSummary>(fallbackRetentionSummary());

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
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-card bg-proGold text-navy shadow-chunkyGold">
          <Crown className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-3xl font-extrabold text-navy">{t("title")}</h1>
          <p className="text-sm font-bold text-cobalt/70">
            {t("subtitle")}
          </p>
        </div>
      </header>

      <BattlePassTrack summary={summary} />
    </div>
  );
}
