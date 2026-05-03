import "server-only";

/**
 * Admin (service-role) Supabase client.
 *
 * - SERVER-ONLY. The `import "server-only"` directive above causes Next to
 *   refuse the build if anything in a Client Component tries to import this.
 * - Bypasses RLS — only use for back-office operations, scheduled jobs,
 *   trusted server actions that have already authorized the caller.
 * - The service-role key is read lazily so the rest of the app can boot
 *   without it being set.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@aleo/shared/db-types";
import { SUPABASE_URL, getServiceRoleKey } from "./env";

let _admin: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdminClient() {
  if (_admin) return _admin;
  _admin = createClient<Database>(SUPABASE_URL, getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
  return _admin;
}
