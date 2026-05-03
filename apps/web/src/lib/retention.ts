"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type Reward = {
  type: "coins" | "skin" | string;
  amount?: number;
  item_id?: string;
};

export type DailyQuest = {
  id: string;
  name: string;
  description: string;
  reward_coins: number;
  reward_xp: number;
  progress: number;
  target: number;
  completed_at: string | null;
};

export type BattlePassTier = {
  tier: number;
  xp_required: number;
  free_reward: Reward | null;
  premium_reward: Reward | null;
  free_claimed: boolean;
  premium_claimed: boolean;
};

export type RetentionSummary = {
  profile: {
    streak_count: number;
    longest_streak: number;
    coin_balance: number;
  };
  daily_quests: DailyQuest[];
  battlepass: {
    season: {
      id: number;
      name: string;
      starts_at: string;
      ends_at: string;
      is_premium_only_track: boolean;
    };
    user: {
      user_id: string;
      season_id: number;
      xp: number;
      premium: boolean;
      claimed_free_tiers: number[];
      claimed_premium_tiers: number[];
    };
    tiers: BattlePassTier[];
  };
};

export function fallbackRetentionSummary(): RetentionSummary {
  return {
    profile: { streak_count: 0, longest_streak: 0, coin_balance: 100 },
    daily_quests: [
      {
        id: "play_1_game",
        name: "Play 1 game",
        description: "Finish any game mode.",
        reward_coins: 20,
        reward_xp: 120,
        progress: 0,
        target: 1,
        completed_at: null
      },
      {
        id: "solve_5_puzzles",
        name: "Puzzle Sprint",
        description: "Solve five puzzles today.",
        reward_coins: 35,
        reward_xp: 180,
        progress: 0,
        target: 5,
        completed_at: null
      },
      {
        id: "play_1_ranked",
        name: "Enter Ranked",
        description: "Play one ranked game.",
        reward_coins: 25,
        reward_xp: 140,
        progress: 0,
        target: 1,
        completed_at: null
      }
    ],
    battlepass: {
      season: {
        id: 1,
        name: "Genesis Season",
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        is_premium_only_track: false
      },
      user: {
        user_id: "",
        season_id: 1,
        xp: 0,
        premium: false,
        claimed_free_tiers: [],
        claimed_premium_tiers: []
      },
      tiers: Array.from({ length: 50 }, (_, i) => {
        const tier = i + 1;
        return {
          tier,
          xp_required: tier * 1000,
          free_reward: { type: "coins", amount: 50 + tier * 5 },
          premium_reward: tier % 10 === 0
            ? { type: "skin", item_id: `board.royale_${tier}` }
            : { type: "coins", amount: 100 + tier * 10 },
          free_claimed: false,
          premium_claimed: false
        };
      })
    }
  };
}

export async function fetchRetentionSummary(): Promise<RetentionSummary | null> {
  const supabase = getSupabaseBrowserClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("get_retention_summary");
  if (error || !data) return null;
  return data as RetentionSummary;
}

export async function claimBattlePassTier(tier: number, track: "free" | "premium") {
  const supabase = getSupabaseBrowserClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.rpc as any)("claim_battlepass_tier", {
    p_tier: tier,
    p_track: track
  });
}

export async function recordPuzzleSolved(userId: string, puzzleId?: string) {
  const supabase = getSupabaseBrowserClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.rpc as any)("process_retention_event", {
    p_user_id: userId,
    p_event: {
      kind: "puzzle_solved",
      puzzle_id: puzzleId ?? "daily"
    }
  });
}

export function rewardLabel(reward: Reward | null): string {
  if (!reward) return "Reward";
  if (reward.type === "coins") return `${reward.amount ?? 0} coins`;
  if (reward.type === "skin") return String(reward.item_id ?? "Skin").replace(".", " ");
  return reward.type;
}

export function battlePassLevel(xp: number): { tier: number; xpIntoTier: number; xpToNext: number } {
  const tier = Math.min(50, Math.floor(xp / 1000) + 1);
  return {
    tier,
    xpIntoTier: xp % 1000,
    xpToNext: tier >= 50 ? 0 : 1000 - (xp % 1000)
  };
}
