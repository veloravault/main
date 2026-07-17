"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useVaultKey } from "@/components/auth/VaultKeyProvider";
import { supabase } from "@/lib/supabase";
import { getStrength, type StrengthLevel } from "@/lib/passwordHealth";
import { ArrowRightIcon } from "lucide-react";
import { PresetAvatar, type AvatarKind } from "@/components/PresetAvatar";
import { clearPlanIntentCookie, readPlanIntentCookie } from "@/lib/planIntent";
import styles from "@/components/auth/auth-shell.module.css";

const STRENGTH_COLOR_VAR: Record<StrengthLevel, string> = {
  weak: "var(--auth-red)",
  fair: "var(--auth-amber)",
  strong: "var(--auth-blue)",
  "very-strong": "var(--auth-green)",
};

type Step = "avatar" | "master-key";

export function OnboardingForm({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const { setMasterKey } = useVaultKey();
  const [step, setStep] = useState<Step>("avatar");
  const [avatarKind, setAvatarKind] = useState<AvatarKind | null>(null);
  const [masterKey, setMasterKeyValue] = useState("");
  const [masterKeyConfirmation, setMasterKeyConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const masterKeyStrength = useMemo(() => getStrength(masterKey), [masterKey]);

  async function completeOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!masterKey) {
      setError("Choose a vault master key.");
      return;
    }
    if (masterKeyStrength.level === "weak") {
      setError("Your master key is too weak. Use a longer key with a mix of letters, numbers, and symbols — it's the only thing protecting your vault.");
      return;
    }
    if (masterKey !== masterKeyConfirmation) {
      setError("The master key confirmation does not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: liveIdentity, error: liveIdentityError } = await supabase.auth.getUser();
      if (liveIdentityError || liveIdentity.user?.id !== userId) {
        throw new Error("Your secure session changed. Sign in again to continue.");
      }

      // Persist the avatar choice (skippable → initials fallback). Non-fatal.
      if (avatarKind) {
        const { error: metadataError } = await supabase.auth.updateUser({ data: { avatar_kind: avatarKind } });
        if (metadataError) console.error("Could not save avatar choice:", metadataError.message);
      }

      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true, expectedUserId: userId }),
      });
      if (!response.ok) throw new Error("Your account could not be activated. Please try again.");

      if (!setMasterKey(masterKey, userId)) {
        throw new Error("Your secure session changed. Sign in again to continue.");
      }

      setMasterKeyValue("");
      setMasterKeyConfirmation("");

      // If they picked a paid plan on the pricing page before signing up,
      // land straight in checkout instead of the plain dashboard.
      const intent = readPlanIntentCookie();
      clearPlanIntentCookie();
      router.replace(intent ? `/vault?upgrade=${intent.plan}&period=${intent.period}` : "/vault");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Setup could not be completed. Try again.");
      setSubmitting(false);
    }
  }

  if (step === "avatar") {
    return (
      <div className={styles.formStack}>
        <p className={styles.invitedEmail}>Signed up as <strong>{email}</strong></p>
        <div className={styles.avatarChoiceGrid}>
          {(["male", "female"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              className={styles.avatarChoice}
              aria-pressed={avatarKind === kind}
              onClick={() => setAvatarKind(kind)}
            >
              <span className={styles.avatarChoicePreview}><PresetAvatar kind={kind} /></span>
              {kind === "male" ? "Male" : "Female"}
            </button>
          ))}
        </div>
        <button
          className={styles.primaryAction}
          type="button"
          disabled={!avatarKind}
          onClick={() => setStep("master-key")}
        >
          <span>Continue</span>
          <ArrowRightIcon width={17} height={17} aria-hidden="true" />
        </button>
        <button type="button" className={styles.textLink} onClick={() => { setAvatarKind(null); setStep("master-key"); }}>
          Skip — use my initials instead
        </button>
      </div>
    );
  }

  return (
    <form className={styles.formStack} onSubmit={completeOnboarding} noValidate>
      <p className={styles.invitedEmail}>One last step — set your vault master key.</p>
      <div className={styles.fieldGroup}>
        <label className={styles.field} htmlFor="onboarding-master-key">
          <span className={styles.fieldLabel}>Vault master key</span>
          <input id="onboarding-master-key" type="password" autoComplete="off" value={masterKey} onChange={(event) => setMasterKeyValue(event.target.value)} disabled={submitting} required />
          <small className={styles.fieldHint}>Never sent, stored, logged, or added to your account.</small>
          {masterKey && (
            <div className={styles.strengthMeter} aria-live="polite">
              <span className={styles.strengthTrack}>
                <span
                  className={styles.strengthFill}
                  style={{ width: `${masterKeyStrength.score}%`, backgroundColor: STRENGTH_COLOR_VAR[masterKeyStrength.level] }}
                />
              </span>
              <span className={styles.strengthLabel} style={{ color: STRENGTH_COLOR_VAR[masterKeyStrength.level] }}>
                {masterKeyStrength.label}
              </span>
            </div>
          )}
        </label>
        <label className={styles.field} htmlFor="onboarding-master-key-confirmation">
          <span className={styles.fieldLabel}>Confirm master key</span>
          <input id="onboarding-master-key-confirmation" type="password" autoComplete="off" value={masterKeyConfirmation} onChange={(event) => setMasterKeyConfirmation(event.target.value)} disabled={submitting} required />
        </label>
      </div>
      {error && <p className={styles.alert} role="alert">{error}</p>}
      <button className={styles.primaryAction} type="submit" disabled={submitting}>
        <span>{submitting ? "Setting up your vault…" : "Set master key"}</span>
        <ArrowRightIcon width={17} height={17} aria-hidden="true" />
      </button>
      <button type="button" className={styles.textLink} onClick={() => setStep("avatar")} disabled={submitting}>
        Back
      </button>
      <p className={styles.securityNote}>The master key leaves this form only for local, in-memory vault access.</p>
    </form>
  );
}
