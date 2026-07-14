"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useVaultKey } from "@/components/auth/VaultKeyProvider";
import { getExpectedUserAuthorization } from "@/lib/authToken";
import { supabase } from "@/lib/supabase";
import styles from "@/app/onboarding/onboarding.module.css";

export function OnboardingForm({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const { setMasterKey } = useVaultKey();
  const [password, setPassword] = useState("");
  const [masterKey, setMasterKeyValue] = useState("");
  const [masterKeyConfirmation, setMasterKeyConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function completeOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Use at least 8 characters for your sign-in password.");
      return;
    }
    if (!masterKey) {
      setError("Enter your existing vault master key.");
      return;
    }
    if (masterKey !== masterKeyConfirmation) {
      setError("The master key confirmation does not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { userClient } = await getExpectedUserAuthorization(userId);
      const { error: passwordError } = await userClient.auth.updateUser({ password });
      if (passwordError) throw new Error(passwordError.message);

      const { data: scopedIdentity, error: scopedIdentityError } = await userClient.auth.getUser();
      if (scopedIdentityError || scopedIdentity.user?.id !== userId) {
        throw new Error("Your secure session changed. Sign in again to continue.");
      }

      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true, expectedUserId: userId }),
      });
      if (!response.ok) throw new Error("Your account could not be activated. Please try again.");

      const { data: liveIdentity, error: liveIdentityError } = await supabase.auth.getUser();
      if (liveIdentityError || liveIdentity.user?.id !== userId) {
        throw new Error("Your secure session changed. Sign in again to continue.");
      }
      if (!setMasterKey(masterKey, userId)) {
        throw new Error("Your secure session changed. Sign in again to continue.");
      }

      setPassword("");
      setMasterKeyValue("");
      setMasterKeyConfirmation("");
      router.replace("/vault");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Setup could not be completed. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={completeOnboarding} noValidate>
      <p className={styles.invitedEmail}>Invited as <strong>{email}</strong></p>
      <label className={styles.field} htmlFor="onboarding-password">
        <span>New sign-in password</span>
        <input
          id="onboarding-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={submitting}
          required
        />
        <small>Used only to sign in to your account.</small>
      </label>
      <label className={styles.field} htmlFor="onboarding-master-key">
        <span>Existing vault master key</span>
        <input
          id="onboarding-master-key"
          type="password"
          autoComplete="off"
          value={masterKey}
          onChange={(event) => setMasterKeyValue(event.target.value)}
          disabled={submitting}
          required
        />
        <small>Never sent, stored, logged, or added to your account.</small>
      </label>
      <label className={styles.field} htmlFor="onboarding-master-key-confirmation">
        <span>Confirm master key</span>
        <input
          id="onboarding-master-key-confirmation"
          type="password"
          autoComplete="off"
          value={masterKeyConfirmation}
          onChange={(event) => setMasterKeyConfirmation(event.target.value)}
          disabled={submitting}
          required
        />
      </label>
      {error && <p className={styles.formError} role="alert">{error}</p>}
      <button className={styles.primaryAction} type="submit" disabled={submitting}>
        <span>{submitting ? "Creating private access…" : "Create private access"}</span>
        <span aria-hidden="true">→</span>
      </button>
      <p className={styles.securityNote}>The master key leaves this form only for local, in-memory vault access.</p>
    </form>
  );
}
