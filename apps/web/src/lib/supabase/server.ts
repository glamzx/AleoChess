/**
 * Server Supabase client (SSR / Server Components / Route Handlers / Server Actions).
 *
 * Reads/writes auth cookies via `next/headers` so the user's session stays
 * in sync between server and browser via the middleware refresh.
 *
 * NEVER imported in a Client Component.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@aleo/shared/db-types";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

export function getSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // In Server Components Next forbids cookie writes; ignore the error.
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          /* readonly server component context */
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          /* readonly server component context */
        }
      }
    }
  });
}
