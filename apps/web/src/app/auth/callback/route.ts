/**
 * GET /auth/callback
 *
 * Endpoint hit by Supabase OAuth + email verification redirects.
 * Handles both:
 *   - `code` param (OAuth / PKCE flow)
 *   - `token_hash` + `type` params (email confirmation link)
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { bootstrapProfile } from "@/lib/auth/actions";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "signup" | "recovery" | "invite" | "email" | null;
  const next = searchParams.get("next");

  const supabase = getSupabaseServerClient();

  // Handle PKCE / OAuth code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/?auth_error=${encodeURIComponent(error.message)}`
      );
    }
    await bootstrapProfile();
  }

  // Handle email verification via token_hash (Supabase sends this in confirmation emails)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type === "signup" ? "signup" : type === "recovery" ? "recovery" : "email",
    });
    if (error) {
      return NextResponse.redirect(
        `${origin}/?auth_error=${encodeURIComponent(error.message)}`
      );
    }
    await bootstrapProfile();
  }

  // Redirect to verification success page
  const target = next ?? "/auth/verified";
  return NextResponse.redirect(`${origin}${target}`);
}
