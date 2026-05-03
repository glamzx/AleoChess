/**
 * GET /auth/callback
 *
 * Endpoint hit by Supabase OAuth + magic-link redirects. Exchanges the
 * `code` query param for a session (which sets the auth cookies via the
 * SSR client), then redirects to `/onboarding/city` or `/play` depending
 * on whether the user has finished onboarding.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { bootstrapProfile, getPostAuthRoute } from "@/lib/auth/actions";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/?auth_error=${encodeURIComponent(error.message)}`
      );
    }
    await bootstrapProfile();
  }

  const target = next ?? (await getPostAuthRoute());
  return NextResponse.redirect(`${origin}${target}`);
}
