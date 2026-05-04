"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Timer, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { ChessboardWrapper } from "@/components/ChessboardWrapper";
import { ChunkyButton } from "@/components/ChunkyButton";
import { Chess, type Square } from "chess.js";

// Puzzle Rush puzzles — each has a FEN position and the correct move(s)
const RUSH_PUZZLES = [
  { fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1", solution: ["f7"], hint: "Scholar's mate!" },
  { fen: "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1", solution: ["g4"], hint: "Fool's mate threat" },
  { fen: "r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1", solution: ["d4"], hint: "Center control" },
  { fen: "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 1", solution: ["d5"], hint: "Capture the pawn" },
  { fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1", solution: ["c4", "c3", "b5"], hint: "Italian or Ruy Lopez" },
  { fen: "rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1", solution: ["e5"], hint: "Attack the knight" },
  { fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 1", solution: ["f3"], hint: "Sicilian — Nf3" },
  { fen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1", solution: ["f5", "d5"], hint: "Dutch or Queen's Gambit" },
  { fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1", solution: ["c3"], hint: "Italian Game" },
  { fen: "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1", solution: ["d4"], hint: "French Defense" },
];

type RushState = "ready" | "playing" | "finished";

export default function PuzzleRushPage() {
  const [state, setState] = React.useState<RushState>("ready");
  const [currentPuzzle, setCurrentPuzzle] = React.useState(0);
  const [score, setScore] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState(180); // 3 minutes
  const [mistakes, setMistakes] = React.useState(0);
  const maxMistakes = 3;
  const [feedback, setFeedback] = React.useState<"correct" | "wrong" | null>(null);

  // Timer
  React.useEffect(() => {
    if (state !== "playing") return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setState("finished");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  function startRush() {
    setState("playing");
    setCurrentPuzzle(0);
    setScore(0);
    setTimeLeft(180);
    setMistakes(0);
    setFeedback(null);
  }

  function handleMove(from: string, to: string) {
    if (state !== "playing") return;
    const puzzle = RUSH_PUZZLES[currentPuzzle];
    if (!puzzle) return;

    // Check if the target square is in the solution
    const isCorrect = puzzle.solution.includes(to);

    if (isCorrect) {
      setScore((s) => s + 1);
      setFeedback("correct");
      setTimeout(() => {
        setFeedback(null);
        if (currentPuzzle + 1 >= RUSH_PUZZLES.length) {
          setState("finished");
        } else {
          setCurrentPuzzle((p) => p + 1);
        }
      }, 500);
    } else {
      setMistakes((m) => {
        const next = m + 1;
        if (next >= maxMistakes) {
          setState("finished");
        }
        return next;
      });
      setFeedback("wrong");
      setTimeout(() => setFeedback(null), 800);
    }
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  if (state === "ready") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-pale via-white to-pale px-6 text-center">
        <div className="flex flex-col items-center gap-6">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-lossRed to-[#FF6B6B] shadow-hero"
          >
            <Zap className="h-12 w-12 text-white" />
          </motion.div>
          <h1 className="text-4xl font-extrabold text-navy">Puzzle Rush</h1>
          <p className="max-w-sm text-sm font-bold text-cobalt">
            Solve as many puzzles as you can in 3 minutes!<br />
            3 mistakes and you&apos;re out. 🔥
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <ChunkyButton block size="lg" pill onClick={startRush}>
              <Zap className="mr-2 h-5 w-5" /> Start Rush!
            </ChunkyButton>
            <Link href="/puzzles">
              <ChunkyButton block size="sm" pill variant="ghost" iconLeft={<ArrowLeft className="h-4 w-4" />}>
                Back to Puzzles
              </ChunkyButton>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (state === "finished") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-pale via-white to-pale px-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={score >= 5 ? "/mascot/win.png" : "/mascot/lose.png"}
            alt="Result"
            className="h-28 w-28 object-contain"
          />
          <h1 className="text-4xl font-extrabold text-navy">
            {score >= 5 ? "Amazing! 🎉" : "Good try! 💪"}
          </h1>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-card bg-white p-4 shadow-card">
              <div className="tabnum text-3xl font-extrabold text-winGreen">{score}</div>
              <div className="text-xs font-bold text-muted">Solved</div>
            </div>
            <div className="rounded-card bg-white p-4 shadow-card">
              <div className="tabnum text-3xl font-extrabold text-lossRed">{mistakes}</div>
              <div className="text-xs font-bold text-muted">Mistakes</div>
            </div>
            <div className="rounded-card bg-white p-4 shadow-card">
              <div className="tabnum text-3xl font-extrabold text-cobalt">{timeDisplay}</div>
              <div className="text-xs font-bold text-muted">Time Left</div>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <ChunkyButton block size="lg" pill onClick={startRush}>
              <Zap className="mr-2 h-5 w-5" /> Try Again
            </ChunkyButton>
            <Link href="/puzzles">
              <ChunkyButton block size="sm" pill variant="ghost">
                Back to Puzzles
              </ChunkyButton>
            </Link>
          </div>
        </motion.div>
      </main>
    );
  }

  const puzzle = RUSH_PUZZLES[currentPuzzle];

  return (
    <main className="flex min-h-[100dvh] flex-col bg-surfaceLight">
      {/* Header with timer and score */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-white px-4 py-3 shadow-card">
        <Link href="/puzzles" className="rounded-full bg-pale px-3 py-1.5 text-xs font-extrabold text-cobalt">
          ← Exit
        </Link>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-extrabold ${
            timeLeft <= 30 ? "bg-lossRed/10 text-lossRed animate-pulse" : "bg-pale text-navy"
          }`}>
            <Timer className="h-4 w-4" /> {timeDisplay}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="tabnum rounded-full bg-winGreen/10 px-3 py-1.5 text-sm font-extrabold text-winGreen">
            ✓ {score}
          </span>
          <span className="tabnum rounded-full bg-lossRed/10 px-3 py-1.5 text-sm font-extrabold text-lossRed">
            ✗ {mistakes}/{maxMistakes}
          </span>
        </div>
      </header>

      {/* Puzzle info */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-navy">
            Puzzle #{currentPuzzle + 1}
          </span>
          <span className="text-xs font-bold text-muted">{puzzle?.hint}</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-pale">
          <motion.div
            className="h-full rounded-full bg-sky"
            initial={{ width: 0 }}
            animate={{ width: `${((currentPuzzle) / RUSH_PUZZLES.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Board */}
      <section className="flex flex-1 items-center justify-center px-4 py-2">
        <div className="mx-auto w-full max-w-[min(400px,calc(100vw-2rem))]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPuzzle}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              {puzzle && (
                <ChessboardWrapper
                  position={puzzle.fen}
                  size={380}
                  boardTheme="ocean"
                  onMove={handleMove}
                  responsive
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Feedback overlay */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className={`flex items-center gap-2 rounded-full px-6 py-3 text-lg font-extrabold text-white shadow-hero ${
              feedback === "correct" ? "bg-winGreen" : "bg-lossRed"
            }`}>
              {feedback === "correct" ? (
                <><CheckCircle className="h-6 w-6" /> Correct!</>
              ) : (
                <><XCircle className="h-6 w-6" /> Try again!</>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
