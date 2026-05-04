"use client";

import * as React from "react";
import { Sparkles, Lock, BookOpen, Play, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChunkyButton } from "@/components/ChunkyButton";
import { ProUpsellModal } from "@/components/ProUpsellModal";
import { courses } from "@/lib/mock";

// Sample lesson content for free courses
const lessonContent: Record<string, { title: string; content: string }[]> = {
  "Chess Basics": [
    { title: "The Board", content: "A chess board has 64 squares arranged in an 8×8 grid. Squares alternate between light and dark colors." },
    { title: "The Pieces", content: "Each player starts with 16 pieces: 1 King, 1 Queen, 2 Rooks, 2 Bishops, 2 Knights, and 8 Pawns." },
    { title: "How Pieces Move", content: "Each piece moves differently. The Queen is the most powerful, moving in any direction. The Knight moves in an L-shape." },
    { title: "Check & Checkmate", content: "When a King is under attack, it's in check. If there's no way to escape check, it's checkmate — game over!" },
    { title: "Castling", content: "Castling is a special move where the King moves two squares toward a Rook, and the Rook jumps over the King." },
  ],
  "Tactics 101": [
    { title: "Forks", content: "A fork is when one piece attacks two or more pieces at the same time. Knights are great at forking!" },
    { title: "Pins", content: "A pin is when a piece cannot move because doing so would expose a more valuable piece behind it." },
    { title: "Skewers", content: "A skewer is the opposite of a pin — the more valuable piece is in front and must move, exposing the piece behind." },
    { title: "Discovered Attacks", content: "A discovered attack happens when moving one piece reveals an attack from another piece behind it." },
  ],
  "Openings": [
    { title: "Italian Game", content: "1.e4 e5 2.Nf3 Nc6 3.Bc4 — A classic opening that develops pieces quickly and aims at the f7 square." },
    { title: "Sicilian Defense", content: "1.e4 c5 — The most popular response to 1.e4 at the top level. Creates asymmetric positions." },
    { title: "Queen's Gambit", content: "1.d4 d5 2.c4 — White offers a pawn to gain control of the center. A very solid opening choice." },
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
