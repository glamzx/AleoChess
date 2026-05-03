"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { CoinIcon } from "./CoinBalance";
import { cn } from "@/lib/cn";
import { fallbackRetentionSummary, fetchRetentionSummary, type DailyQuest } from "@/lib/retention";

export function DailyQuestRow({
  name,
  description,
  progress,
  total,
  reward,
  xp,
  done
}: {
  name: string;
  description?: string;
  progress: number;
  total: number;
  reward: number;
  xp?: number;
  done?: boolean;
}) {
  const pct = Math.min(100, (progress / total) * 100);
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-card bg-white p-3 shadow-card",
        done && "opacity-70"
      )}
    >
      <div
        className={cn(
          "grid h-10 w-10 flex-shrink-0 place-items-center rounded-full",
          done ? "bg-winGreen text-white" : "bg-pale text-cobalt"
        )}
      >
        {done ? <Check className="h-5 w-5" /> : <CoinIcon size={22} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-extrabold text-navy">{name}</span>
          <span className="tabnum ml-2 text-xs font-extrabold text-muted">
            {progress}/{total}
          </span>
        </div>
        {description && (
          <p className="mt-0.5 truncate text-[11px] font-bold text-muted">{description}</p>
        )}
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-pale">
          <div
            className={cn("h-full rounded-full", done ? "bg-winGreen" : "bg-sky")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="inline-flex items-center gap-1 rounded-chip bg-coin/30 px-2 py-1 text-xs font-extrabold text-navy">
        +{reward}
        {xp ? <span className="text-[10px] text-cobalt">/{xp} XP</span> : null}
      </span>
    </div>
  );
}

export function DailyQuestList({ quests }: { quests?: DailyQuest[] }) {
  const t = useTranslations("quests");
  const [liveQuests, setLiveQuests] = React.useState<DailyQuest[] | null>(quests ?? null);

  React.useEffect(() => {
    if (quests) {
      setLiveQuests(quests);
      return;
    }
    let cancelled = false;
    void fetchRetentionSummary().then((summary) => {
      if (!cancelled) setLiveQuests(summary?.daily_quests ?? fallbackRetentionSummary().daily_quests);
    });
    return () => {
      cancelled = true;
    };
  }, [quests]);

  const rows = liveQuests ?? fallbackRetentionSummary().daily_quests;

  return (
    <section className="space-y-2">
      <header className="flex items-center justify-between">
        <h3 className="text-base font-extrabold text-navy">{t("title")}</h3>
        <span className="text-xs font-extrabold text-muted">{t("reset")}</span>
      </header>
      {rows.map((q) => (
        <DailyQuestRow
          key={q.id}
          name={q.name}
          description={q.description}
          progress={q.progress}
          total={q.target}
          reward={q.reward_coins}
          xp={q.reward_xp}
          done={Boolean(q.completed_at)}
        />
      ))}
    </section>
  );
}
