/**
 * GET /auth/callback
 *
 * Endpoint hit by Supabase OAuth + email verification redirects. Exchanges the
 * `code` query param for a session, then redirects to the verification success
 * page or directly to /play.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { bootstrapProfile } from "@/lib/auth/actions";

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

  // Redirect to success page (unless a specific next URL was provided)
  const target = next ?? "/auth/verified";
  return NextResponse.redirect(`${origin}${target}`);
}
