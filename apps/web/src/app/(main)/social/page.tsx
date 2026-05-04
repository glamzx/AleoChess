"use client";

import * as React from "react";
import { Loader2, Swords, Plus, Search } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { ChunkyButton } from "@/components/ChunkyButton";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { CityCard, countryFlag } from "@/components/CityCard";
import { CityWorldMap } from "@/components/CityWorldMap";
import { friends, clans } from "@/lib/mock";
import { cn } from "@/lib/cn";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getTopCities, type CityLeaderboardEntry } from "@/lib/cities/leaderboard";

type Tab = "friends" | "cities";

export default function SocialPage() {
  const t = useTranslations("social");
  const format = useFormatter();
  const [tab, setTab] = React.useState<Tab>("friends");
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Array<{ id: string; username: string; display_name: string | null; elo_rating: number }>>([]);
  const [cities, setCities] = React.useState<CityLeaderboardEntry[]>([]);
  const [citiesLoading, setCitiesLoading] = React.useState(false);
  const [citiesError, setCitiesError] = React.useState<string | null>(null);
  const [sentIds, setSentIds] = React.useState<Set<string>>(new Set());
  const [toast, setToast] = React.useState<string | null>(null);

  function handleAddFriend(userId: string, name: string) {
    setSentIds((prev) => new Set(prev).add(userId));
    setToast(`Friend request sent to ${name}! ✓`);
    setTimeout(() => setToast(null), 3000);
  }

  React.useEffect(() => {
    const q = query.trim().replace(/^@/, "");
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const id = window.setTimeout(async () => {
      const supabase = getSupabaseBrowserClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("profiles") as any)
        .select("id, username, display_name, elo_rating")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(8);
      setResults(data ?? []);
    }, 250);
    return () => window.clearTimeout(id);
  }, [query]);

  React.useEffect(() => {
    if (tab !== "cities" || cities.length > 0 || citiesLoading) return;
    setCitiesLoading(true);
    setCitiesError(null);
    void getTopCities(20)
      .then(setCities)
      .catch((error) => setCitiesError(error instanceof Error ? error.message : "Failed to load cities"))
      .finally(() => setCitiesLoading(false));
  }, [cities.length, citiesLoading, tab]);

  return (
    <div className="relative space-y-4 pt-2">
      {/* Toast notification */}
      {toast && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 animate-bounce rounded-card bg-winGreen px-5 py-3 text-sm font-extrabold text-white shadow-hero">
          {toast}
        </div>
      )}
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot/friends.png" alt="Social" className="h-16 w-16 object-contain" />
        <h1 className="text-3xl font-extrabold text-navy">Social</h1>
      </div>

      {/* sub-tabs */}
      <div className="rounded-card bg-pale p-1">
        <div className="grid grid-cols-2 gap-1">
          {(["friends", "cities"] as Tab[]).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={cn(
                "rounded-chip px-3 py-2 text-sm font-extrabold capitalize transition",
                tab === tb ? "bg-white text-navy shadow-card" : "text-cobalt"
              )}
            >
              {t(tb)}
            </button>
          ))}
        </div>
      </div>

      {tab === "friends" && (
        <section className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cobalt" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                className="h-11 w-full rounded-card border-2 border-pale bg-white pl-9 pr-4 text-sm font-bold text-navy"
              />
            </div>
            <ChunkyButton size="md" variant="primary" iconLeft={<Plus className="h-4 w-4" />}>
              {t("add")}
            </ChunkyButton>
          </div>
          <div className="space-y-2">
            {results.map((f, i) => (
              <LeaderboardRow
                key={f.id}
                variant="friend"
                rank={i + 1}
                name={f.display_name ?? `@${f.username}`}
                subtitle={`@${f.username}`}
                rankBadge="Silver"
                points={f.elo_rating}
                rightSlot={
                  sentIds.has(f.id) ? (
                    <span className="rounded-chip bg-winGreen/15 px-3 py-1.5 text-xs font-extrabold text-winGreen">Sent ✓</span>
                  ) : (
                    <ChunkyButton size="sm" variant="success" iconLeft={<Plus className="h-3 w-3" />} onClick={() => handleAddFriend(f.id, f.display_name ?? f.username)}>{t("add")}</ChunkyButton>
                  )
                }
              />
            ))}
            {results.length === 0 && friends.map((f, i) => (
              <LeaderboardRow
                key={f.name}
                variant="friend"
                rank={i + 1}
                name={f.name}
                subtitle={f.online ? t("onlineReady") : t("offline")}
                rankBadge={f.rank}
                online={f.online}
                points={f.elo}
                rightSlot={
                  f.online ? (
                    <ChunkyButton
                      size="sm"
                      variant="success"
                      iconLeft={<Swords className="h-3 w-3" />}
                    >
                      {t("challenge")}
                    </ChunkyButton>
                  ) : null
                }
              />
            ))}
          </div>
        </section>
      )}

      {tab === "cities" && (
        <section className="space-y-3">
          {citiesLoading && (
            <div className="flex items-center justify-center gap-2 rounded-card bg-white p-6 text-sm font-extrabold text-cobalt shadow-card">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("loadingCities")}
            </div>
          )}

          {citiesError && (
            <div className="rounded-card border-2 border-lossRed/30 bg-lossRed/5 p-4 text-sm font-bold text-lossRed">
              {citiesError}
            </div>
          )}

          {cities.length > 0 && (
            <>
              <CityWorldMap cities={cities} />
              <CityCard city={cities[0]!.name} country={cities[0]!.country_code} rank={cities[0]!.rank} trend={cities[0]!.trend} highlight />

              <div className="space-y-2">
                {cities.map((city) => (
                  <LeaderboardRow
                    key={city.city_id}
                    variant="city"
                    rank={city.rank}
                    name={city.name}
                    subtitle={t("activeWeekly", { count: format.number(city.active_players) })}
                    flag={countryFlag(city.country_code)}
                    points={city.score}
                    trend={city.trend}
                    highlighted={city.rank <= 3}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
