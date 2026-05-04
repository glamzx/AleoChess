"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { BoardTheme } from "@/components/ChessboardWrapper";

export type ItemKind = "board" | "pieces" | "background" | "effect" | "flair";
export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export type StoreItem = {
  id: string;
  kind: ItemKind;
  name: Record<string, string>;
  description: Record<string, string> | null;
  rarity: Rarity;
  price_coins: number | null;
  price_usd_cents: number | null;
  pro_only: boolean;
  metadata: Record<string, unknown> | null;
  owned: boolean;
  equipped: boolean;
  acquired_at: string | null;
};

export type Storefront = {
  profile: {
    coin_balance: number;
    pro: boolean;
    pro_until: string | null;
  };
  items: StoreItem[];
  inventory: Array<{
    item_id: string;
    equipped: boolean;
    kind: ItemKind;
    metadata: Record<string, unknown> | null;
  }>;
};

export const rarityStyle: Record<Rarity, { bg: string; fg: string; ring: string }> = {
  common: { bg: "#B7C2D6", fg: "#253044", ring: "#E2E8F0" },
  rare: { bg: "#2AB2FF", fg: "#FFFFFF", ring: "#BAE6FD" },
  epic: { bg: "#A86BFF", fg: "#FFFFFF", ring: "#DDD6FE" },
  legendary: { bg: "#FFD23F", fg: "#5C3D00", ring: "#FDE68A" },
  mythic: { bg: "#FF4B4B", fg: "#FFFFFF", ring: "#FECACA" }
};

const fallbackItems: StoreItem[] = [
  // Boards
  item("board.default", "board", "Classic Ocean", "common", 0, { board_theme: "ocean", swatch: ["#EAF4FF", "#6CB7FF"] }, true, true),
  item("board.lagoon", "board", "Blue Lagoon", "rare", 200, { board_theme: "ocean", swatch: ["#DFF6FF", "#2AA7F7"] }),
  item("board.sunset", "board", "Steppe Sunset", "rare", 200, { board_theme: "steppe", swatch: ["#FFF0D2", "#F59E42"] }),
  item("board.forest", "board", "Emerald Forest", "rare", 250, { board_theme: "ocean", swatch: ["#E8F5E9", "#43A047"] }),
  item("board.cherry", "board", "Cherry Blossom", "epic", 450, { board_theme: "steppe", swatch: ["#FFF0F5", "#E91E63"] }),
  item("board.cyber", "board", "Cyber Board", "epic", 500, { board_theme: "noir", swatch: ["#D9F99D", "#111827"] }),
  item("board.midnight", "board", "Midnight Purple", "epic", 600, { board_theme: "noir", swatch: ["#1A1040", "#7C3AED"] }),
  item("board.gold", "board", "Royal Gold", "legendary", 1500, { board_theme: "steppe", swatch: ["#FFF7C2", "#D4AF37"] }),
  item("board.diamond", "board", "Diamond Ice", "mythic", null, { board_theme: "ocean", swatch: ["#E0F7FA", "#00BCD4"] }, false, false, true),
  // Pieces — color variants
  item("pieces.default", "pieces", "Classic White & Black", "common", 0, { piece_theme: "cartoon", swatch: ["#FFFFFF", "#253044"], piece_emoji: "♞" }, true, true),
  item("pieces.ocean", "pieces", "Ocean Blue", "rare", 200, { piece_theme: "cartoon", swatch: ["#2AA7F7", "#1565C0"], piece_emoji: "♞" }),
  item("pieces.emerald", "pieces", "Emerald Green", "rare", 200, { piece_theme: "cartoon", swatch: ["#43A047", "#1B5E20"], piece_emoji: "♞" }),
  item("pieces.ruby", "pieces", "Ruby Red", "rare", 250, { piece_theme: "cartoon", swatch: ["#EF5350", "#B71C1C"], piece_emoji: "♞" }),
  item("pieces.neon", "pieces", "Neon Glow", "epic", 400, { piece_theme: "cartoon", swatch: ["#39FF14", "#111827"], piece_emoji: "♞" }),
  item("pieces.crystal", "pieces", "Crystal Ice", "epic", 500, { piece_theme: "cartoon", swatch: ["#00BCD4", "#E0F7FA"], piece_emoji: "♞" }),
  item("pieces.obsidian", "pieces", "Obsidian Shadow", "epic", 600, { piece_theme: "cartoon", swatch: ["#37474F", "#000000"], piece_emoji: "♞" }),
  item("pieces.sunset", "pieces", "Sunset Orange", "rare", 300, { piece_theme: "cartoon", swatch: ["#FF9800", "#E65100"], piece_emoji: "♞" }),
  item("pieces.pink", "pieces", "Bubblegum Pink", "rare", 250, { piece_theme: "cartoon", swatch: ["#F48FB1", "#AD1457"], piece_emoji: "♞" }),
  item("pieces.celestial", "pieces", "Celestial Gold", "legendary", 1200, { piece_theme: "cartoon", swatch: ["#FFD700", "#B8860B"], piece_emoji: "♞" }),
  item("pieces.dragon", "pieces", "Dragon Forge", "mythic", null, { piece_theme: "cartoon", swatch: ["#FF4B4B", "#8B0000"], piece_emoji: "♞" }, false, false, true),
  // Backgrounds
  item("background.sky", "background", "Sky Room", "common", 80, { gradient: ["#F0F9FF", "#FFFFFF"] }),
  item("background.aurora", "background", "Aurora Borealis", "epic", 400, { gradient: ["#0F2027", "#2C5364"] }),
  item("background.cosmos", "background", "Deep Cosmos", "legendary", 800, { gradient: ["#0D0221", "#3D1A78"] }),
  // Effects
  item("effect.explosion", "effect", "Tiny Explosion", "epic", 400, { effect: "explosion" }),
  item("effect.sparkle", "effect", "Sparkle Trail", "rare", 200, { effect: "sparkle" }),
  item("effect.fire", "effect", "Fire Capture", "legendary", 800, { effect: "fire" }),
  // Flairs
  item("flair.tactician", "flair", "Tactician", "rare", 150, { label: "Tactician" }),
  item("flair.strategist", "flair", "Strategist", "epic", 350, { label: "Strategist" }),
  item("flair.grandmaster", "flair", "Grandmaster", "legendary", 1000, { label: "Grandmaster" })
];

function item(
  id: string,
  kind: ItemKind,
  name: string,
  rarity: Rarity,
  price: number | null,
  metadata: Record<string, unknown>,
  owned = false,
  equipped = false,
  proOnly = false
): StoreItem {
  return {
    id,
    kind,
    name: { en: name, ru: name, kk: name },
    description: { en: name },
    rarity,
    price_coins: price,
    price_usd_cents: proOnly ? 999 : null,
    pro_only: proOnly,
    metadata,
    owned,
    equipped,
    acquired_at: owned ? new Date().toISOString() : null
  };
}

export function fallbackStorefront(): Storefront {
  return {
    profile: { coin_balance: 0, pro: false, pro_until: null },
    items: fallbackItems,
    inventory: fallbackItems
      .filter((next) => next.owned)
      .map((next) => ({
        item_id: next.id,
        kind: next.kind,
        equipped: next.equipped,
        metadata: next.metadata
      }))
  };
}

export async function fetchStorefront(): Promise<Storefront | null> {
  const supabase = getSupabaseBrowserClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("get_storefront");
  if (error || !data) return null;
  return data as Storefront;
}

export async function purchaseItem(itemId: string) {
  const supabase = getSupabaseBrowserClient();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (supabase.rpc as any)("purchase_item", { p_item_id: itemId });
    if (result.error) {
      const msg = result.error.message || "";
      // Friendly error messages
      if (msg.includes("insufficient") || msg.includes("not enough") || msg.includes("balance")) {
        return { data: null, error: { message: "Insufficient coins! Earn more by completing quests or purchase coins from the store." } };
      }
      if (msg.includes("could not find the function") || msg.includes("purchase_item")) {
        return { data: null, error: { message: "Insufficient coins to purchase this item." } };
      }
      return { data: null, error: { message: msg } };
    }
    return result;
  } catch {
    return { data: null, error: { message: "Insufficient coins to purchase this item." } };
  }
}

export async function equipItem(itemId: string, equipped = true) {
  const supabase = getSupabaseBrowserClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.rpc as any)("equip_item", { p_item_id: itemId, p_equipped: equipped });
}

export async function grantDevPro(days = 30) {
  const supabase = getSupabaseBrowserClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.rpc as any)("dev_grant_pro", { p_days: days });
}

export async function fetchEquippedBoardTheme(): Promise<BoardTheme> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "ocean";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("user_inventory") as any)
    .select("equipped, items!inner(kind, metadata)")
    .eq("user_id", user.id)
    .eq("equipped", true)
    .eq("items.kind", "board")
    .maybeSingle();

  const theme = data?.items?.metadata?.board_theme;
  return isBoardTheme(theme) ? theme : "ocean";
}

export function isBoardTheme(value: unknown): value is BoardTheme {
  return value === "ocean" || value === "steppe" || value === "candy" || value === "noir";
}

export function itemName(item: StoreItem, locale = "en") {
  return item.name[locale] ?? item.name.en ?? item.id;
}

export function itemDescription(item: StoreItem, locale = "en") {
  return item.description?.[locale] ?? item.description?.en ?? "";
}
