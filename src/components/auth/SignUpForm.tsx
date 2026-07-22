"use client";

import { FormEvent, useState } from "react";
import { ArrowRightIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getStrength } from "@/lib/passwordHealth";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import styles from "./auth-shell.module.css";

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const strength = getStrength(password);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (website.trim()) {
      // Honeypot tripped - pretend success without calling Supabase.
      setSent(true);
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your sign-in password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The password confirmation does not match.");
      return;
    }

    setSubmitting(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/confirm-signup` },
    });
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className={styles.completion} aria-label="Check your email to confirm your account." aria-live="polite">
        <span className={styles.completionMark} aria-hidden="true">✓</span>
        <h2>Check your email.</h2>
        <p>We sent a confirmation link to {email || "your inbox"}. Follow it to finish creating your account.</p>
      </div>
    );
  }

  return (
    <form className={styles.formStack} onSubmit={submit} noValidate>
      <div className={styles.fieldGroup}>
        <label className={styles.field} htmlFor="sign-up-email">
          <span className={styles.fieldLabel}>Email</span>
          <input
            id="sign-up-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
            required
          />
        </label>
        <label className={styles.field} htmlFor="sign-up-password">
          <span className={styles.fieldLabel}>Password</span>
          <input
            id="sign-up-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
            required
          />
          {password && <PasswordStrengthMeter strength={strength} />}
        </label>
        <label className={styles.field} htmlFor="sign-up-password-confirm">
          <span className={styles.fieldLabel}>Confirm password</span>
          <input
            id="sign-up-password-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={submitting}
            required
          />
        </label>
      </div>

      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="sign-up-website">Website</label>
        <input
          id="sign-up-website"
          name="website"
          type="text"
          autoComplete="off"
          tabIndex={-1}
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      {error && <p className={styles.alert} role="alert">{error}</p>}

      <button className={styles.primaryAction} type="submit" disabled={submitting}>
        <span>{submitting ? "Creating account…" : "Sign up"}</span>
        <ArrowRightIcon width={17} height={17} aria-hidden="true" />
      </button>
      <p className={styles.securityNote}>Your vault master key is set separately, after your email is confirmed.</p>
    </form>
  );
}
