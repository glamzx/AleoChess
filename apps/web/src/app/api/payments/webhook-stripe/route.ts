/**
 * POST /api/payments/webhook-stripe
 *
 * Handles Stripe webhook events:
 *   - checkout.session.completed → credit coins or activate pro
 *   - customer.subscription.updated → update pro_until
 *   - customer.subscription.deleted → expire pro
 *
 * Required env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// Use service role for webhook processing (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCheckoutCompleted(session: any) {
  const userId = session.metadata?.user_id || session.client_reference_id;
  if (!userId) return;

  const productType = session.metadata?.product_type;
  const productKey = session.metadata?.product_key;
  const coins = parseInt(session.metadata?.coins || "0", 10);

  // Idempotency: check if already processed
  const { data: existing } = await supabase
    .from("payment_intents")
    .select("status")
    .eq("provider_id", session.id)
    .single();

  if (existing?.status === "succeeded") {
    console.log("Already processed:", session.id);
    return;
  }

  // Mark payment as succeeded
  await supabase
    .from("payment_intents")
    .update({ status: "succeeded", updated_at: new Date().toISOString() })
    .eq("provider_id", session.id);

  if (productType === "coin_pack" && coins > 0) {
    // Credit coins
    await supabase.rpc("credit_coins", {
      p_user_id: userId,
      p_amount: coins,
      p_reason: "shop_purchase",
    });

    await supabase.from("purchases").insert({
      user_id: userId,
      product_type: "coin_pack",
      product_meta: { coins, pack: productKey },
      amount_cents: session.amount_total || 0,
      currency: session.currency || "usd",
    });
  } else if (productType === "pro_monthly" || productType === "pro_annual") {
    // Activate pro subscription
    const days = productType === "pro_annual" ? 365 : 30;
    const proUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from("profiles")
      .update({
        pro_until: proUntil,
        stripe_customer_id: session.customer,
      })
      .eq("id", userId);

    await supabase.from("subscriptions").upsert({
      user_id: userId,
      provider: "stripe",
      provider_subscription_id: session.subscription,
      provider_customer_id: session.customer,
      plan: productType,
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: proUntil,
    });
  } else if (productType === "battle_pass") {
    // Activate battle pass premium
    await supabase.from("purchases").insert({
      user_id: userId,
      product_type: "battle_pass",
      product_meta: { season: "current" },
      amount_cents: session.amount_total || 0,
      currency: session.currency || "usd",
    });
    // If user_battlepass table exists
    await supabase
      .from("user_battlepass")
      .upsert({ user_id: userId, premium: true })
      .catch(() => {});
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionUpdated(subscription: any) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  const proUntil = new Date(subscription.current_period_end * 1000).toISOString();
  const cancelAtEnd = subscription.cancel_at_period_end;

  await supabase
    .from("profiles")
    .update({ pro_until: proUntil })
    .eq("id", userId);

  await supabase
    .from("subscriptions")
    .update({
      status: subscription.status === "active" ? "active" : "past_due",
      current_period_end: proUntil,
      cancel_at_period_end: cancelAtEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("provider_subscription_id", subscription.id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionDeleted(subscription: any) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  await supabase
    .from("subscriptions")
    .update({
      status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("provider_subscription_id", subscription.id);

  // Don't immediately remove pro - let it expire at period end
  // pro_until remains set from the last renewal
}
