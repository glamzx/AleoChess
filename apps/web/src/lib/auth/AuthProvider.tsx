"use client";

import * as React from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "./store";

/**
 * Mounts once at the root layout. Hydrates the Zustand auth store from the
 * current Supabase session, then keeps it in sync via
 * `supabase.auth.onAuthStateChange`. Also fetches the user's `profiles` row
 * whenever the user identity changes.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuth((s) => s.setSession);
  const setProfile = useAuth((s) => s.setProfile);
  const userId = useAuth((s) => s.user?.id ?? null);
  const userMeta = useAuth((s) => s.user?.user_metadata ?? null);

  // 1. Initial session + subscription
  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [setSession]);

  // 2. Fetch profile when the user changes — create from metadata if missing
  React.useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        setProfile(data);
      } else if (userMeta) {
        // Profile doesn't exist yet — create from user metadata
        const username = (userMeta.preferred_username as string) || "player";
        const displayName = (userMeta.display_name as string) || username;
        const insert = { id: userId, username, display_name: displayName };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("profiles") as any).insert(insert);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProfile(insert as any);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, userMeta, setProfile]);

  return <>{children}</>;
}

