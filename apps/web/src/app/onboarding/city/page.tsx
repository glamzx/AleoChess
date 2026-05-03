"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { OnboardingHeader } from "@/components/OnboardingShell";
import { ChunkyButton } from "@/components/ChunkyButton";
import { AleoMascot } from "@/components/AleoMascot";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/store";
import type { City } from "@aleo/shared";

const QUICK_CITY_NAMES = ["Almaty", "Astana", "Tashkent", "Moscow", "Bishkek", "Saint Petersburg"];
const TIMEZONE_CITY_HINTS: Record<string, string> = {
  "Asia/Almaty": "Almaty",
  "Asia/Aqtau": "Aktau",
  "Asia/Aqtobe": "Aktobe",
  "Asia/Atyrau": "Atyrau",
  "Asia/Oral": "Oral",
  "Asia/Qostanay": "Kostanay",
  "Asia/Qyzylorda": "Kyzylorda",
  "Asia/Tashkent": "Tashkent",
  "Europe/Moscow": "Moscow",
  "Asia/Bishkek": "Bishkek",
};

function browserCityHint() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timezone && TIMEZONE_CITY_HINTS[timezone]) return TIMEZONE_CITY_HINTS[timezone];
  const region = new Intl.Locale(navigator.language).region;
  if (region === "KZ") return "Almaty";
  if (region === "UZ") return "Tashkent";
  if (region === "RU") return "Moscow";
  if (region === "KG") return "Bishkek";
  return "";
}

export default function CityStep() {
  const t = useTranslations("onboarding.city");
  const router = useRouter();
  const userId = useAuth((s) => s.user?.id ?? null);
  const setProfile = useAuth((s) => s.setProfile);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<City[]>([]);
  const [quickCities, setQuickCities] = React.useState<City[]>([]);
  const [selected, setSelected] = React.useState<City | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const hint = browserCityHint();
    if (hint) setQuery(hint);
  }, []);

  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase.from("cities") as any)
      .select("id, name, country_code, latitude, longitude, population, name_ru, name_kk")
      .in("name", QUICK_CITY_NAMES)
      .then(({ data }: { data: City[] | null }) => setQuickCities(data ?? []));
  }, []);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const id = window.setTimeout(async () => {
      const supabase = getSupabaseBrowserClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("cities") as any)
        .select("id, name, country_code, latitude, longitude, population, name_ru, name_kk")
        .or(`name.ilike.%${q}%,name_ru.ilike.%${q}%,name_kk.ilike.%${q}%`)
        .order("population", { ascending: false })
        .limit(8);
      setResults((data ?? []) as City[]);
      setLoading(false);
    }, 250);

    return () => window.clearTimeout(id);
  }, [query]);

  async function saveCity() {
    if (!selected || !userId) return;
    setSaving(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: updateError } = await (supabase.from("profiles") as any)
      .update({ city_id: selected.id, country_code: selected.country_code })
      .eq("id", userId)
      .select("*")
      .single();

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setProfile(data);
    router.push("/onboarding/avatar");
  }

  function choose(city: City) {
    setSelected(city);
    setQuery(city.name);
    setResults([]);
  }

  return (
    <>
      <OnboardingHeader step={1} total={3} back="/" />
      <div className="flex items-start gap-4">
        <AleoMascot mood="thinking" size={88} />
        <div className="flex-1 pt-2">
          <h1 className="text-2xl font-extrabold leading-tight text-navy">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm font-bold text-muted">{t("subtitle")}</p>
        </div>
      </div>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cobalt" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          placeholder={t("placeholder")}
          className="h-14 w-full rounded-card border-2 border-pale bg-white pl-12 pr-11 text-base font-extrabold text-navy placeholder:text-muted/70 focus:border-sky"
        />
        {loading && <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-cobalt" />}
      </div>

      {results.length > 0 && (
        <ul className="mt-2 max-h-60 overflow-auto rounded-card border-2 border-pale bg-white p-1">
          {results.map((city) => (
            <li key={city.id}>
              <button
                onClick={() => choose(city)}
                className="flex w-full items-center gap-2 rounded-chip px-3 py-2 text-left font-bold text-navy hover:bg-pale"
              >
                <MapPin className="h-4 w-4 text-cobalt" />
                <span className="flex-1">{city.name}</span>
                <span className="text-xs font-extrabold text-muted">{city.country_code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted">
          {t("quickPick")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {quickCities.map((city) => {
            const active = selected?.id === city.id;
            return (
              <button
                key={city.id}
                onClick={() => choose(city)}
                className={
                  "rounded-full px-4 py-2 text-sm font-extrabold transition " +
                  (active
                    ? "bg-sky text-white shadow-chunkyPressed"
                    : "bg-white text-navy shadow-card hover:bg-pale")
                }
              >
                {city.name}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-card border-2 border-lossRed/30 bg-lossRed/5 p-3 text-center text-sm font-bold text-lossRed">
          {error}
        </div>
      )}

      <div className="mt-auto pt-8">
        <ChunkyButton block size="lg" pill disabled={!selected || saving} loading={saving} onClick={saveCity}>
          {t("next")}
        </ChunkyButton>
      </div>
    </>
  );
}
