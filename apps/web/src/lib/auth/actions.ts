"use server";

/**
 * Auth Server Actions.
 *
 * - Magic-link sign-in (email)
 * - Google OAuth (returns the URL the client should navigate to)
 * - Anonymous sign-in (server-side cookie write)
 * - Sign-out
 * - bootstrapProfile() — guarantees a profiles row exists for the current user
 *
 * Anything that mutates auth state lives here so cookies are written
 * authoritatively on the server.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/supabase/env";
import type { ProfileInsert } from "@aleo/shared";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ----------------------------------------------------------- magic link
export async function signInWithEmail(
  formData: FormData
): Promise<ActionResult<{ email: string }>> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email." };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback`,
      shouldCreateUser: true
    }
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { email } };
}

// --------------------------------------------------------- Google OAuth
export async function signInWithGoogle(): Promise<ActionResult<{ url: string }>> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${SITE_URL}/auth/callback`,
      queryParams: { access_type: "offline", prompt: "consent" }
    }
  });
  if (error || !data?.url) {
    return { ok: false, error: error?.message ?? "OAuth handshake failed." };
  }
  return { ok: true, data: { url: data.url } };
}

// -------------------------------------------------------------- anonymous
export async function signInAnonymously(): Promise<ActionResult<{ userId: string }>> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    return { ok: false, error: error?.message ?? "Anonymous sign-in failed." };
  }
  await bootstrapProfile();
  revalidatePath("/", "layout");
  return { ok: true, data: { userId: data.user.id } };
}

// ----------------------------------------------------------------- sign-out
export async function signOut(): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

// ------------------------------------------------------- profile bootstrap
/**
 * Idempotently ensures a `public.profiles` row exists for the authenticated
 * user. The DB trigger `on_auth_user_created` already covers the regular
 * signup path; this action is the safety net for:
 *   - anonymous → email upgrade
 *   - users who pre-existed before the trigger was deployed
 *   - any race where the row hasn't materialized yet
 */
export async function bootstrapProfile(): Promise<ActionResult<{ userId: string }>> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return { ok: true, data: { userId: user.id } };

  const insert: ProfileInsert = {
    id: user.id,
    username:
      (user.user_metadata?.preferred_username as string | undefined) ??
      `player_${user.id.slice(0, 8)}`,
    display_name:
      (user.user_metadata?.full_name as string | undefined) ?? null
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("profiles") as any).insert(insert);
  if (error && error.code !== "23505" /* unique_violation */) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: { userId: user.id } };
}

/**
 * Used by the splash → router code-path to decide where to send the user
 * after a successful sign-in.
 *
 * "Complete" = profile row exists AND has city_id set AND avatar_id set.
 */
export async function getPostAuthRoute(): Promise<"/play" | "/onboarding/city"> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return "/onboarding/city";

  const { data } = await supabase
    .from("profiles")
    .select("city_id, avatar_id")
    .eq("id", user.id)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!data || !(data as any).city_id || !(data as any).avatar_id) return "/onboarding/city";
  return "/play";
}
