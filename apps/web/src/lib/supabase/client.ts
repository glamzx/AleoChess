"use client";

/**
 * Browser Supabase client.
 *
 * Use this from Client Components and Client-side hooks. Reads/writes auth
 * state via cookies that are kept in sync by the Next middleware
 * (`src/middleware.ts`).
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@aleo/shared/db-types";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  // Reuse the same instance across renders — Supabase keeps internal state
  // (auth subscriptions, realtime channels) we don't want to duplicate.
  if (_client) return _client;
  _client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}
