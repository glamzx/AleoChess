"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type CityTrend = "up" | "down" | "flat";

export type CityLeaderboardEntry = {
  city_id: number;
  name: string;
  country_code: string;
  latitude: number | null;
  longitude: number | null;
  population: number | null;
  score: number;
  active_players: number;
  previous_score: number;
  rank: number;
  trend: CityTrend;
};

function trendFor(score: number, previous: number): CityTrend {
  if (score > previous) return "up";
  if (score < previous) return "down";
  return "flat";
}

function rankRows(rows: Array<Omit<CityLeaderboardEntry, "rank" | "trend">>) {
  return rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    trend: trendFor(row.score, row.previous_score),
  }));
}

export async function getTopCities(limit = 20) {
  const supabase = getSupabaseBrowserClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("city_leaderboard_weekly") as any)
    .select("city_id, name, country_code, latitude, longitude, population, score, active_players, previous_score")
    .order("score", { ascending: false })
    .order("active_players", { ascending: false })
    .order("population", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return rankRows((data ?? []) as Array<Omit<CityLeaderboardEntry, "rank" | "trend">>);
}

export async function getCityRank(cityId: number) {
  const supabase = getSupabaseBrowserClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("city_leaderboard_weekly") as any)
    .select("city_id, name, country_code, latitude, longitude, population, score, active_players, previous_score")
    .order("score", { ascending: false })
    .order("active_players", { ascending: false })
    .order("population", { ascending: false });

  if (error) throw error;
  return rankRows((data ?? []) as Array<Omit<CityLeaderboardEntry, "rank" | "trend">>).find((row) => row.city_id === cityId) ?? null;
}
