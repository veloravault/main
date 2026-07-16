"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { supabase } from "@/lib/supabase";
import styles from "@/components/auth/auth-shell.module.css";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let active = true;
    const prepare = async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) await supabase.auth.exchangeCodeForSession(code);
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setReady(Boolean(data.session));
      if (!data.session) setError("This reset link is invalid or has expired. Request a new one from sign in.");
    };
    void prepare();
    return () => { active = false; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("The passwords do not match."); return; }
    setWorking(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setWorking(false);
    if (updateError) { setError(updateError.message); return; }
    setComplete(true);
  };

  return (
    <PublicPageShell>
      <AuthShell
        compact
        eyebrow="Account recovery"
        title={complete ? "Sign-in password updated" : "Reset sign-in password"}
        description={complete
          ? "Your account password was changed. Your vault master key was not changed."
          : "This changes only your Supabase sign-in password. You will still need your existing vault master key to decrypt your data."}
      >
        {complete ? (
          <Link href="/login" className={styles.actionLink}><span>Return to sign in</span><ArrowRightIcon width={17} height={17} aria-hidden="true" /></Link>
        ) : (
          <form onSubmit={submit} className={styles.formStack}>
            <div className={styles.fieldGroup}>
              <label className={styles.field} htmlFor="reset-password">
                <span className={styles.fieldLabel}>New sign-in password</span>
                <input id="reset-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" disabled={!ready || working} />
              </label>
              <label className={styles.field} htmlFor="reset-password-confirmation">
                <span className={styles.fieldLabel}>Confirm password</span>
                <input id="reset-password-confirmation" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" disabled={!ready || working} />
              </label>
            </div>
            {error && <p role="alert" className={styles.alert}>{error}</p>}
            <button type="submit" disabled={!ready || working} className={styles.primaryAction}>
              <span>{working ? "Updating password…" : "Update password"}</span>
              {working ? <Loader2Icon width={17} height={17} className="animate-spin" aria-hidden="true" /> : <ArrowRightIcon width={17} height={17} aria-hidden="true" />}
            </button>
            <div className={styles.secondaryActions}><Link href="/login" className={styles.secondaryAction}>Back to sign in</Link></div>
          </form>
        )}
      </AuthShell>
    </PublicPageShell>
  );
}
