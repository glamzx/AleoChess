"use client";

import * as React from "react";
import { Sparkles, Lock, BookOpen, Play, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChunkyButton } from "@/components/ChunkyButton";
import { ProUpsellModal } from "@/components/ProUpsellModal";
import { courses } from "@/lib/mock";

// Sample lesson content for free courses
const lessonContent: Record<string, { title: string; content: string }[]> = {
  "Openings 101": [
    { title: "Italian Game", content: "1.e4 e5 2.Nf3 Nc6 3.Bc4 — A classic opening that develops pieces quickly and aims at the f7 square." },
    { title: "Sicilian Defense", content: "1.e4 c5 — The most popular response to 1.e4 at the top level. Creates asymmetric positions." },
    { title: "Queen's Gambit", content: "1.d4 d5 2.c4 — White offers a pawn to gain control of the center. A very solid opening choice." },
    { title: "French Defense", content: "1.e4 e6 — A solid, strategic opening. Black builds a strong pawn chain and fights for counterplay." },
    { title: "Ruy López", content: "1.e4 e5 2.Nf3 Nc6 3.Bb5 — One of the oldest openings. White puts pressure on Black's center early." },
    { title: "King's Indian Defense", content: "1.d4 Nf6 2.c4 g6 — Black allows White to build a big center, then counter-attacks it aggressively." },
    { title: "London System", content: "1.d4 d5 2.Bf4 — A simple, solid system. Great for beginners who want a reliable setup with White." },
    { title: "Caro-Kann Defense", content: "1.e4 c6 — A very solid defense. Black aims for a strong pawn structure and steady development." },
    { title: "Scotch Game", content: "1.e4 e5 2.Nf3 Nc6 3.d4 — White immediately opens the center. Leads to active piece play." },
    { title: "Dutch Defense", content: "1.d4 f5 — An aggressive choice for Black. Aims to control the e4 square and create kingside attacks." },
    { title: "Pirc Defense", content: "1.e4 d6 2.d4 Nf6 3.Nc3 g6 — A hypermodern opening where Black lets White build a center then attacks it." },
    { title: "English Opening", content: "1.c4 — A flexible opening that can transpose into many different structures. Very popular at top level." },
  ],
  "Tactics Basics": [
    { title: "Forks", content: "A fork is when one piece attacks two or more pieces at the same time. Knights are great at forking!" },
    { title: "Pins", content: "A pin is when a piece cannot move because doing so would expose a more valuable piece behind it." },
    { title: "Skewers", content: "A skewer is the opposite of a pin — the more valuable piece is in front and must move, exposing the piece behind." },
    { title: "Discovered Attacks", content: "A discovered attack happens when moving one piece reveals an attack from another piece behind it." },
    { title: "Double Check", content: "A double check is when two pieces give check at the same time. The king MUST move — blocking is impossible." },
    { title: "Back Rank Mate", content: "A back rank mate happens when a rook or queen checkmates a king trapped behind its own pawns." },
    { title: "Removing the Defender", content: "Capture or deflect a piece that is protecting something important, then win the undefended piece." },
    { title: "Overloaded Pieces", content: "A piece is overloaded when it has too many jobs. Attack what it's protecting to exploit the weakness." },
    { title: "Trapped Pieces", content: "Sometimes a piece has no safe squares to go to. Use your pawns and pieces to restrict its escape." },
    { title: "Zwischenzug", content: "An 'in-between move' — instead of making the expected move, you play a surprising threat first." },
    { title: "Deflection", content: "Force an opponent's piece away from a key square by threatening something else." },
    { title: "Decoy", content: "Lure an enemy piece to a bad square where it can be captured or where it blocks its own pieces." },
    { title: "X-ray Attack", content: "An attack through another piece. For example, a rook on the same file as an enemy queen with a piece in between." },
    { title: "Interference", content: "Place a piece between two enemy pieces that are defending each other, breaking their coordination." },
    { title: "Desperado", content: "When a piece is lost anyway, use it to capture as much value as possible before it goes." },
    { title: "Windmill", content: "A combination of discovered checks and captures. The attacking piece can capture many pieces in sequence." },
    { title: "Greek Gift Sacrifice", content: "Bxh7+! A classic bishop sacrifice on h7 to expose the castled king and launch a devastating attack." },
    { title: "Smothered Mate", content: "A knight delivers checkmate while the king is surrounded (smothered) by its own pieces." },
  ],
};

export default function LearnPage() {
  const t = useTranslations("learn");
  const [upsell, setUpsell] = React.useState(false);
  const [expandedCourse, setExpandedCourse] = React.useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = React.useState<Set<string>>(new Set());

  function toggleCourse(name: string) {
    setExpandedCourse(expandedCourse === name ? null : name);
  }

  function toggleLesson(id: string) {
    setCompletedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
          {courses.free.map((c) => {
            const lessons = lessonContent[c.name] ?? [];
            const completedCount = lessons.filter((_, i) => completedLessons.has(`${c.name}-${i}`)).length;
            const progress = lessons.length > 0 ? completedCount / lessons.length : c.progress;
            const isExpanded = expandedCourse === c.name;

            return (
              <div key={c.name} className="overflow-hidden rounded-card bg-white shadow-card">
                <button
                  onClick={() => toggleCourse(c.name)}
                  className="flex w-full items-center gap-3 p-4 text-left transition active:bg-pale/50"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-card bg-pale text-cobalt">
                    <BookOpen className="h-6 w-6" />
                  </span>
                  <div className="flex-1">
                    <div className="font-extrabold text-navy">{c.name}</div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-pale">
                      <div
                        className="h-full rounded-full bg-winGreen transition-all"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-cobalt">
                      {completedCount}/{lessons.length || c.lessons} lessons
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-cobalt" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-cobalt" />
                  )}
                </button>

                {isExpanded && lessons.length > 0 && (
                  <div className="border-t-2 border-pale px-4 pb-4 pt-2">
                    <div className="space-y-2">
                      {lessons.map((lesson, i) => {
                        const id = `${c.name}-${i}`;
                        const isDone = completedLessons.has(id);
                        return (
                          <div
                            key={i}
                            className={`rounded-card border-2 p-3 transition ${isDone ? "border-winGreen/30 bg-winGreen/5" : "border-pale"}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-extrabold text-navy">
                                {i + 1}. {lesson.title}
                              </span>
                              <button
                                onClick={() => toggleLesson(id)}
                                className={`grid h-7 w-7 place-items-center rounded-full transition ${isDone ? "bg-winGreen text-white" : "bg-pale text-cobalt hover:bg-sky/20"}`}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="mt-1 text-xs font-bold text-cobalt leading-relaxed">
                              {lesson.content}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
                <div className="text-xs font-bold text-cobalt">
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
