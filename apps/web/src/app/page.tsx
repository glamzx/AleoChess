"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, UserRound, ArrowLeft, CheckCircle2 } from "lucide-react";
import { AleoMascot } from "@/components/AleoMascot";
import { ChunkyButton } from "@/components/ChunkyButton";
import {
  signInAnonymously,
  signInWithEmail,
  signInWithGoogle,
  getPostAuthRoute
} from "@/lib/auth/actions";
import { useAuth } from "@/lib/auth/store";

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5h-1.7V20H24v8h11.3c-1.7 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.5 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.3l-6.2-5.2C29.2 35.4 26.7 36 24 36c-5.3 0-9.6-3.4-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H24v8h11.3c-.8 2.3-2.4 4.3-4.5 5.5l6.2 5.2c-.4.4 6-4.4 6-13.7 0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}

type View = "buttons" | "email" | "email-sent";

function SplashPageContent() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);

  const [view, setView] = React.useState<View>("buttons");
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState<null | "google" | "email" | "guest">(null);
  const [error, setError] = React.useState<string | null>(
    searchParams.get("auth_error")
  );

  // If the auth listener hydrates with an existing session, jump past the
  // splash and into the right destination automatically.
  React.useEffect(() => {
    if (status !== "authenticated" && status !== "anonymous") return;
    if (!user) return;
    let cancelled = false;
    void getPostAuthRoute().then((route) => {
      if (!cancelled) router.replace(route);
    });
    return () => {
      cancelled = true;
    };
  }, [status, user, router]);

  async function handleGoogle() {
    setError(null);
    setPending("google");
    const res = await signInWithGoogle();
    if (!res.ok) {
      setError(res.error);
      setPending(null);
      return;
    }
    window.location.assign(res.data.url);
  }

  async function handleGuest() {
    setError(null);
    setPending("guest");
    const res = await signInAnonymously();
    if (!res.ok) {
      setError(res.error);
      setPending(null);
      return;
    }
    const route = await getPostAuthRoute();
    router.replace(route);
  }

  async function handleEmail(formData: FormData) {
    setError(null);
    setPending("email");
    const res = await signInWithEmail(formData);
    setPending(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setView("email-sent");
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-pale via-white to-pale px-6 pb-10 pt-16 text-center">
      <span className="pointer-events-none absolute -left-16 -top-10 h-48 w-48 rounded-full bg-sky/30 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-proGold/30 blur-3xl" />

      <div className="relative flex flex-col items-center gap-6">
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 14 }}
        >
          <AleoMascot
            mood={view === "email-sent" ? "wink" : "cheer"}
            size={view === "email-sent" ? 160 : 220}
          />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-4xl font-extrabold leading-tight text-navy"
        >
          {t("app.name")}
        </motion.h1>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="-mt-2 max-w-sm text-base font-bold text-cobalt"
        >
          {t("app.tagline")}
        </motion.p>
      </div>

      <div className="relative z-10 mt-10 flex w-full max-w-sm flex-col gap-3">
        <AnimatePresence mode="wait" initial={false}>
          {view === "buttons" && (
            <motion.div
              key="buttons"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
              <ChunkyButton
                block
                size="lg"
                pill
                iconLeft={<GoogleIcon />}
                onClick={handleGoogle}
                loading={pending === "google"}
                disabled={pending !== null}
                className="!bg-white !text-navy !shadow-[0_4px_0_0_#B4DCFA] hover:!bg-pale active:!shadow-[0_2px_0_0_#B4DCFA]"
              >
                {t("auth.google")}
              </ChunkyButton>
              <ChunkyButton
                block
                size="lg"
                pill
                iconLeft={<Mail className="h-5 w-5" />}
                onClick={() => setView("email")}
                disabled={pending !== null}
              >
                {t("auth.email")}
              </ChunkyButton>
              <ChunkyButton
                block
                size="lg"
                pill
                variant="ghost"
                iconLeft={<UserRound className="h-5 w-5" />}
                onClick={handleGuest}
                loading={pending === "guest"}
                disabled={pending !== null}
              >
                {t("auth.guest")}
              </ChunkyButton>
            </motion.div>
          )}

          {view === "email" && (
            <motion.form
              key="email"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
              action={handleEmail}
            >
              <input
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                className="h-14 w-full rounded-full border-2 border-pale bg-white px-5 text-center text-base font-extrabold text-navy placeholder:text-muted/70 focus:border-sky"
              />
              <ChunkyButton
                type="submit"
                block
                size="lg"
                pill
                loading={pending === "email"}
                disabled={pending !== null || email.length === 0}
              >
                {t("auth.sendMagic")}
              </ChunkyButton>
              <ChunkyButton
                type="button"
                size="sm"
                pill
                variant="ghost"
                iconLeft={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setView("buttons")}
              >
                {t("auth.back")}
              </ChunkyButton>
            </motion.form>
          )}

          {view === "email-sent" && (
            <motion.div
              key="email-sent"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="flex flex-col items-center gap-3 rounded-hero bg-white p-5 shadow-card"
            >
              <CheckCircle2 className="h-10 w-10 text-winGreen" />
              <h3 className="text-lg font-extrabold text-navy">Check your inbox!</h3>
              <p className="text-sm font-bold text-muted">
                We sent a magic link to <strong>{email}</strong>. Tap it on this
                device to finish signing in.
              </p>
              <ChunkyButton
                size="sm"
                pill
                variant="ghost"
                onClick={() => {
                  setView("buttons");
                  setEmail("");
                }}
              >
                Use another method
              </ChunkyButton>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="rounded-card bg-lossRed/10 px-3 py-2 text-xs font-extrabold text-lossRed">
            {error}
          </p>
        )}

        <p className="mt-2 px-4 text-xs font-bold text-muted">
          {t("auth.termsLine")}
        </p>
      </div>
    </main>
  );
}

function SplashFallback() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-pale via-white to-pale px-6 text-center">
      <span className="pointer-events-none absolute -left-16 -top-10 h-48 w-48 rounded-full bg-sky/30 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-proGold/30 blur-3xl" />
      <AleoMascot mood="cheer" size={180} />
    </main>
  );
}

export default function SplashPage() {
  return (
    <React.Suspense fallback={<SplashFallback />}>
      <SplashPageContent />
    </React.Suspense>
  );
}
