"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Send, MessageCircle, Copy, X } from "lucide-react";
import { ChunkyButton } from "@/components/ChunkyButton";
import { CoinIcon } from "@/components/CoinBalance";

export default function ReviewPage() {
  const t = useTranslations("review");
  const won = true;
  const [showCoach, setShowCoach] = React.useState(true);

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center bg-gradient-to-b from-pale via-white to-pale px-5 pb-10 pt-6">
      <div className="absolute inset-x-0 top-0 -z-0 h-64 bg-gradient-to-b from-sky/30 to-transparent" />

      <Link
        href="/play"
        className="self-start rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-cobalt shadow-card"
      >
        ← {t("home")}
      </Link>

      {/* big banner */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 16 }}
        className={`relative mt-2 w-full max-w-md rounded-hero p-6 text-center text-white shadow-hero ${
          won
            ? "bg-gradient-to-br from-winGreen to-[#3F9101]"
            : "bg-gradient-to-br from-lossRed to-[#C73838]"
        }`}
      >
        <span className="pointer-events-none absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
        <h1 className="text-3xl font-extrabold leading-tight drop-shadow-sm">
          {won ? t("youWon") : t("youLost")}
        </h1>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <motion.span
            initial={{ scale: 0, rotate: -5 }}
            animate={{ scale: [0, 1.2, 1], rotate: [-5, 0] }}
            transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 14 }}
            className={`rounded-full bg-white px-3 py-1 text-sm font-extrabold shadow-chunky ${
              won ? "text-winGreen" : "text-lossRed"
            }`}
          >
            {won ? "+12 Elo" : "-8 Elo"}
          </motion.span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-extrabold">
            <CoinIcon size={16} /> +5 coins
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-extrabold">
            +12 pts to Almaty
          </span>
        </div>
      </motion.div>

      {/* Mascot with message */}
      <div className="mt-6 flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={won ? "/mascot/win.png" : "/mascot/lose.png"}
          alt={won ? "Victory!" : "Train more!"}
          className="h-32 w-32 object-contain drop-shadow-md"
        />
        <div className="max-w-[280px] rounded-card bg-white p-3 text-center shadow-card">
          <p className="text-sm font-bold text-navy">
            {won
              ? t("wonBubble")
              : "Don't give up! Train more and you'll get better! 💪"}
          </p>
        </div>
      </div>

      {/* AI Coach summary — with cancel button */}
      {showCoach && (
        <section className="relative mt-6 w-full max-w-md rounded-hero bg-white p-5 shadow-card">
          <button
            onClick={() => setShowCoach(false)}
            className="absolute right-3 top-3 rounded-full p-1 text-muted hover:bg-pale hover:text-navy transition"
            aria-label="Close coach review"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center justify-between gap-3 pr-8">
            <h3 className="text-lg font-extrabold text-navy">{t("summary")}</h3>
            <span className="rounded-chip bg-pale px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-cobalt">
              {t("powered")}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: t("brilliants"), value: 1, color: "#A86BFF" },
              { label: t("blunders"), value: 2, color: "#FF4B4B" },
              { label: t("bestMoves"), value: 14, color: "#58CC02" }
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-card border-2 border-pale p-3 text-center"
              >
                <div
                  className="tabnum text-2xl font-extrabold"
                  style={{ color: s.color }}
                >
                  {s.value}
                </div>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <Link href="/coach" className="mt-4 block">
            <ChunkyButton block size="lg" pill>
              {t("coachCta")}
            </ChunkyButton>
          </Link>
        </section>
      )}

      {/* share */}
      <section className="mt-5 w-full max-w-md">
        <div className="text-center text-xs font-extrabold uppercase tracking-widest text-muted">
          {t("share")}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            { label: "Telegram", icon: Send, color: "#229ED9" },
            { label: "WhatsApp", icon: MessageCircle, color: "#25D366" },
            { label: t("copyLink"), icon: Copy, color: "#0047BB" }
          ].map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                className="flex items-center justify-center gap-2 rounded-card bg-white py-3 text-sm font-extrabold text-navy shadow-card transition active:scale-95"
              >
                <span
                  className="grid h-7 w-7 place-items-center rounded-full text-white"
                  style={{ background: s.color }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {s.label}
              </button>
            );
          })}
        </div>
      </section>

      <Link href="/play" className="mt-6 block w-full max-w-md">
        <ChunkyButton block size="lg" pill variant="ghost">
          Play another
        </ChunkyButton>
      </Link>
    </main>
  );
}
