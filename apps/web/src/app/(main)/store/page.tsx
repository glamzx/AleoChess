"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Crown, Filter, Lock, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ChunkyButton } from "@/components/ChunkyButton";
import { BattlePassTrack } from "@/components/BattlePassTrack";
import { CoinIcon } from "@/components/CoinBalance";
import { LootCapsule } from "@/components/LootCapsule";
import { cn } from "@/lib/cn";
import { createCheckoutSession, getPaymentProvider } from "@/lib/payments/client";
import {
  equipItem,
  fallbackStorefront,
  fetchStorefront,
  grantDevPro,
  itemDescription,
  itemName,
  purchaseItem,
  rarityStyle,
  type ItemKind,
  type Rarity,
  type StoreItem,
  type Storefront
} from "@/lib/store";

type Tab = ItemKind | "battlePass" | "pro";
type OwnedFilter = "all" | "owned" | "locked";
type RarityFilter = "all" | Rarity;

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "board", label: "board" },
  { id: "pieces", label: "pieces" },
  { id: "background", label: "background" },
  { id: "effect", label: "effect" },
  { id: "flair", label: "flair" },
  { id: "battlePass", label: "battlePass" },
  { id: "pro", label: "pro" }
];

const proFeatures = [
  { feature: "coach", free: "threeDay", pro: "unlimited" },
  { feature: "lessons", free: "locked", pro: "included" },
  { feature: "grace", free: "none", pro: "twoMonth" },
  { feature: "items", free: "locked", pro: "included" },
  { feature: "bp", free: "optional", pro: "discount" }
];

function swatches(item: StoreItem) {
  const values = item.metadata?.swatch;
  return Array.isArray(values) && values.length >= 2
    ? values.map(String)
    : [rarityStyle[item.rarity].ring, rarityStyle[item.rarity].bg];
}

function StorePreview({ item }: { item: StoreItem }) {
  const colors = swatches(item);

  if (item.kind === "board") {
    return (
      <div className="grid h-28 w-full grid-cols-4 overflow-hidden rounded-card border-2 border-white/70">
        {Array.from({ length: 16 }, (_, i) => (
          <span key={i} style={{ background: colors[(i + Math.floor(i / 4)) % 2] }} />
        ))}
      </div>
    );
  }

  if (item.kind === "pieces") {
    return (
      <div className="flex h-28 items-center justify-center gap-3 rounded-card" style={{ background: `${colors[1]}15` }}>
        <span className="text-5xl drop-shadow-md" style={{ color: colors[0] }}>♞</span>
        <span className="text-5xl drop-shadow-md" style={{ color: colors[1] }}>♚</span>
      </div>
    );
  }

  if (item.kind === "background") {
    return (
      <div
        className="h-28 rounded-card border-2 border-white/70"
        style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
      />
    );
  }

  if (item.kind === "effect") {
    return (
      <div className="grid h-28 place-items-center rounded-card bg-pale">
        <Sparkles className="h-12 w-12" style={{ color: colors[1] }} />
      </div>
    );
  }

  return (
    <div className="grid h-28 place-items-center rounded-card bg-white">
      <span className="rounded-full px-4 py-2 text-sm font-extrabold text-white" style={{ background: colors[1] }}>
        {item.metadata?.label ? String(item.metadata.label) : itemName(item)}
      </span>
    </div>
  );
}

function StoreItemCard({
  item,
  pro,
  busy,
  onBuy,
  onEquip
}: {
  item: StoreItem;
  pro: boolean;
  busy: boolean;
  onBuy: (item: StoreItem) => void;
  onEquip: (item: StoreItem) => void;
}) {
  const t = useTranslations("store");
  const locale = useLocale();
  const rarity = rarityStyle[item.rarity];
  const eventLocked = item.metadata?.event_locked === true;
  const lockedByPro = item.pro_only && !pro;
  const purchasable = !item.owned && !eventLocked && !lockedByPro && (item.price_coins ?? 0) >= 0;

  return (
    <article className="relative overflow-hidden rounded-card bg-white p-3 shadow-card">
      <span
        className="absolute right-0 top-3 rounded-l-chip px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest"
        style={{ background: rarity.bg, color: rarity.fg }}
      >
        {item.rarity}
      </span>

      <StorePreview item={item} />

      <div className="mt-3 min-h-16">
        <h3 className="truncate text-sm font-extrabold text-navy">{itemName(item, locale)}</h3>
        <p className="mt-0.5 line-clamp-2 text-[11px] font-bold text-cobalt/70">
          {itemDescription(item, locale)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex min-h-8 items-center gap-1 tabnum text-sm font-extrabold text-navy">
          {item.price_coins === null ? (
            item.pro_only ? t("pro") : t("locked")
          ) : item.price_coins === 0 ? (
            t("free")
          ) : (
            <>
              <CoinIcon size={14} />
              {item.price_coins}
            </>
          )}
        </span>

        {item.equipped ? (
          <span className="inline-flex items-center gap-1 rounded-chip bg-winGreen/15 px-2 py-1 text-[10px] font-extrabold text-winGreen">
            <Check className="h-3 w-3" /> {t("equipped")}
          </span>
        ) : item.owned ? (
          <ChunkyButton size="sm" pill loading={busy} onClick={() => onEquip(item)}>
            {t("equip")}
          </ChunkyButton>
        ) : lockedByPro ? (
          <ChunkyButton size="sm" pill variant="pro" disabled>
            {t("proOnly")}
          </ChunkyButton>
        ) : eventLocked ? (
          <ChunkyButton size="sm" pill variant="muted" disabled iconLeft={<Lock className="h-3 w-3" />}>
            {t("event")}
          </ChunkyButton>
        ) : (
          <ChunkyButton size="sm" pill loading={busy} disabled={!purchasable} onClick={() => onBuy(item)}>
            {t("buy")}
          </ChunkyButton>
        )}
      </div>
    </article>
  );
}

export default function StorePage() {
  const t = useTranslations("store");
  const locale = useLocale();
  const [tab, setTab] = React.useState<Tab>("board");
  const [ownedFilter, setOwnedFilter] = React.useState<OwnedFilter>("all");
  const [rarityFilter, setRarityFilter] = React.useState<RarityFilter>("all");
  const [annual, setAnnual] = React.useState(true);
  const [store, setStore] = React.useState<Storefront>(fallbackStorefront());
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [openedReward, setOpenedReward] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  async function refresh() {
    const next = await fetchStorefront();
    if (next) setStore(next);
  }

  React.useEffect(() => {
    void refresh();
  }, []);

  const visibleItems = store.items.filter((item) => {
    if (tab === "battlePass" || tab === "pro") return false;
    if (item.kind !== tab) return false;
    if (ownedFilter === "owned" && !item.owned) return false;
    if (ownedFilter === "locked" && item.owned) return false;
    if (rarityFilter !== "all" && item.rarity !== rarityFilter) return false;
    return true;
  });

  async function handleBuy(item: StoreItem) {
    setBusyId(item.id);
    setNotice(null);
    const { error } = await purchaseItem(item.id);
    if (error) {
      setNotice(error.message);
    } else {
      setOpenedReward(itemName(item, locale));
      await refresh();
    }
    setBusyId(null);
  }

  async function handleEquip(item: StoreItem) {
    setBusyId(item.id);
    setNotice(null);
    const { error } = await equipItem(item.id, true);
    if (error) setNotice(error.message);
    await refresh();
    setBusyId(null);
  }

  async function handleDevGrant() {
    setNotice(null);
    const { error } = await grantDevPro(30);
    setNotice(error ? error.message : t("devGrant"));
    await refresh();
  }

  return (
    <div className="space-y-5 pt-2">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-navy">{t("title")}</h1>
          <p className="text-sm font-bold text-cobalt/70">{t("subtitle")}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-extrabold text-navy shadow-card">
          <CoinIcon size={18} />
          <span className="tabnum">{store.profile.coin_balance}</span>
        </span>
      </header>

      <div className="overflow-x-auto rounded-card bg-pale p-1 no-scrollbar">
        <div className="flex min-w-max gap-1">
          {tabs.map((next) => (
            <button
              key={next.id}
              onClick={() => setTab(next.id)}
              className={cn(
                "rounded-chip px-3 py-2 text-xs font-extrabold transition",
                tab === next.id ? "bg-white text-navy shadow-card" : "text-cobalt"
              )}
            >
              {t(`tabs.${next.label}`)}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className="rounded-card bg-white px-4 py-3 text-sm font-extrabold text-cobalt shadow-card">
          {notice}
        </div>
      )}

      {openedReward && (
        <div className="flex items-center justify-center rounded-card bg-white p-4 shadow-card">
          <LootCapsule reward={openedReward} rarity="Rare" onOpen={() => setOpenedReward(null)} />
        </div>
      )}

      {tab !== "battlePass" && tab !== "pro" && (
        <>
          <section className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-widest text-cobalt/70">
              <Filter className="h-3.5 w-3.5" /> {t("filters")}
            </span>
            {(["all", "owned", "locked"] as OwnedFilter[]).map((next) => (
              <button
                key={next}
                onClick={() => setOwnedFilter(next)}
                className={cn(
                  "rounded-chip px-3 py-1.5 text-xs font-extrabold",
                  ownedFilter === next ? "bg-sky text-white shadow-card" : "bg-white text-cobalt shadow-card"
                )}
              >
                {t(next)}
              </button>
            ))}
            {(["all", "common", "rare", "epic", "legendary", "mythic"] as RarityFilter[]).map((next) => (
              <button
                key={next}
                onClick={() => setRarityFilter(next)}
                className={cn(
                  "rounded-chip px-3 py-1.5 text-xs font-extrabold capitalize",
                  rarityFilter === next ? "bg-navy text-white shadow-card" : "bg-white text-cobalt shadow-card"
                )}
              >
                {next}
              </button>
            ))}
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {visibleItems.map((item) => (
              <StoreItemCard
                key={item.id}
                item={item}
                pro={store.profile.pro}
                busy={busyId === item.id}
                onBuy={handleBuy}
                onEquip={handleEquip}
              />
            ))}
          </section>
        </>
      )}

      {tab === "battlePass" && <BattlePassTrack />}

      {tab === "pro" && (
        <section className="space-y-4">
          <div className="overflow-hidden rounded-hero bg-navy p-6 text-white shadow-hero">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-proGold" />
              <span className="text-xs font-extrabold uppercase tracking-widest">Aleo Pro</span>
            </div>
              <h2 className="mt-2 text-3xl font-extrabold leading-tight">{t("proTitle")}</h2>
              <p className="mt-1 text-sm font-bold text-white/80">
                {t("proSubtitle")}
            </p>

            <div className="mt-4 inline-flex rounded-full bg-white/15 p-1">
              <button
                onClick={() => setAnnual(false)}
                className={cn("rounded-full px-4 py-1.5 text-sm font-extrabold", !annual ? "bg-white text-navy" : "text-white/85")}
              >
                $4.99/mo
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={cn("rounded-full px-4 py-1.5 text-sm font-extrabold", annual ? "bg-white text-navy" : "text-white/85")}
              >
                $39.99/yr
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <ChunkyButton
                variant="pro"
                size="lg"
                pill
                block
                onClick={async () => {
                  setNotice(null);
                  try {
                    const result = await createCheckoutSession({
                      productType: annual ? "pro_annual" : "pro_monthly",
                    });
                    window.location.href = result.checkoutUrl;
                  } catch (err: unknown) {
                    setNotice(err instanceof Error ? err.message : "Checkout failed");
                  }
                }}
              >
                {t("upgrade")} — {annual ? "$39.99/yr" : "$4.99/mo"}
              </ChunkyButton>
              <ChunkyButton variant="ghost" size="lg" pill block onClick={handleDevGrant}>
                {t("devGrantButton")}
              </ChunkyButton>
            </div>

            <p className="mt-3 text-center text-[10px] font-bold text-white/50">
              {annual
                ? "Billed annually at $39.99/year. Auto-renews unless canceled."
                : "Billed monthly at $4.99/month. Auto-renews unless canceled."}{" "}
              <Link href="/legal/terms" className="underline">Terms</Link> ·{" "}
              <Link href="/legal/privacy" className="underline">Privacy</Link>
            </p>
          </div>

          <div className="overflow-hidden rounded-hero bg-white shadow-card">
            <div className="grid grid-cols-[1fr_84px_84px] gap-2 px-4 py-3 text-xs font-extrabold uppercase tracking-widest text-cobalt/70">
              <span>{t("feature")}</span>
              <span className="text-center">{t("freePlan")}</span>
              <span className="text-center text-sparkle">{t("proPlan")}</span>
            </div>
            {proFeatures.map((feature, i) => (
              <div
                key={feature.feature}
                className={cn(
                  "grid grid-cols-[1fr_84px_84px] items-center gap-2 px-4 py-3 text-sm font-bold text-navy",
                  i % 2 === 0 && "bg-surfaceLight"
                )}
              >
                <span>{t(`features.${feature.feature}`)}</span>
                <span className="text-center text-xs font-extrabold text-cobalt/70">
                  {feature.free === "locked" ? t("locked") : t(`features.${feature.free}`)}
                </span>
                <span className="text-center text-xs font-extrabold text-sparkle">{t(`features.${feature.pro}`)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
