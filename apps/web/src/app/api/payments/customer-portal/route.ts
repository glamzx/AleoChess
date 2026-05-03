/**
 * POST /api/payments/customer-portal
 * Creates a Stripe Customer Portal session.
 */

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST() {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${APP_URL}/profile`,
  });

  return NextResponse.json({ url: session.url });
}
