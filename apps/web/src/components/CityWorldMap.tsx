"use client";

import * as React from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import type { CityLeaderboardEntry } from "@/lib/cities/leaderboard";
import { cn } from "@/lib/cn";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type Geo = { rsmKey: string };

type Props = {
  cities: CityLeaderboardEntry[];
};

export function CityWorldMap({ cities }: Props) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const topCities = cities.filter((city) => city.latitude !== null && city.longitude !== null).slice(0, 20);

  return (
    <div className="relative overflow-hidden rounded-hero bg-gradient-to-br from-pale to-white p-3 shadow-card">
      <p className="mb-1 text-center text-[10px] font-bold text-cobalt">
        Drag to move · Scroll to zoom
      </p>
      <ComposableMap projection="geoMercator" height={320} className="h-64 w-full">
        <ZoomableGroup center={[60, 45]} zoom={1.5} minZoom={1} maxZoom={8}>
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: Geo[] }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#B4DCFA"
                  stroke="#FFFFFF"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#8CC9F0", outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>
          {topCities.map((city) => {
            const active = hovered === city.city_id;
            return (
              <Marker key={city.city_id} coordinates={[city.longitude!, city.latitude!]}>
                <g
                  onMouseEnter={() => setHovered(city.city_id)}
                  onMouseLeave={() => setHovered(null)}
                  className="cursor-pointer"
                >
                  <circle r={active ? 6 : 4} fill={city.rank <= 3 ? "#FFC800" : "#2AB2FF"} stroke="#0A1F4A" strokeWidth={1} />
                  {active && (
                    <text y={-10} textAnchor="middle" fontSize={8} fontWeight={900} fill="#0A1F4A">
                      {city.name}
                    </text>
                  )}
                </g>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>
      <div className="mt-1 flex flex-wrap justify-center gap-1">
        {topCities.slice(0, 5).map((city) => (
          <button
            key={city.city_id}
            onMouseEnter={() => setHovered(city.city_id)}
            onMouseLeave={() => setHovered(null)}
            className={cn(
              "rounded-chip px-2 py-1 text-[10px] font-extrabold transition",
              hovered === city.city_id ? "bg-sky text-white" : "bg-white text-cobalt"
            )}
          >
            #{city.rank} {city.name}
          </button>
        ))}
      </div>
    </div>
  );
}
