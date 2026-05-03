export type EloResult = "1-0" | "0-1" | "1/2-1/2";

export interface EloUpdate {
  whiteBefore: number;
  blackBefore: number;
  whiteAfter: number;
  blackAfter: number;
  whiteDelta: number;
  blackDelta: number;
}

export function kFactor(rating: number): number {
  if (rating < 2100) return 32;
  if (rating < 2400) return 24;
  return 16;
}

export function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

export function scoreFromResult(result: EloResult): { white: number; black: number } {
  if (result === "1-0") return { white: 1, black: 0 };
  if (result === "0-1") return { white: 0, black: 1 };
  return { white: 0.5, black: 0.5 };
}

export function calculateEloUpdate(
  whiteRating: number,
  blackRating: number,
  result: EloResult
): EloUpdate {
  const score = scoreFromResult(result);
  const whiteExpected = expectedScore(whiteRating, blackRating);
  const blackExpected = expectedScore(blackRating, whiteRating);
  const whiteAfter = Math.round(whiteRating + kFactor(whiteRating) * (score.white - whiteExpected));
  const blackAfter = Math.round(blackRating + kFactor(blackRating) * (score.black - blackExpected));

  return {
    whiteBefore: whiteRating,
    blackBefore: blackRating,
    whiteAfter,
    blackAfter,
    whiteDelta: whiteAfter - whiteRating,
    blackDelta: blackAfter - blackRating
  };
}

export type RankTier =
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond"
  | "Master"
  | "Grandmaster";

export function rankTierFromElo(elo: number): RankTier {
  if (elo < 1200) return "Bronze";
  if (elo < 1400) return "Silver";
  if (elo < 1600) return "Gold";
  if (elo < 1800) return "Platinum";
  if (elo < 2000) return "Diamond";
  if (elo < 2200) return "Master";
  return "Grandmaster";
}
