"use client";

import * as React from "react";
import { Sparkles, Lock, BookOpen, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChunkyButton } from "@/components/ChunkyButton";
import { ProUpsellModal } from "@/components/ProUpsellModal";
import { courses } from "@/lib/mock";

export default function LearnPage() {
  const t = useTranslations("learn");
  const [upsell, setUpsell] = React.useState(false);

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot/learn.png" alt="Learning mascot" className="h-16 w-16 object-contain" />
        <h1 className="text-3xl font-extrabold text-navy">{t("title")}</h1>
      </div>

      <section>
        <h3 className="mb-2 text-base font-extrabold text-navy">{t("free")}</h3>
        <div className="space-y-3">
          {courses.free.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-3 rounded-card bg-white p-4 shadow-card"
            >
              <span className="grid h-12 w-12 place-items-center rounded-card bg-pale text-cobalt">
                <BookOpen className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <div className="font-extrabold text-navy">{c.name}</div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-pale">
                  <div
                    className="h-full rounded-full bg-winGreen"
                    style={{ width: `${c.progress * 100}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] font-bold text-muted">
                  {t("lessons", { done: Math.round(c.progress * c.lessons), total: c.lessons })}
                </div>
              </div>
              <ChunkyButton size="sm" iconLeft={<Play className="h-3 w-3" />}>
                {t("continue")}
              </ChunkyButton>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-navy">{t("pro")}</h3>
          <span className="inline-flex items-center gap-1 rounded-chip bg-sparkle/15 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-sparkle">
            <Sparkles className="h-3 w-3" /> Pro
          </span>
        </div>
        <div className="space-y-3">
          {courses.pro.map((c) => (
            <button
              key={c.name}
              onClick={() => setUpsell(true)}
              className="relative flex w-full items-center gap-3 overflow-hidden rounded-card border-2 border-sparkle/30 bg-gradient-to-br from-white to-[#F5EBFF] p-4 text-left shadow-card"
            >
              <span className="grid h-12 w-12 place-items-center rounded-card bg-sparkle/20 text-sparkle">
                <Lock className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-navy">{c.name}</span>
                  <span className="rounded-chip bg-proGold px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-navy">
                    {c.badge}
                  </span>
                </div>
                <div className="text-xs font-bold text-muted">
                  {t("lessonCount", { total: c.lessons })}
                </div>
              </div>
              <ChunkyButton size="sm" variant="pro" pill>
                {t("unlock")}
              </ChunkyButton>
              <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 animate-sparkle rounded-full bg-sparkle/20 blur-2xl" />
            </button>
          ))}
        </div>
      </section>

      <ProUpsellModal open={upsell} onOpenChange={setUpsell} />
    </div>
  );
}
