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

  // 2. Fetch profile when the user changes
  React.useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    void supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile(data ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, setProfile]);

  return <>{children}</>;
}
