"use client";

/**
 * PostGameMock — Post-game result screen.
 *
 * Shows: result banner, Aleo mascot reaction, final board position,
 * detailed AI Coach advice with skip option, and action buttons.
 */

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AleoMascot } from "@/components/AleoMascot";
import { ChunkyButton } from "@/components/ChunkyButton";
import { ChessboardWrapper } from "@/components/ChessboardWrapper";
import { useGameStore } from "@/lib/chess/game-state";
import { X } from "lucide-react";

export interface PostGameMockProps {
  result: "1-0" | "0-1" | "1/2-1/2";
  playerColor: "w" | "b";
  difficulty: string;
  gameId: string;
}

export function PostGameMock({
  result,
  playerColor,
  difficulty,
  gameId,
}: PostGameMockProps) {
  const won =
    (result === "1-0" && playerColor === "w") ||
    (result === "0-1" && playerColor === "b");
  const drew = result === "1/2-1/2";

  const fen = useGameStore((s) => s.fen);
  const moveHistory = useGameStore((s) => s.moveHistory);
  const [showCoach, setShowCoach] = React.useState(true);
  const [xpGained, setXpGained] = React.useState(0);
  const [eloChange, setEloChange] = React.useState(0);
  const [newElo, setNewElo] = React.useState(800);

  // Award XP, update Elo, and track quests on mount
  React.useEffect(() => {
    const xp = won ? 150 : drew ? 100 : 75;
    setXpGained(xp);

    // Elo changes
    const eloDelta = won ? 25 : drew ? 5 : -15;
    setEloChange(eloDelta);
    const currentElo = parseInt(localStorage.getItem("aleo:elo") ?? "800", 10);
    const updated = Math.max(100, currentElo + eloDelta);
    localStorage.setItem("aleo:elo", String(updated));
    setNewElo(updated);

    // Add XP to battle pass (localStorage)
    const currentXp = parseInt(localStorage.getItem("aleo:bp_xp") ?? "0", 10);
    localStorage.setItem("aleo:bp_xp", String(currentXp + xp));

    // Track quests
    const gamesPlayed = parseInt(localStorage.getItem("aleo:quest_games") ?? "0", 10);
    localStorage.setItem("aleo:quest_games", String(gamesPlayed + 1));

    // Auto-claim first battle pass tier for everyone
    const freeClaimed: number[] = JSON.parse(localStorage.getItem("aleo:bp_claimed_free") ?? "[]");
    if (!freeClaimed.includes(1) && currentXp + xp >= 0) {
      freeClaimed.push(1);
      localStorage.setItem("aleo:bp_claimed_free", JSON.stringify(freeClaimed));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headline = won ? "You won!" : drew ? "Draw!" : "Tough one!";
  const bannerGradient = won
    ? "from-winGreen to-[#3F9101]"
    : drew
      ? "from-sky to-cobalt"
      : "from-lossRed to-[#C73838]";

  const opponentLabel = difficulty === "friend" ? "Friend" : `Stockfish (${difficulty})`;

  // Generate detailed AI advice based on game result
  const coachAdvice = React.useMemo(() => {
    const totalMoves = moveHistory.length;
    const tips: { title: string; body: string; emoji: string }[] = [];

    if (won) {
      tips.push({
        title: "Opening Choice",
        body: `You played ${totalMoves} moves and maintained control. Your opening set the tone for the whole game — keep using this opening to build your repertoire.`,
        emoji: "📖",
      });
      tips.push({
        title: "Piece Activity",
        body: "Your pieces were well-coordinated. In winning positions, always look for forcing moves (checks, captures, threats) to close out the game faster.",
        emoji: "⚡",
      });
      tips.push({
        title: "Next Challenge",
        body: "Try a harder difficulty or a faster time control to keep improving. The best way to grow is to play opponents just above your level.",
        emoji: "🎯",
      });
    } else if (drew) {
      tips.push({
        title: "Missed Opportunities",
        body: "Draws often come from missed tactical shots. Review the game and look for moments where you had a forcing sequence (check → check → win material).",
        emoji: "🔍",
      });
      tips.push({
        title: "Endgame Technique",
        body: "Many draws happen in the endgame. Study basic endgame patterns: King + Pawn endings, Rook endings, and opposition. These win games at every level.",
        emoji: "📚",
      });
    } else {
      tips.push({
        title: "Critical Moment",
        body: "Every loss has a turning point. Look for the move where the evaluation swung against you — that's your biggest learning opportunity.",
        emoji: "💡",
      });
      tips.push({
        title: "Piece Safety",
        body: "Before every move, ask: 'Is my piece safe here? Can my opponent attack it?' This one habit prevents 80% of blunders.",
        emoji: "🛡️",
      });
      tips.push({
        title: "Time Management",
        body: "If you were in time trouble, try spending more time on critical positions (when pieces are being exchanged or the pawn structure changes) and less on obvious recaptures.",
        emoji: "⏱️",
      });
      tips.push({
        title: "Don't Give Up",
        body: `Losing is part of improving. Even grandmasters lose regularly. Each loss teaches you something a win never could. Play again!`,
        emoji: "💪",
      });
    }
    return tips;
  }, [won, drew, moveHistory.length]);

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center bg-gradient-to-b from-pale via-white to-pale px-5 pb-10 pt-6">
      <div className="absolute inset-x-0 top-0 -z-0 h-64 bg-gradient-to-b from-sky/30 to-transparent" />

      <Link
        href="/play"
        className="self-start rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-cobalt shadow-card"
      >
        ← Home
      </Link>

      {/* Big result banner */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 16 }}
        className={`relative mt-2 w-full max-w-md rounded-hero bg-gradient-to-br ${bannerGradient} p-6 text-center text-white shadow-hero`}
      >
        <span className="pointer-events-none absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
        <h1 className="text-3xl font-extrabold leading-tight drop-shadow-sm">
          {headline}
        </h1>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <motion.span
            initial={{ scale: 0, rotate: -5 }}
            animate={{ scale: [0, 1.2, 1], rotate: [-5, 0] }}
            transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 14 }}
            className={`rounded-full bg-white px-3 py-1 text-sm font-extrabold shadow-chunky ${
              won ? "text-winGreen" : drew ? "text-cobalt" : "text-lossRed"
            }`}
          >
            {result}
          </motion.span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-extrabold">
            vs {opponentLabel}
          </span>
        </div>
        <div className="mt-2 flex justify-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${eloChange >= 0 ? "bg-winGreen/20 text-white" : "bg-lossRed/20 text-white"}`}>
            Elo: {newElo} ({eloChange >= 0 ? "+" : ""}{eloChange})
          </span>
          <span className="rounded-full bg-proGold/30 px-3 py-1 text-xs font-extrabold text-white">
            +{xpGained} XP
          </span>
        </div>
      </motion.div>

      {/* Final position board */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6"
      >
        <ChessboardWrapper
          position={fen}
          size={Math.min(280, typeof window !== "undefined" ? window.innerWidth - 64 : 280)}
          boardTheme="ocean"
          orientation={playerColor === "w" ? "white" : "black"}
          showCoords={false}
        />
        <p className="mt-2 text-center text-xs font-bold text-cobalt/70">
          Final position · {moveHistory.length} moves
        </p>
      </motion.div>

      {/* Aleo reacting */}
      <div className="mt-6 flex items-end gap-4">
        <AleoMascot mood={won ? "cheer" : drew ? "thinking" : "sad"} size={100} />
        <div className="relative -mb-3 max-w-[220px] rounded-card bg-white p-3 shadow-card">
          <div className="absolute -left-2 top-6 h-3 w-3 rotate-45 bg-white" aria-hidden />
          <p className="text-sm font-bold text-navy">
            {won
              ? "Brilliant! You outplayed your opponent! Let me show you exactly where you gained the edge."
              : drew
                ? "Great fight! A draw is solid. Let me find the winning lines you could have used."
                : "Every game is a lesson. Let me show you the key turning points."}
          </p>
        </div>
      </div>

      {/* AI Coach Review */}
      {showCoach && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 w-full max-w-md rounded-hero bg-white p-5 shadow-card"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold text-navy">AI Coach Summary</h3>
            <button
              onClick={() => setShowCoach(false)}
              className="flex items-center gap-1 rounded-chip bg-pale px-2 py-1 text-[10px] font-extrabold text-cobalt/70 transition hover:bg-lossRed/10 hover:text-lossRed"
              title="Skip review"
            >
              <X className="h-3 w-3" />
              Skip
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {coachAdvice.map((tip, i) => (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.15 }}
                className="flex gap-3 rounded-card border border-pale bg-pale/30 p-3"
              >
                <span className="text-xl">{tip.emoji}</span>
                <div className="flex-1">
                  <h4 className="text-sm font-extrabold text-navy">{tip.title}</h4>
                  <p className="mt-0.5 text-xs font-bold leading-relaxed text-cobalt/70">
                    {tip.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <Link href={`/games/${gameId}/review`} className="mt-4 block">
            <ChunkyButton block size="lg" pill>
              Full Move-by-Move Review
            </ChunkyButton>
          </Link>
        </motion.section>
      )}

      {/* Actions */}
      <div className="mt-6 flex w-full max-w-md flex-col gap-3">
        <Link href="/play/bot" className="block">
          <ChunkyButton block size="lg" pill>
            Play Again
          </ChunkyButton>
        </Link>
        <Link href="/play" className="block">
          <ChunkyButton block size="md" pill variant="ghost">
            Back to Home
          </ChunkyButton>
        </Link>
      </div>
    </main>
  );
}
