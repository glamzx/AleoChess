/**
 * POST /api/payments/webhook-yookassa
 *
 * Handles YooKassa webhook notifications.
 * Events: payment.succeeded, payment.canceled, refund.succeeded
 *
 * Required env: YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const event = body.event;
  const payment = body.object;

  if (!event || !payment) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    switch (event) {
      case "payment.succeeded":
        await handlePaymentSucceeded(payment);
        break;
      case "payment.canceled":
        await handlePaymentCanceled(payment);
        break;
      case "refund.succeeded":
        await handleRefund(payment);
        break;
      default:
        console.log(`Unhandled YooKassa event: ${event}`);
    }
  } catch (err) {
    console.error(`Error processing YooKassa ${event}:`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentSucceeded(payment: any) {
  const userId = payment.metadata?.user_id;
  if (!userId) return;

  const productType = payment.metadata?.product_type;
  const productKey = payment.metadata?.product_key;
  const coins = parseInt(payment.metadata?.coins || "0", 10);

  // Idempotency check
  const { data: existing } = await supabase
    .from("payment_intents")
    .select("status")
    .eq("provider_id", payment.id)
    .single();

  if (existing?.status === "succeeded") return;

  await supabase
    .from("payment_intents")
    .update({ status: "succeeded", updated_at: new Date().toISOString() })
    .eq("provider_id", payment.id);

  if (productType === "coin_pack" && coins > 0) {
    await supabase.rpc("credit_coins", {
      p_user_id: userId,
      p_amount: coins,
      p_reason: "shop_purchase",
    });
    await supabase.from("purchases").insert({
      user_id: userId,
      product_type: "coin_pack",
      product_meta: { coins, pack: productKey },
      amount_cents: Math.round(parseFloat(payment.amount.value) * 100),
      currency: "rub",
    });
  } else if (productType === "pro_monthly" || productType === "pro_annual") {
    const days = productType === "pro_annual" ? 365 : 30;
    const proUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from("profiles").update({
      pro_until: proUntil,
      yookassa_payer_id: payment.payment_method?.id || null,
    }).eq("id", userId);

    await supabase.from("subscriptions").upsert({
      user_id: userId,
      provider: "yookassa",
      provider_subscription_id: payment.id,
      plan: productType,
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: proUntil,
    });
  } else if (productType === "battle_pass") {
    await supabase.from("purchases").insert({
      user_id: userId,
      product_type: "battle_pass",
      product_meta: { season: "current" },
      amount_cents: Math.round(parseFloat(payment.amount.value) * 100),
      currency: "rub",
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentCanceled(payment: any) {
  await supabase
    .from("payment_intents")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("provider_id", payment.id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleRefund(refund: any) {
  const paymentId = refund.payment_id;
  if (!paymentId) return;

  await supabase
    .from("payment_intents")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("provider_id", paymentId);
}
