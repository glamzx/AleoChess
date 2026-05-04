"use client";

/**
 * ChessboardWrapper
 *
 * Pure-visual cartoon chessboard. Renders a position from FEN with cartoon
 * SVG pieces. Click or drag to move pieces. Arrow keys navigate squares,
 * Enter/Space selects + moves, Esc cancels.
 *
 * Move *validation* and engine analysis intentionally NOT implemented here
 * — they will be wired to the existing root-level Stockfish WASM.
 *
 * TODO: wire to root-level Stockfish WASM for move legality + analysis.
 */

import * as React from "react";
import { motion } from "framer-motion";
import { Chess, type Move, type Square } from "chess.js";
import { cn } from "@/lib/cn";
import { playSfx } from "@/lib/sounds";

export type BoardTheme = "ocean" | "steppe" | "candy" | "noir";
export type PieceTheme = "cartoon" | "classic";

const themePalettes: Record<BoardTheme, { light: string; dark: string; rim: string }> = {
  ocean: { light: "#EAF4FF", dark: "#6CB7FF", rim: "#0047BB" },
  steppe: { light: "#FFF5DC", dark: "#FFB14B", rim: "#9A4F00" },
  candy: { light: "#FFE0F0", dark: "#FF7AB6", rim: "#9A1F5C" },
  noir: { light: "#E8EDF5", dark: "#3A4A66", rim: "#0F1A33" }
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export type Piece = {
  type: "p" | "n" | "b" | "r" | "q" | "k";
  color: "w" | "b";
};

function parseFen(fen: string): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array.from({ length: 8 }, () =>
    Array(8).fill(null)
  );
  const placement = fen.split(" ")[0] ?? "";
  const rows = placement.split("/");
  for (let r = 0; r < 8; r++) {
    let f = 0;
    for (const ch of rows[r] ?? "") {
      if (/\d/.test(ch)) {
        f += Number(ch);
      } else {
        const color = ch === ch.toUpperCase() ? "w" : "b";
        board[r]![f] = {
          type: ch.toLowerCase() as Piece["type"],
          color
        };
        f++;
      }
    }
  }
  return board;
}

function CartoonPiece({ piece, size = 48 }: { piece: Piece; size?: number }) {
  const { type, color } = piece;
  const fill = color === "w" ? "#FFFFFF" : "#0A1F4A";
  const accent = color === "w" ? "#0047BB" : "#2AB2FF";
  const stroke = "#0A1F4A";

  const common = (
    <ellipse cx={32} cy={56} rx={20} ry={4} fill="#0A1F4A" opacity={0.18} />
  );

  switch (type) {
    case "p":
      return (
        <svg width={size} height={size} viewBox="0 0 64 64">
          {common}
          <circle cx={32} cy={20} r={8} fill={fill} stroke={stroke} strokeWidth={2.5} />
          <path
            d="M22 50 q-2 -16 10 -22 q12 6 10 22 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <rect x={20} y={48} width={24} height={6} rx={2} fill={fill} stroke={stroke} strokeWidth={2.5} />
          <circle cx={29} cy={19} r={1.5} fill={accent} />
        </svg>
      );
    case "n":
      return (
        <svg width={size} height={size} viewBox="0 0 64 64">
          {common}
          <path
            d="M18 52 L18 40 Q18 28 25 20 L22 11 Q25 8 29 15 Q33 7 37 10 L36 17 Q44 20 48 28 Q52 36 46 43 L49 47 Q47 51 40 48 Q36 52 30 52 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={2.8}
            strokeLinejoin="round"
          />
          <path
            d="M25 20 Q22 27 25 35 Q29 29 31 20"
            fill={accent}
            opacity={0.55}
          />
          <path
            d="M28 25 Q22 31 24 39"
            stroke={stroke}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M43 34 Q47 36 47 40 Q45 43 41 43"
            stroke={stroke}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
          <circle cx={39} cy={27} r={2.3} fill={stroke} />
          <circle cx={38.4} cy={26.2} r={0.7} fill={fill} />
          <circle cx={46} cy={40} r={1.5} fill={stroke} opacity={0.7} />
          <rect x={15} y={50} width={28} height={6} rx={2} fill={fill} stroke={stroke} strokeWidth={2.5} />
        </svg>
      );
    case "b":
      return (
        <svg width={size} height={size} viewBox="0 0 64 64">
          {common}
          <path
            d="M32 8 q-2 6 4 8 q-4 2 -4 6 q-12 8 -12 22 q0 6 12 6 q12 0 12 -6 q0 -14 -12 -22 q0 -4 -4 -6 q6 -2 4 -8z"
            fill={fill}
            stroke={stroke}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <path d="M30 30 l4 0 M32 28 l0 4" stroke={accent} strokeWidth={2} />
          <rect x={18} y={50} width={28} height={6} rx={2} fill={fill} stroke={stroke} strokeWidth={2.5} />
        </svg>
      );
    case "r":
      return (
        <svg width={size} height={size} viewBox="0 0 64 64">
          {common}
          <path
            d="M16 14 h6 v4 h6 v-4 h8 v4 h6 v-4 h6 v10 l-4 4 v18 l4 4 v6 h-32 v-6 l4 -4 v-18 l-4 -4z"
            fill={fill}
            stroke={stroke}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        </svg>
      );
    case "q":
      return (
        <svg width={size} height={size} viewBox="0 0 64 64">
          {common}
          <path
            d="M14 16 l4 12 l8 -10 l6 12 l6 -12 l8 10 l4 -12 l-4 32 h-28z"
            fill={fill}
            stroke={stroke}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <circle cx={14} cy={16} r={2.5} fill={accent} stroke={stroke} strokeWidth={1.5} />
          <circle cx={26} cy={18} r={2.5} fill={accent} stroke={stroke} strokeWidth={1.5} />
          <circle cx={32} cy={20} r={2.5} fill={accent} stroke={stroke} strokeWidth={1.5} />
          <circle cx={38} cy={18} r={2.5} fill={accent} stroke={stroke} strokeWidth={1.5} />
          <circle cx={50} cy={16} r={2.5} fill={accent} stroke={stroke} strokeWidth={1.5} />
          <rect x={16} y={48} width={32} height={6} rx={2} fill={fill} stroke={stroke} strokeWidth={2.5} />
        </svg>
      );
    case "k":
      return (
        <svg width={size} height={size} viewBox="0 0 64 64">
          {common}
          <path
            d="M30 6 v4 h-4 v4 h4 v6 q-12 6 -12 18 q0 8 14 12 q14 -4 14 -12 q0 -12 -12 -18 v-6 h4 v-4 h-4 v-4z"
            fill={fill}
            stroke={stroke}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <rect x={16} y={48} width={32} height={6} rx={2} fill={fill} stroke={stroke} strokeWidth={2.5} />
        </svg>
      );
  }
}

export interface ChessboardWrapperProps {
  boardTheme?: BoardTheme;
  pieceTheme?: PieceTheme;
  orientation?: "white" | "black";
  position?: string; // FEN
  onMove?: (from: string, to: string) => void;
  size?: number; // pixel size of the board (square)
  showCoords?: boolean;
  highlightLast?: { from: string; to: string };
  className?: string;
  responsive?: boolean; // if true, board fills container width
}

export function ChessboardWrapper({
  boardTheme = "ocean",
  pieceTheme = "cartoon",
  orientation = "white",
  position = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  onMove,
  size = 360,
  showCoords = true,
  highlightLast,
  className,
  responsive = false
}: ChessboardWrapperProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [computedSize, setComputedSize] = React.useState(size);

  React.useEffect(() => {
    if (!responsive || !containerRef.current) return;
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        setComputedSize(Math.min(w, size));
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [responsive, size]);
  const palette = themePalettes[boardTheme];
  const board = React.useMemo(() => parseFen(position), [position]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [cursor, setCursor] = React.useState<string>("e4");
  const legalMoves = React.useMemo(() => {
    if (!selected) return [];
    try {
      const chess = new Chess(position);
      return chess.moves({ square: selected as Square, verbose: true }) as Move[];
    } catch {
      return [];
    }
  }, [position, selected]);
  const legalTargetSet = React.useMemo<Set<string>>(
    () => new Set(legalMoves.map((move) => move.to)),
    [legalMoves]
  );
  const captureTargetSet = React.useMemo<Set<string>>(
    () => new Set(legalMoves.filter((move) => !!move.captured).map((move) => move.to)),
    [legalMoves]
  );

  const files = orientation === "white" ? FILES : [...FILES].reverse();
  const ranks = orientation === "white" ? [...RANKS].reverse() : [...RANKS];

  function squareName(fileIdx: number, rankIdx: number) {
    return `${files[fileIdx]}${ranks[rankIdx]}`;
  }

  function pieceAt(square: string): Piece | null {
    const f = FILES.indexOf(square[0] as (typeof FILES)[number]);
    const r = 7 - RANKS.indexOf(square[1] as (typeof RANKS)[number]);
    return board[r]?.[f] ?? null;
  }

  function handleSquareActivate(sq: string) {
    if (selected === sq) {
      setSelected(null);
      return;
    }
    if (!selected) {
      const p = pieceAt(sq);
      if (!p) return;
      try {
        const chess = new Chess(position);
        if (chess.moves({ square: sq as Square, verbose: true }).length > 0) setSelected(sq);
      } catch {
        setSelected(sq);
      }
      return;
    }
    // If clicked square has a friendly piece, switch selection to it
    const clickedPiece = pieceAt(sq);
    const selectedPiece = pieceAt(selected);
    if (clickedPiece && selectedPiece && clickedPiece.color === selectedPiece.color) {
      setSelected(sq);
      return;
    }
    if (!legalTargetSet.has(sq) && !captureTargetSet.has(sq)) {
      setSelected(null);
      return;
    }
    const targetPiece = pieceAt(sq);
    onMove?.(selected, sq);
    if (targetPiece) playSfx("capture");
    else playSfx("pieceMove");
    setSelected(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const idx = (s: string) => ({
      f: FILES.indexOf(s[0] as (typeof FILES)[number]),
      r: RANKS.indexOf(s[1] as (typeof RANKS)[number])
    });
    const cur = idx(cursor);
    const next = { ...cur };
    if (e.key === "ArrowLeft") next.f = Math.max(0, cur.f - 1);
    else if (e.key === "ArrowRight") next.f = Math.min(7, cur.f + 1);
    else if (e.key === "ArrowUp") next.r = Math.min(7, cur.r + 1);
    else if (e.key === "ArrowDown") next.r = Math.max(0, cur.r - 1);
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSquareActivate(cursor);
      return;
    } else if (e.key === "Escape") {
      setSelected(null);
      return;
    } else return;
    e.preventDefault();
    setCursor(`${FILES[next.f]}${RANKS[next.r]}`);
  }

  const actualSize = responsive ? computedSize : size;

  return (
    <div ref={containerRef} className={responsive ? "w-full" : undefined}>
    <div
      role="grid"
      aria-label="Chess board"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative inline-block rounded-card p-2 outline-none",
        className
      )}
      style={{
        background: palette.rim,
        boxShadow: `0 6px 0 0 ${palette.rim}`
      }}
    >
      <div
        className="grid overflow-hidden rounded-chip"
        style={{
          width: actualSize,
          height: actualSize,
          gridTemplateColumns: "repeat(8, 1fr)",
          gridTemplateRows: "repeat(8, 1fr)"
        }}
      >
        {ranks.map((_, rIdx) =>
          files.map((_, fIdx) => {
            const sq = squareName(fIdx, rIdx);
            const isLight = (fIdx + rIdx) % 2 === 0;
            const piece = pieceAt(sq);
            const isSelected = selected === sq;
            const isCursor = cursor === sq;
            const isLastFrom = highlightLast?.from === sq;
            const isLastTo = highlightLast?.to === sq;
            const showTarget = legalTargetSet.has(sq);
            const showCaptureTarget = captureTargetSet.has(sq);

            return (
              <div
                key={sq}
                role="gridcell"
                aria-label={sq}
                onClick={() => handleSquareActivate(sq)}
                className={cn(
                  "relative flex select-none items-center justify-center transition-all",
                  showCaptureTarget && "bg-lossRed/10"
                )}
                style={{
                  background:
                    isLastFrom || isLastTo
                      ? "#FFE98A"
                      : isLight
                      ? palette.light
                      : palette.dark,
                  boxShadow: isSelected
                    ? "inset 0 0 0 4px #FFD700"
                    : isCursor
                    ? "inset 0 0 0 3px #2AB2FF"
                    : undefined,
                  cursor: piece || selected ? "pointer" : "default"
                }}
              >
                {showCoords && fIdx === 0 && (
                  <span
                    className="pointer-events-none absolute left-1 top-0.5 text-[10px] font-extrabold opacity-70"
                    style={{ color: isLight ? palette.rim : "#fff" }}
                  >
                    {ranks[rIdx]}
                  </span>
                )}
                {showCoords && rIdx === 7 && (
                  <span
                    className="pointer-events-none absolute bottom-0.5 right-1 text-[10px] font-extrabold opacity-70"
                    style={{ color: isLight ? palette.rim : "#fff" }}
                  >
                    {files[fIdx]}
                  </span>
                )}
                {showTarget && (
                  <span
                    className={cn(
                      "absolute rounded-full",
                      showCaptureTarget
                        ? "inset-1 border-4 border-lossRed/70 bg-lossRed/10"
                        : "h-3 w-3 bg-winGreen/70"
                    )}
                    aria-hidden
                  />
                )}
                {piece && (
                  <motion.div
                    layoutId={`${sq}-piece`}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="pointer-events-none"
                  >
                    {pieceTheme === "cartoon" ? (
                      <CartoonPiece piece={piece} size={Math.floor(size / 8) - 4} />
                    ) : (
                      <span
                        style={{
                          fontSize: Math.floor(size / 10),
                          color: piece.color === "w" ? "#fff" : "#0A1F4A",
                          textShadow:
                            piece.color === "w"
                              ? "0 0 1px #0A1F4A, 0 0 2px #0A1F4A"
                              : "none"
                        }}
                      >
                        {pieceUnicode(piece)}
                      </span>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
    </div>
  );
}

function pieceUnicode(p: Piece): string {
  const map: Record<Piece["color"], Record<Piece["type"], string>> = {
    w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
    b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" }
  };
  return map[p.color][p.type];
}
