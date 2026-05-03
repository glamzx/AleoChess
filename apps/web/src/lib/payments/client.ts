"use client";

/**
 * Payment client library.
 *
 * Handles checkout session creation via our API route,
 * auto-detects user country for Stripe vs YooKassa routing.
 */

// CIS countries that should use YooKassa
const YOOKASSA_COUNTRIES = ["RU", "KZ", "BY", "UA", "UZ", "KG", "TJ", "AM", "AZ", "GE", "MD"];

export type ProductType = "pro_monthly" | "pro_annual" | "coin_pack" | "battle_pass";

export interface CheckoutRequest {
  productType: ProductType;
  /** For coin packs: the coin amount (100, 500, 1200, 2500, 6500) */
  coinAmount?: number;
  /** Override provider (auto-detected if not set) */
  provider?: "stripe" | "yookassa";
}

export interface CheckoutResponse {
  checkoutUrl: string;
  provider: "stripe" | "yookassa";
  sessionId: string;
}

/**
 * Detect user's country from browser timezone/locale.
 * Falls back to "US" if unknown.
 */
export function detectUserCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Map common CIS timezones to country codes
    const tzMap: Record<string, string> = {
      "Asia/Almaty": "KZ",
      "Asia/Aqtau": "KZ",
      "Asia/Aqtobe": "KZ",
      "Asia/Atyrau": "KZ",
      "Asia/Oral": "KZ",
      "Asia/Qostanay": "KZ",
      "Asia/Qyzylorda": "KZ",
      "Europe/Moscow": "RU",
      "Asia/Yekaterinburg": "RU",
      "Asia/Novosibirsk": "RU",
      "Europe/Minsk": "BY",
      "Europe/Kiev": "UA",
      "Europe/Kyiv": "UA",
      "Asia/Tashkent": "UZ",
      "Asia/Bishkek": "KG",
      "Asia/Dushanbe": "TJ",
      "Asia/Yerevan": "AM",
      "Asia/Baku": "AZ",
      "Asia/Tbilisi": "GE",
      "Europe/Chisinau": "MD",
    };
    if (tzMap[tz]) return tzMap[tz];

    // Try navigator.language
    const lang = navigator.language || "";
    if (lang.startsWith("ru")) return "RU";
    if (lang.startsWith("kk")) return "KZ";
    if (lang.startsWith("uk")) return "UA";
    if (lang.startsWith("be")) return "BY";
  } catch {
    // Fallback
  }
  return "US";
}

/**
 * Determine which payment provider to use based on user country.
 */
export function getPaymentProvider(country?: string): "stripe" | "yookassa" {
  const c = country || detectUserCountry();
  return YOOKASSA_COUNTRIES.includes(c) ? "yookassa" : "stripe";
}

/**
 * Product pricing definitions.
 */
export const PRODUCTS = {
  pro_monthly: {
    name: "Pro Monthly",
    priceUsd: 499,       // cents
    priceRub: 44900,     // kopecks (₽449)
    interval: "month" as const,
  },
  pro_annual: {
    name: "Pro Annual",
    priceUsd: 3999,
    priceRub: 359900,    // ₽3,599
    interval: "year" as const,
    discount: "33%",
  },
  coin_100: { name: "100 Coins", priceUsd: 99, priceRub: 8900, coins: 100 },
  coin_500: { name: "500 Coins", priceUsd: 499, priceRub: 44900, coins: 500 },
  coin_1200: { name: "1,200 Coins", priceUsd: 999, priceRub: 89900, coins: 1200 },
  coin_2500: { name: "2,500 Coins", priceUsd: 1999, priceRub: 179900, coins: 2500 },
  coin_6500: { name: "6,500 Coins", priceUsd: 4999, priceRub: 449900, coins: 6500 },
  battle_pass: { name: "Battle Pass Premium", priceUsd: 999, priceRub: 89900 },
} as const;

/**
 * Create a checkout session.
 * In production, this calls our API route which creates a Stripe/YooKassa session.
 * For now, it returns a placeholder URL.
 */
export async function createCheckoutSession(req: CheckoutRequest): Promise<CheckoutResponse> {
  const provider = req.provider || getPaymentProvider();
  
  try {
    const res = await fetch("/api/payments/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productType: req.productType,
        coinAmount: req.coinAmount,
        provider,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Checkout failed" }));
      throw new Error(err.error || "Failed to create checkout session");
    }

    return await res.json();
  } catch (error) {
    // If API isn't set up yet, show a helpful message
    console.error("Checkout error:", error);
    throw new Error(
      provider === "yookassa"
        ? "YooKassa payments will be available soon. Please try again later."
        : "Stripe payments will be available soon. Please try again later."
    );
  }
}

/**
 * Open the customer portal for managing subscriptions.
 */
export async function openCustomerPortal(): Promise<void> {
  try {
    const res = await fetch("/api/payments/customer-portal", {
      method: "POST",
    });
    
    if (!res.ok) throw new Error("Failed to open portal");
    
    const { url } = await res.json();
    window.open(url, "_blank");
  } catch {
    // Fallback message
    alert("Subscription management will be available soon.");
  }
}
