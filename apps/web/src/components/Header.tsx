"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { StreakFlame } from "./StreakFlame";
import { CoinBalance } from "./CoinBalance";
import { me } from "@/lib/mock";
import { useAuth } from "@/lib/auth/store";

export function Header() {
  const t = useTranslations("nav");
  const profile = useAuth((s) => s.profile);
  const name = profile?.display_name ?? profile?.username ?? me.name;

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
    >
      <div className="flex items-center gap-2">
        <StreakFlame count={profile?.streak_count ?? me.streak} />
        <CoinBalance amount={profile?.coin_balance ?? me.coins} size="sm" />
      </div>
      <div className="flex items-center gap-2">
        <button
          className="relative grid h-9 w-9 place-items-center rounded-full bg-white shadow-card transition active:scale-95"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-cobalt" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-lossRed" />
        </button>
        <Link
          href="/profile"
          className="grid h-9 w-9 place-items-center rounded-full bg-sky text-sm font-extrabold text-white shadow-chunky"
          aria-label={t("profile")}
        >
          {name.charAt(0).toUpperCase()}
        </Link>
      </div>
    </header>
  );
}
