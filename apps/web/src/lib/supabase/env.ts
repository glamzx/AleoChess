/**
 * Centralized, validated Supabase environment loader.
 *
 * Throws fast and loud if required env vars are missing — no silent
 * "undefined client" errors at runtime.
 *
 * Accepts both `NEXT_PUBLIC_SUPABASE_ANON_KEY` (canonical) and
 * `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (newer Supabase dashboard naming).
 */

function readPublicAnonKey(): string {
  const v =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!v) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in env."
    );
  }
  return v;
}

function readUrl(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!v) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in env.");
  }
  return v;
}

export const SUPABASE_URL = readUrl();
export const SUPABASE_ANON_KEY = readPublicAnonKey();

export function getServiceRoleKey(): string {
  const v = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!v) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Required for admin operations."
    );
  }
  return v;
}

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
