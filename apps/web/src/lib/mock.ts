// Centralized mock data for the visual UI pass.
// Any "live" value (rank, coins, leaderboard, etc.) is hard-coded here.

export type Rank =
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond"
  | "Master"
  | "Grandmaster";

export const me = {
  name: "Player",
  handle: "@player",
  city: "Almaty",
  country: "KZ",
  elo: 800,
  rank: "Bronze" as Rank,
  coins: 0,
  streak: 0,
  xp: 0,
  xpMax: 500,
  isPro: false,
  avatar: "knight"
};

export const cities = [
  "Almaty",
  "Astana",
  "Tashkent",
  "Moscow",
  "Saint Petersburg",
  "Bishkek",
  "Dushanbe",
  "Ashgabat",
  "Kyiv",
  "Minsk",
  "Tbilisi",
  "Yerevan",
  "Baku",
  "Shymkent",
  "Karaganda"
];

export const cityLeaderboard = [
  { rank: 1, city: "Moscow", country: "RU", points: 184320, trend: "up" },
  { rank: 2, city: "Almaty", country: "KZ", points: 152410, trend: "up" },
  { rank: 3, city: "Tashkent", country: "UZ", points: 138920, trend: "down" },
  { rank: 4, city: "Astana", country: "KZ", points: 121060, trend: "up" },
  { rank: 5, city: "Kyiv", country: "UA", points: 110430, trend: "flat" },
  { rank: 6, city: "Tbilisi", country: "GE", points: 98210, trend: "up" },
  { rank: 7, city: "Saint Petersburg", country: "RU", points: 92800, trend: "down" },
  { rank: 8, city: "Bishkek", country: "KG", points: 78250, trend: "up" },
  { rank: 9, city: "Yerevan", country: "AM", points: 71390, trend: "flat" },
  { rank: 10, city: "Minsk", country: "BY", points: 68100, trend: "down" }
] as const;

// No fake friends — populated from real social connections
export const friends: { name: string; elo: number; online: boolean; rank: Rank }[] = [];

export const clans = [
  { name: "Steppe Knights", members: 142, points: 28140, mine: true },
  { name: "Tian Shan", members: 98, points: 21430 },
  { name: "Caspian Pawns", members: 76, points: 17220 },
  { name: "Silk Rooks", members: 55, points: 14820 }
];

export const dailyPuzzle = {
  fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
  rating: 1480,
  movesToMate: undefined,
  theme: "Tactic",
  reward: 25
};

export const puzzlePacks = [
  { name: "Mating Net", solved: 0, total: 30, hue: "#2AB2FF" },
  { name: "Forks", solved: 0, total: 25, hue: "#58CC02" },
  { name: "Pins", solved: 0, total: 20, hue: "#FFC800" },
  { name: "Skewers", solved: 0, total: 18, hue: "#FF7AB6" },
  { name: "Endgames", solved: 0, total: 40, hue: "#A86BFF" },
  { name: "Discovered Attacks", solved: 0, total: 22, hue: "#FF4B4B" }
];

export const courses = {
  free: [
    { name: "Openings 101", lessons: 12, progress: 0 },
    { name: "Tactics Basics", lessons: 18, progress: 0 }
  ],
  pro: [
    { name: "BigTech Interview Track", lessons: 24, badge: "PRO" },
    { name: "GM Endgames", lessons: 32, badge: "PRO" },
    { name: "Opening Repertoire", lessons: 28, badge: "PRO" }
  ]
};

export const skins = [
  { name: "Coral Reef", rarity: "Rare", type: "board", price: 600 },
  { name: "Steppe Sunset", rarity: "Epic", type: "board", price: 1200 },
  { name: "Cosmic", rarity: "Legendary", type: "pieces", price: 2400 },
  { name: "Origami", rarity: "Common", type: "pieces", price: 200 },
  { name: "Aurora", rarity: "Epic", type: "background", price: 1500 },
  { name: "Fireworks", rarity: "Rare", type: "effects", price: 500 }
] as const;

export const achievements = [
  { name: "First Win", earned: false, icon: "trophy" },
  { name: "7-Day Streak", earned: false, icon: "flame" },
  { name: "Puzzle Master", earned: false, icon: "target" },
  { name: "Top 10 in Almaty", earned: false, icon: "crown" },
  { name: "Rapid Climber", earned: false, icon: "rocket" },
  { name: "Brilliant Move", earned: false, icon: "sparkle" }
];

export const aleoTips = [
  "Control the center early — it gives every piece more options.",
  "If you can't find a good move, find your worst piece and improve it.",
  "Castle early. Your king will thank you later.",
  "Look for tactics every move: forks, pins, skewers.",
  "Trade pieces when you're ahead in material, not when you're behind."
];

export const recentMoves = [
  { white: "e4", black: "c5" },
  { white: "Nf3", black: "d6" },
  { white: "d4", black: "cxd4" },
  { white: "Nxd4", black: "Nf6" },
  { white: "Nc3", black: "a6" },
  { white: "Be2", black: "e5" },
  { white: "Nb3", black: "Be7" },
  { white: "O-O", black: "O-O" }
];

export const reviewMockMoves = [
  { san: "e4", classification: "best", evalCp: 24 },
  { san: "c5", classification: "good", evalCp: 18 },
  { san: "Nf3", classification: "best", evalCp: 22 },
  { san: "d6", classification: "good", evalCp: 20 },
  { san: "Bb5+", classification: "inaccuracy", evalCp: 8 },
  { san: "Bd7", classification: "good", evalCp: 6 },
  { san: "Bxd7+", classification: "good", evalCp: 4 },
  { san: "Nxd7", classification: "good", evalCp: 0 },
  { san: "O-O", classification: "best", evalCp: 12 },
  { san: "Nf6", classification: "good", evalCp: 10 },
  { san: "Re1", classification: "good", evalCp: 18 },
  { san: "e6", classification: "blunder", evalCp: -210, bestAlt: "g6", comment: "Oof, that pawn push left a juicy hole on d6. Aleo would prefer g6 to fianchetto." },
  { san: "d4", classification: "best", evalCp: 220 },
  { san: "cxd4", classification: "good", evalCp: 215 },
  { san: "Nxd4", classification: "good", evalCp: 220 },
  { san: "Be7", classification: "good", evalCp: 215 },
  { san: "Bg5", classification: "brilliant", evalCp: 320, comment: "Sweet! Pinning that knight cracks the kingside open." },
  { san: "O-O", classification: "good", evalCp: 318 },
  { san: "Qd2", classification: "good", evalCp: 305 },
  { san: "h6?", classification: "mistake", evalCp: 80, bestAlt: "Nc6", comment: "Slow down — Nc6 develops AND defends." },
  { san: "Bxf6", classification: "best", evalCp: 360 }
] as const;

export const battlePassTiers = Array.from({ length: 30 }, (_, i) => ({
  tier: i + 1,
  free: i % 3 === 0 ? `${50 + i * 10} coins` : i % 3 === 1 ? "XP boost" : "Sticker",
  premium:
    i % 5 === 4
      ? "Legendary skin"
      : i % 4 === 3
      ? "Epic skin"
      : i % 2 === 0
      ? `${100 + i * 20} coins`
      : "Pro emote",
  unlocked: false
}));

export const coinPacks = [
  { coins: 100, price: "$0.99", priceRub: "₽89", bonus: 0 },
  { coins: 500, price: "$4.99", priceRub: "₽449", bonus: 5 },
  { coins: 1200, price: "$9.99", priceRub: "₽899", bonus: 10, popular: true },
  { coins: 2500, price: "$19.99", priceRub: "₽1799", bonus: 15 },
  { coins: 6500, price: "$49.99", priceRub: "₽4499", bonus: 25, best: true }
];

export const dailyQuests = [
  { name: "Play 3 games", progress: 0, total: 3, reward: 30 },
  { name: "Solve 5 puzzles", progress: 0, total: 5, reward: 25, done: false },
  { name: "Win 1 ranked game", progress: 0, total: 1, reward: 50 }
];

export const proFeatures = [
  { feat: "Unlimited puzzles", free: false, pro: true },
  { feat: "Deep AI Coach review", free: false, pro: true },
  { feat: "BigTech Interview Track", free: false, pro: true },
  { feat: "Custom board themes", free: false, pro: true },
  { feat: "Pro-only tournaments", free: false, pro: true },
  { feat: "Priority matchmaking", free: false, pro: true },
  { feat: "Daily puzzle", free: true, pro: true },
  { feat: "Ranked play", free: true, pro: true }
];

export const startFen =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const midGameFen =
  "r1bqk2r/pp1n1ppp/2pbpn2/3p4/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 7";
