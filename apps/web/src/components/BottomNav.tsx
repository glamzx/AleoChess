"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Swords, Puzzle, GraduationCap, Users, User, Crown } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/play", label: "play", icon: Swords },
  { href: "/puzzles", label: "puzzles", icon: Puzzle },
  { href: "/learn", label: "learn", icon: GraduationCap },
  { href: "/social", label: "social", icon: Users },
  { href: "/profile", label: "profile", icon: User }
];

export function BottomNav() {
  const path = usePathname();
  const t = useTranslations("nav");
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-pale bg-white/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = path?.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-extrabold uppercase tracking-wider transition",
                  active ? "text-sky" : "text-muted hover:text-cobalt"
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6 transition-transform",
                    active && "scale-110"
                  )}
                  strokeWidth={2.5}
                />
                <span>{t(tab.label)}</span>
                {active && (
                  <span
                    className="absolute bottom-1 h-1 w-8 rounded-full bg-sky"
                    aria-hidden
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DesktopRail() {
  const path = usePathname();
  const t = useTranslations("nav");
  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-0 top-0 z-30 hidden w-64 flex-col gap-1 border-r-2 border-pale bg-white p-4 lg:flex"
    >
      <Link
        href="/play"
        className="mb-6 flex items-center gap-2 px-2 py-2"
      >
        <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-card bg-sky shadow-chunky">
          <img src="/mascot/logo.png" alt="Aleo" className="h-9 w-9 object-contain" />
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-xs font-extrabold uppercase tracking-widest text-muted">
            Aleo
          </span>
          <span className="text-lg font-extrabold text-navy">Chess Royale</span>
        </div>
      </Link>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = path?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-3 rounded-card px-3 py-3 text-sm font-extrabold transition",
              active
                ? "bg-pale text-cobalt shadow-card"
                : "text-cobalt/75 hover:bg-pale/60 hover:text-cobalt"
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2.5} />
            <span className="uppercase tracking-wider">{t(tab.label)}</span>
          </Link>
        );
      })}
      <Link
        href="/battle-pass"
        className={cn(
          "mt-4 flex items-center gap-3 rounded-card border-2 border-proGold/40 px-3 py-3 text-sm font-extrabold text-proGoldDark transition hover:bg-proGold/10",
          path?.startsWith("/battle-pass") && "bg-proGold/15"
        )}
      >
        <Crown className="h-5 w-5" strokeWidth={2.5} />
        <span className="uppercase tracking-wider">{t("battlePass")}</span>
      </Link>
      <Link
        href="/store"
        className={cn(
          "flex items-center gap-3 rounded-card border-2 border-proGold/40 px-3 py-3 text-sm font-extrabold text-proGoldDark transition hover:bg-proGold/10"
        )}
      >
        <span className="text-base">✨</span>
        <span className="uppercase tracking-wider">{t("store")}</span>
      </Link>
    </nav>
  );
}
