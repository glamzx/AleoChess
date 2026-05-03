"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserRound } from "lucide-react";
import { OnboardingHeader } from "@/components/OnboardingShell";
import { ChunkyButton } from "@/components/ChunkyButton";
import { AleoMascot } from "@/components/AleoMascot";
import { bootstrapProfile } from "@/lib/auth/actions";
import { useAuth } from "@/lib/auth/store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AvatarStep() {
  const t = useTranslations("onboarding.avatar");
  const router = useRouter();
  const userId = useAuth((s) => s.user?.id ?? null);
  const profile = useAuth((s) => s.profile);
  const setProfile = useAuth((s) => s.setProfile);
  const [name, setName] = React.useState(profile?.display_name ?? "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (profile?.display_name && !name) setName(profile.display_name);
  }, [name, profile?.display_name]);

  async function handleContinue() {
    const displayName = name.trim();
    if (!displayName || !userId) return;

    setSaving(true);
    setError(null);

    const boot = await bootstrapProfile();
    if (!boot.ok) {
      setSaving(false);
      setError(boot.error);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const usernameBase = displayName.toLowerCase().replace(/[^a-z0-9_]+/g, "").slice(0, 18) || "player";
    const username = `${usernameBase}_${userId.slice(0, 4)}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: updateError } = await (supabase.from("profiles") as any)
      .update({ display_name: displayName, username })
      .eq("id", userId)
      .select("*")
      .single();

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setProfile(data);
    router.push("/onboarding/skill");
  }

  return (
    <>
      <OnboardingHeader step={2} total={3} back="/onboarding/city" />
      <div className="flex items-start gap-4">
        <AleoMascot mood="cheer" size={88} />
        <div className="flex-1 pt-2">
          <h1 className="text-2xl font-extrabold leading-tight text-navy">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm font-bold text-muted">{t("subtitle")}</p>
        </div>
      </div>

      <div className="mt-8 rounded-hero bg-white p-5 shadow-card">
        <label className="text-xs font-extrabold uppercase tracking-widest text-cobalt" htmlFor="displayName">
          {t("label")}
        </label>
        <div className="relative mt-3">
          <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cobalt" />
          <input
            id="displayName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("placeholder")}
            maxLength={24}
            autoFocus
            className="h-14 w-full rounded-card border-2 border-pale bg-white pl-12 pr-4 text-base font-extrabold text-navy placeholder:text-muted/70 focus:border-sky"
          />
        </div>
        <p className="mt-2 text-xs font-bold text-muted">
          {t("hint")}
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-card border-2 border-lossRed/30 bg-lossRed/5 p-3 text-center text-sm font-bold text-lossRed">
          {error}
        </div>
      )}

      <div className="mt-auto pt-8">
        <ChunkyButton
          block
          size="lg"
          pill
          loading={saving}
          disabled={saving || name.trim().length < 2}
          onClick={handleContinue}
        >
          {t("next")}
        </ChunkyButton>
      </div>
    </>
  );
}
