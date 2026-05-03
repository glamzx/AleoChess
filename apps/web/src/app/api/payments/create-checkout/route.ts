/**
 * POST /api/payments/create-checkout
 *
 * Creates a Stripe or YooKassa checkout session.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const STRIPE_PRODUCTS: Record<string, { amount: number; currency: string; mode: "subscription" | "payment" }> = {
  pro_monthly: { amount: 499, currency: "usd", mode: "subscription" },
  pro_annual: { amount: 3999, currency: "usd", mode: "subscription" },
  coin_100: { amount: 99, currency: "usd", mode: "payment" },
  coin_500: { amount: 499, currency: "usd", mode: "payment" },
  coin_1200: { amount: 999, currency: "usd", mode: "payment" },
  coin_2500: { amount: 1999, currency: "usd", mode: "payment" },
  coin_6500: { amount: 4999, currency: "usd", mode: "payment" },
  battle_pass: { amount: 999, currency: "usd", mode: "payment" },
};

const YOOKASSA_PRODUCTS: Record<string, { amount: string; currency: string }> = {
  pro_monthly: { amount: "449.00", currency: "RUB" },
  pro_annual: { amount: "3599.00", currency: "RUB" },
  coin_100: { amount: "89.00", currency: "RUB" },
  coin_500: { amount: "449.00", currency: "RUB" },
  coin_1200: { amount: "899.00", currency: "RUB" },
  coin_2500: { amount: "1799.00", currency: "RUB" },
  coin_6500: { amount: "4499.00", currency: "RUB" },
  battle_pass: { amount: "899.00", currency: "RUB" },
};

const COIN_AMOUNTS: Record<string, number> = {
  coin_100: 100, coin_500: 500, coin_1200: 1200, coin_2500: 2500, coin_6500: 6500,
};

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productType, coinAmount, provider } = body;

    const supabase = getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let productKey = productType;
    if (productType === "coin_pack" && coinAmount) {
      productKey = `coin_${coinAmount}`;
    }

    if (provider === "yookassa") {
      return await createYooKassaPayment(user.id, productKey, productType);
    } else {
      return await createStripeSession(user.id, productKey, productType);
    }
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}

async function createStripeSession(userId: string, productKey: string, productType: string) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe is not configured yet. Add STRIPE_SECRET_KEY to your environment." },
      { status: 503 }
    );
  }

  const product = STRIPE_PRODUCTS[productKey];
  if (!product) return NextResponse.json({ error: "Invalid product" }, { status: 400 });

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionParams: any = {
    payment_method_types: ["card"],
    mode: product.mode,
    success_url: `${APP_URL}/store?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/store?canceled=true`,
    client_reference_id: userId,
    metadata: { user_id: userId, product_type: productType, product_key: productKey, coins: COIN_AMOUNTS[productKey]?.toString() || "" },
    line_items: [{
      price_data: {
        currency: product.currency,
        unit_amount: product.amount,
        product_data: { name: productKey.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) },
        ...(product.mode === "subscription" ? { recurring: { interval: productKey.includes("annual") ? "year" : "month" } } : {}),
      },
      quantity: 1,
    }],
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  const db = getServiceClient();
  await db.from("payment_intents").insert({
    user_id: userId, provider: "stripe", provider_id: session.id,
    product_type: productType, product_meta: { product_key: productKey, coins: COIN_AMOUNTS[productKey] },
    amount_cents: product.amount, currency: product.currency, status: "pending", idempotency_key: session.id,
  });

  return NextResponse.json({ checkoutUrl: session.url, provider: "stripe", sessionId: session.id });
}

async function createYooKassaPayment(userId: string, productKey: string, productType: string) {
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    return NextResponse.json(
      { error: "YooKassa is not configured yet. Add YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY to your environment." },
      { status: 503 }
    );
  }

  const product = YOOKASSA_PRODUCTS[productKey];
  if (!product) return NextResponse.json({ error: "Invalid product" }, { status: 400 });

  const idempotencyKey = `${userId}-${productKey}-${Date.now()}`;
  const res = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotence-Key": idempotencyKey,
      Authorization: `Basic ${Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: { value: product.amount, currency: product.currency },
      confirmation: { type: "redirect", return_url: `${APP_URL}/store?success=true` },
      capture: true,
      description: productKey.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      metadata: { user_id: userId, product_type: productType, product_key: productKey, coins: COIN_AMOUNTS[productKey]?.toString() || "" },
    }),
  });

  if (!res.ok) {
    console.error("YooKassa error:", await res.text());
    return NextResponse.json({ error: "YooKassa payment failed" }, { status: 502 });
  }

  const payment = await res.json();
  const db = getServiceClient();
  await db.from("payment_intents").insert({
    user_id: userId, provider: "yookassa", provider_id: payment.id,
    product_type: productType, product_meta: { product_key: productKey, coins: COIN_AMOUNTS[productKey] },
    amount_cents: Math.round(parseFloat(product.amount) * 100), currency: "rub",
    status: "pending", idempotency_key: idempotencyKey,
  });

  return NextResponse.json({ checkoutUrl: payment.confirmation.confirmation_url, provider: "yookassa", sessionId: payment.id });
}
