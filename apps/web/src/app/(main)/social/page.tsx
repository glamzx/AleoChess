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

type Tab = "friends" | "cities" | "clans";

export default function SocialPage() {
  const t = useTranslations("social");
  const format = useFormatter();
  const [tab, setTab] = React.useState<Tab>("friends");
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Array<{ id: string; username: string; display_name: string | null; elo_rating: number }>>([]);
  const [cities, setCities] = React.useState<CityLeaderboardEntry[]>([]);
  const [citiesLoading, setCitiesLoading] = React.useState(false);
  const [citiesError, setCitiesError] = React.useState<string | null>(null);

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
    <div className="space-y-4 pt-2">
      <h1 className="text-3xl font-extrabold text-navy">{t("friends")}</h1>

      {/* sub-tabs */}
      <div className="rounded-card bg-pale p-1">
        <div className="grid grid-cols-3 gap-1">
          {(["friends", "cities", "clans"] as Tab[]).map((tb) => (
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
                online
                points={f.elo_rating}
                rightSlot={<ChunkyButton size="sm" variant="success" iconLeft={<Plus className="h-3 w-3" />}>{t("add")}</ChunkyButton>}
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

      {tab === "clans" && (
        <section className="space-y-3">
          <div className="rounded-hero bg-gradient-to-br from-cobalt to-sky p-5 text-white shadow-hero">
            <span className="rounded-chip bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest">
              {t("yourClan")}
            </span>
            <h3 className="mt-2 text-2xl font-extrabold">Steppe Knights</h3>
            <p className="text-xs font-bold text-white/80">
              {t("weeklyPoints", { members: format.number(142), points: format.number(28140) })}
            </p>
            <div className="mt-3 flex gap-2">
              <ChunkyButton size="sm" variant="pro">
                {t("clanWar")}
              </ChunkyButton>
              <ChunkyButton
                size="sm"
                variant="ghost"
                className="!bg-white/20 !text-white !shadow-[0_4px_0_0_rgba(0,0,0,0.2)]"
              >
                {t("invite")}
              </ChunkyButton>
            </div>
          </div>
          <h4 className="text-sm font-extrabold uppercase tracking-widest text-muted">
            {t("browseClans")}
          </h4>
          <div className="space-y-2">
            {clans
              .filter((c) => !c.mine)
              .map((c, i) => (
                <LeaderboardRow
                  key={c.name}
                  variant="clan"
                  rank={i + 2}
                  name={c.name}
                  subtitle={t("members", { count: format.number(c.members) })}
                  points={c.points}
                  trend="flat"
                  rightSlot={<ChunkyButton size="sm">{t("join")}</ChunkyButton>}
                />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
