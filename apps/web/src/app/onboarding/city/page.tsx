"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Loader2, SkipForward } from "lucide-react";
import { useTranslations } from "next-intl";
import { OnboardingHeader } from "@/components/OnboardingShell";
import { ChunkyButton } from "@/components/ChunkyButton";
import { AleoMascot } from "@/components/AleoMascot";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/store";
import type { City } from "@aleo/shared";

const FALLBACK_CITIES: City[] = [
  { id: 1, name: "Almaty", country_code: "KZ", latitude: 43.238, longitude: 76.945, population: 2000000, name_ru: "Алматы", name_kk: "Алматы" },
  { id: 2, name: "Astana", country_code: "KZ", latitude: 51.128, longitude: 71.430, population: 1200000, name_ru: "Астана", name_kk: "Астана" },
  { id: 3, name: "Tashkent", country_code: "UZ", latitude: 41.299, longitude: 69.240, population: 2500000, name_ru: "Ташкент", name_kk: "Ташкент" },
  { id: 4, name: "Moscow", country_code: "RU", latitude: 55.755, longitude: 37.617, population: 12000000, name_ru: "Москва", name_kk: "Мәскеу" },
  { id: 5, name: "Bishkek", country_code: "KG", latitude: 42.874, longitude: 74.589, population: 1000000, name_ru: "Бишкек", name_kk: "Бішкек" },
  { id: 6, name: "Saint Petersburg", country_code: "RU", latitude: 59.934, longitude: 30.335, population: 5400000, name_ru: "Санкт-Петербург", name_kk: "Санкт-Петербург" },
  { id: 7, name: "Shymkent", country_code: "KZ", latitude: 42.317, longitude: 69.596, population: 1100000, name_ru: "Шымкент", name_kk: "Шымкент" },
  { id: 8, name: "Karaganda", country_code: "KZ", latitude: 49.806, longitude: 73.109, population: 500000, name_ru: "Караганда", name_kk: "Қарағанды" },
];

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
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone && TIMEZONE_CITY_HINTS[timezone]) return TIMEZONE_CITY_HINTS[timezone];
    const region = new Intl.Locale(navigator.language).region;
    if (region === "KZ") return "Almaty";
    if (region === "UZ") return "Tashkent";
    if (region === "RU") return "Moscow";
    if (region === "KG") return "Bishkek";
  } catch { /* ignore */ }
  return "";
}

export default function CityStep() {
  const t = useTranslations("onboarding.city");
  const router = useRouter();
  const userId = useAuth((s) => s.user?.id ?? null);
  const setProfile = useAuth((s) => s.setProfile);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<City[]>([]);
  const [quickCities, setQuickCities] = React.useState<City[]>(FALLBACK_CITIES.filter(c => QUICK_CITY_NAMES.includes(c.name)));
  const [selected, setSelected] = React.useState<City | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const hint = browserCityHint();
    if (hint) setQuery(hint);
  }, []);

  // Try to load cities from DB, fall back to hardcoded list
  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase.from("cities") as any)
      .select("id, name, country_code, latitude, longitude, population, name_ru, name_kk")
      .in("name", QUICK_CITY_NAMES)
      .then(({ data }: { data: City[] | null }) => {
        if (data && data.length > 0) setQuickCities(data);
      });
  }, []);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const id = window.setTimeout(async () => {
      // Search from DB first
      const supabase = getSupabaseBrowserClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("cities") as any)
        .select("id, name, country_code, latitude, longitude, population, name_ru, name_kk")
        .or(`name.ilike.%${q}%,name_ru.ilike.%${q}%,name_kk.ilike.%${q}%`)
        .order("population", { ascending: false })
        .limit(8);

      if (data && data.length > 0) {
        setResults(data as City[]);
      } else {
        // Fallback: search from hardcoded list
        const lower = q.toLowerCase();
        setResults(FALLBACK_CITIES.filter(c =>
          c.name.toLowerCase().includes(lower) ||
          (c.name_ru && c.name_ru.toLowerCase().includes(lower))
        ));
      }
      setLoading(false);
    }, 250);

    return () => window.clearTimeout(id);
  }, [query]);

  async function saveCity(city?: City) {
    const cityToSave = city || selected;
    if (!cityToSave) return;

    setSaving(true);
    setError(null);
    setSelected(cityToSave);

    if (!userId) {
      // Not logged in — just proceed
      router.push("/onboarding/avatar");
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: updateError } = await (supabase.from("profiles") as any)
        .update({ city_id: cityToSave.id, country_code: cityToSave.country_code })
        .eq("id", userId)
        .select("*")
        .single();

      if (updateError) {
        // If the update fails (e.g. city_id FK doesn't exist), still proceed
        console.warn("City save error:", updateError.message);
      }

      if (data) setProfile(data);
    } catch (err) {
      console.warn("City save failed:", err);
    }

    setSaving(false);
    router.push("/onboarding/avatar");
  }

  function choose(city: City) {
    setSelected(city);
    setQuery(city.name);
    setResults([]);
    // Auto-save and proceed
    saveCity(city);
  }

  function skip() {
    router.push("/onboarding/avatar");
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
                disabled={saving}
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

      <div className="mt-auto flex flex-col gap-2 pt-8">
        <ChunkyButton block size="lg" pill disabled={!selected || saving} loading={saving} onClick={() => saveCity()}>
          {t("next")}
        </ChunkyButton>
        <ChunkyButton block size="sm" pill variant="ghost" onClick={skip} iconLeft={<SkipForward className="h-4 w-4" />}>
          Skip for now
        </ChunkyButton>
      </div>
    </>
  );
}

