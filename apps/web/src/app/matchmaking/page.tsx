"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { AleoMascot } from "@/components/AleoMascot";
import { ChunkyButton } from "@/components/ChunkyButton";
import { RankBadge } from "@/components/RankBadge";
import { aleoTips, me } from "@/lib/mock";

export default function MatchmakingPage() {
  const t = useTranslations("matchmaking");
  const [tipIdx, setTipIdx] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => setTipIdx((i) => (i + 1) % aleoTips.length), 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-between bg-gradient-to-b from-pale via-white to-pale px-6 py-8 text-center">
      <header className="flex w-full items-center justify-between">
        <span className="text-xs font-extrabold uppercase tracking-widest text-cobalt">
          {t("searching")}
        </span>
        <Link
          href="/play"
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-cobalt shadow-card"
          aria-label={t("cancel")}
        >
          <X className="h-5 w-5" />
        </Link>
      </header>

      {/* spinning rank badge */}
      <div className="relative my-8 flex flex-col items-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 grid place-items-center"
        >
          <span className="h-44 w-44 rounded-full border-[6px] border-dashed border-sky/40" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="relative grid h-44 w-44 place-items-center rounded-full bg-white shadow-hero"
        >
          <RankBadge tier={me.rank} size={120} />
        </motion.div>
        <span className="mt-4 tabnum rounded-full bg-white px-3 py-1 text-xs font-extrabold text-cobalt shadow-card">
          {t("youElo", { elo: me.elo })}
        </span>
      </div>

      <p className="text-base font-extrabold text-navy">
        {t("finding", { range: 100 })}
      </p>

      <div className="mt-6 w-full max-w-sm rounded-card bg-white p-4 shadow-card">
        <div className="flex items-center gap-3">
          <AleoMascot mood="thinking" size={64} bobbing={false} />
          <div className="text-left">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-cobalt">
              {t("tipLabel")}
            </div>
            <motion.p
              key={tipIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-sm font-bold text-navy"
            >
              {aleoTips[tipIdx]}
            </motion.p>
          </div>
        </div>
      </div>

      <Link href="/game" className="mt-6 block w-full max-w-sm">
        <ChunkyButton block size="lg" pill variant="ghost">
          {t("skipDemo")}
        </ChunkyButton>
      </Link>
      <Link href="/play" className="mt-2 block w-full max-w-sm">
        <ChunkyButton block size="md" pill variant="muted">
          {t("cancel")}
        </ChunkyButton>
      </Link>
    </main>
  );
}
