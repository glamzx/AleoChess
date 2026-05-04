"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, ArrowLeft, CheckCircle2, Eye, EyeOff, AtSign, Lock } from "lucide-react";
import { ChunkyButton } from "@/components/ChunkyButton";
import {
  signUpWithEmail,
  signInWithPassword,
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

type View = "buttons" | "signup" | "login" | "confirm-sent";

function SplashPageContent() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);

  const [view, setView] = React.useState<View>("buttons");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [pending, setPending] = React.useState<null | "google" | "email">(null);
  const [error, setError] = React.useState<string | null>(
    searchParams.get("auth_error")
  );

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

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending("email");
    const res = await signUpWithEmail(email, password, username);
    setPending(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.data.needsConfirmation) {
      setView("confirm-sent");
    } else {
      const route = await getPostAuthRoute();
      router.replace(route);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending("email");
    const res = await signInWithPassword(email, password);
    setPending(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const route = await getPostAuthRoute();
    router.replace(route);
  }

  const inputClass = "h-13 w-full rounded-2xl border-2 border-pale bg-white px-4 pl-11 text-sm font-bold text-navy placeholder:text-muted/60 focus:border-sky focus:outline-none transition-colors";

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-pale via-white to-pale px-6 pb-8 pt-12 text-center">
      <span className="pointer-events-none absolute -left-16 -top-10 h-48 w-48 rounded-full bg-sky/30 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-proGold/30 blur-3xl" />

      <div className="relative flex flex-col items-center gap-4">
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 14 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mascot/sleep.png"
            alt="Aleo mascot"
            className="h-40 w-40 object-contain drop-shadow-lg"
          />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-3xl font-extrabold leading-tight text-navy"
        >
          {t("app.name")}
        </motion.h1>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="-mt-2 max-w-sm text-sm font-bold text-cobalt"
        >
          {t("app.tagline")}
        </motion.p>
      </div>

      <div className="relative z-10 mt-6 flex w-full max-w-sm flex-col gap-3">
        <AnimatePresence mode="wait" initial={false}>
          {view === "buttons" && (
            <motion.div
              key="buttons"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3"
            >
              <ChunkyButton
                block
                size="lg"
                pill
                onClick={() => { setError(null); setView("signup"); }}
                iconLeft={<Mail className="h-5 w-5" />}
              >
                Create Account
              </ChunkyButton>
              <ChunkyButton
                block
                size="lg"
                pill
                variant="ghost"
                onClick={() => { setError(null); setView("login"); }}
                iconLeft={<Lock className="h-5 w-5" />}
              >
                Log In
              </ChunkyButton>
              <div className="relative my-1 flex items-center">
                <div className="flex-1 border-t-2 border-pale" />
                <span className="px-3 text-xs font-bold text-muted">or</span>
                <div className="flex-1 border-t-2 border-pale" />
              </div>
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
            </motion.div>
          )}

          {view === "signup" && (
            <motion.form
              key="signup"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3"
              onSubmit={handleSignUp}
            >
              <h2 className="text-lg font-extrabold text-navy">Create Account</h2>

              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cobalt" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                  placeholder="username (e.g. aleo)"
                  autoComplete="username"
                  required
                  minLength={3}
                  className={inputClass}
                />
              </div>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cobalt" />
                <input
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={inputClass}
                />
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cobalt" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (6+ chars)"
                  className={inputClass + " pr-11"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-navy"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <ChunkyButton
                type="submit"
                block
                size="lg"
                pill
                loading={pending === "email"}
                disabled={pending !== null || !email || !password || !username}
              >
                Sign Up
              </ChunkyButton>

              <ChunkyButton
                type="button"
                size="sm"
                pill
                variant="ghost"
                iconLeft={<ArrowLeft className="h-4 w-4" />}
                onClick={() => { setView("buttons"); setError(null); }}
              >
                Back
              </ChunkyButton>
            </motion.form>
          )}

          {view === "login" && (
            <motion.form
              key="login"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3"
              onSubmit={handleLogin}
            >
              <h2 className="text-lg font-extrabold text-navy">Log In</h2>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cobalt" />
                <input
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={inputClass}
                />
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cobalt" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className={inputClass + " pr-11"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-navy"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <ChunkyButton
                type="submit"
                block
                size="lg"
                pill
                loading={pending === "email"}
                disabled={pending !== null || !email || !password}
              >
                Log In
              </ChunkyButton>

              <p className="text-xs font-bold text-muted">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setView("signup"); setError(null); }}
                  className="font-extrabold text-sky underline"
                >
                  Sign Up
                </button>
              </p>

              <ChunkyButton
                type="button"
                size="sm"
                pill
                variant="ghost"
                iconLeft={<ArrowLeft className="h-4 w-4" />}
                onClick={() => { setView("buttons"); setError(null); }}
              >
                Back
              </ChunkyButton>
            </motion.form>
          )}

          {view === "confirm-sent" && (
            <motion.div
              key="confirm-sent"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="flex flex-col items-center gap-3 rounded-hero bg-white p-5 shadow-card"
            >
              <CheckCircle2 className="h-10 w-10 text-winGreen" />
              <h3 className="text-lg font-extrabold text-navy">Check your inbox!</h3>
              <p className="text-sm font-bold text-muted">
                We sent a confirmation email to <strong>{email}</strong>. 
                Click the link to verify your account, then come back and log in.
              </p>
              <ChunkyButton
                size="sm"
                pill
                onClick={() => {
                  setView("login");
                  setPassword("");
                }}
              >
                Go to Login
              </ChunkyButton>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="rounded-card bg-lossRed/10 px-3 py-2 text-xs font-extrabold text-lossRed">
            {error}
          </p>
        )}

        <p className="mt-1 px-4 text-[10px] font-bold text-muted">
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mascot/sleep.png" alt="Aleo" className="h-40 w-40 object-contain" />
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
