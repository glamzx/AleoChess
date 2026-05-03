"use client";

/**
 * Zustand auth store.
 *
 * Single source of truth for auth state on the client. Hydrated by
 * `<AuthProvider>` from `supabase.auth.onAuthStateChange`. Components
 * should read via `useAuth()` rather than calling Supabase directly.
 */

import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "@aleo/shared";

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "unauthenticated";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  status: AuthStatus;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  reset: () => void;
}

function deriveStatus(user: User | null): AuthStatus {
  if (!user) return "unauthenticated";
  // Supabase tags anonymous users with `is_anonymous: true`.
  // Old SDK builds expose it as `app_metadata.is_anonymous`; new ones
  // surface it as a top-level property. Cover both.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flagged = (user as any).is_anonymous === true ||
    user.app_metadata?.is_anonymous === true;
  return flagged ? "anonymous" : "authenticated";
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  status: "loading",
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      status: deriveStatus(session?.user ?? null)
    }),
  setProfile: (profile) => set({ profile }),
  reset: () =>
    set({
      user: null,
      session: null,
      profile: null,
      status: "unauthenticated"
    })
}));
