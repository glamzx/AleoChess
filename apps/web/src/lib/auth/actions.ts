"use server";

/**
 * Auth Server Actions.
 *
 * - Email + password sign-up / sign-in
 * - Google OAuth (returns the URL the client should navigate to)
 * - Sign-out
 * - bootstrapProfile() — guarantees a profiles row exists for the current user
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/supabase/env";
import type { ProfileInsert } from "@aleo/shared";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// --------------------------------------------------------- Sign Up (email + password)
export async function signUpWithEmail(
  email: string,
  password: string,
  username: string
): Promise<ActionResult<{ userId: string; needsConfirmation: boolean }>> {
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email." };
  }
  if (!password || password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  // Clean username: remove @ prefix, lowercase, no spaces
  const cleanUsername = username.replace(/^@/, "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!cleanUsername || cleanUsername.length < 3) {
    return { ok: false, error: "Username must be at least 3 characters." };
  }

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback`,
      data: {
        preferred_username: cleanUsername,
        display_name: cleanUsername,
      }
    }
  });

  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "Sign-up failed. Try again." };

  // Check if email confirmation is required
  const needsConfirmation = !data.session;

  if (data.session) {
    // Auto-confirmed — create profile
    await bootstrapProfileWithUsername(data.user.id, cleanUsername, email);
    revalidatePath("/", "layout");
  }

  return { ok: true, data: { userId: data.user.id, needsConfirmation } };
}

// --------------------------------------------------------- Sign In (email + password)
export async function signInWithPassword(
  email: string,
  password: string
): Promise<ActionResult<{ userId: string }>> {
  if (!email) return { ok: false, error: "Please enter your email." };
  if (!password) return { ok: false, error: "Please enter your password." };

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "Sign-in failed." };

  await bootstrapProfile();
  revalidatePath("/", "layout");
  return { ok: true, data: { userId: data.user.id } };
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

// ----------------------------------------------------------------- sign-out
export async function signOut(): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

// ------------------------------------------------------- profile bootstrap
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
      (user.user_metadata?.display_name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ?? null
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("profiles") as any).insert(insert);
  if (error && error.code !== "23505" /* unique_violation */) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: { userId: user.id } };
}

async function bootstrapProfileWithUsername(userId: string, username: string, email: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existing) return;

  const insert: ProfileInsert = {
    id: userId,
    username,
    display_name: username,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("profiles") as any).insert(insert);
}

/**
 * Used by the splash → router code-path to decide where to send the user
 * after a successful sign-in. Always sends to /play.
 */
export async function getPostAuthRoute(): Promise<"/play"> {
  return "/play";
}
