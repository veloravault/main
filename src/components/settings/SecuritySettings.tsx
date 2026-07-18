"use client";

import { useEffect, useState } from "react";
import { CheckIcon, FingerprintIcon, LaptopIcon, Loader2Icon, LockIcon, LogOutIcon, TimerResetIcon, ClipboardIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { disableBiometrics, enableBiometrics, hasBiometricsEnabled, isBiometricsSupported } from "@/lib/biometrics";
import { loadVaultPreferences, saveVaultPreferences, subscribeVaultPreferences, type AutoLockMinutes, type ClipboardClearSeconds, type VaultPreferences } from "@/lib/vaultPreferences";
import { useToast } from "@/components/Toast";
import { useVaultKey } from "@/components/auth/VaultKeyProvider";

const AUTO_LOCK: Array<{ value: AutoLockMinutes; label: string }> = [
  { value: 0, label: "Immediately" }, { value: 1, label: "1 minute" }, { value: 5, label: "5 minutes" }, { value: 15, label: "15 minutes" }, { value: 30, label: "30 minutes" },
];
const CLIPBOARD: Array<{ value: ClipboardClearSeconds; label: string }> = [
  { value: 0, label: "Never" }, { value: 15, label: "15 seconds" }, { value: 30, label: "30 seconds" }, { value: 60, label: "60 seconds" },
];

function currentDeviceLabel() {
  if (typeof navigator === "undefined") return "This browser";
  const ua = navigator.userAgent;
  const browser = /Brave/i.test(ua) ? "Brave" : /Edg/i.test(ua) ? "Edge" : /Chrome/i.test(ua) ? "Chrome" : /Safari/i.test(ua) ? "Safari" : /Firefox/i.test(ua) ? "Firefox" : "Browser";
  const platform = /Mac/i.test(ua) ? "macOS" : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Android/i.test(ua) ? "Android" : "this device";
  return `${browser} on ${platform}`;
}

export function SecuritySettings({ masterPassword, onLock }: { masterPassword: string; onLock: () => void }) {
  const { authenticatedUserId, isAuthenticatedUserCurrent } = useVaultKey();
  const [preferences, setPreferences] = useState<VaultPreferences>(() => loadVaultPreferences());
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioWorking, setBioWorking] = useState(false);
  const [sessionWorking, setSessionWorking] = useState(false);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => subscribeVaultPreferences(setPreferences), []);
  useEffect(() => {
    queueMicrotask(() => {
      setBioSupported(isBiometricsSupported());
      setBioEnabled(authenticatedUserId ? hasBiometricsEnabled(authenticatedUserId) : false);
    });
    void supabase.auth.getUser().then(({ data }) => setLastSignIn(data.user?.last_sign_in_at ?? null));
  }, [authenticatedUserId]);

  const updatePreferences = (patch: Partial<VaultPreferences>) => setPreferences(saveVaultPreferences(patch));

  const toggleBiometrics = async () => {
    setBioWorking(true);
    setError(null);
    try {
      if (!authenticatedUserId) throw new Error("Your authenticated account could not be verified.");
      if (bioEnabled) {
        disableBiometrics(authenticatedUserId);
        setBioEnabled(false);
        toast("Biometric unlock disabled on this device", "info");
      } else {
        await enableBiometrics(masterPassword, authenticatedUserId, isAuthenticatedUserCurrent);
        setBioEnabled(true);
        toast("Biometric unlock enabled", "success");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Biometric setup could not be completed. Try again or continue with your master key.");
    } finally {
      setBioWorking(false);
    }
  };

  const signOutOthers = async () => {
    setSessionWorking(true);
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
    setSessionWorking(false);
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    toast("Other sessions signed out", "success");
  };

  return (
    <section className="settings-detail-section" aria-labelledby="settings-security-title">
      <header><p className="type-group-label">Security</p><h2 id="settings-security-title">Protect this device</h2><p>Control local unlocking, sensitive clipboard data and account sessions.</p></header>
      <div className="apple-grouped-list">
        <SettingsControl icon={TimerResetIcon} title="Auto-lock" description="Lock after this device is inactive.">
          <select value={preferences.autoLockMinutes} onChange={(event) => updatePreferences({ autoLockMinutes: Number(event.target.value) as AutoLockMinutes })} aria-label="Auto-lock duration">
            {AUTO_LOCK.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </SettingsControl>
        <SettingsControl icon={FingerprintIcon} title="Face ID / Touch ID" description={bioSupported ? (bioEnabled ? "Enabled on this device" : "Use this device to unlock faster") : "Unavailable in this browser or context"}>
          <button type="button" className={`settings-toggle system-interactive ${bioEnabled ? "is-on" : ""}`} role="switch" aria-checked={bioEnabled} aria-label="Toggle biometric unlock" disabled={!authenticatedUserId || !bioSupported || bioWorking} onClick={toggleBiometrics}>{bioWorking ? <Loader2Icon className="animate-spin" /> : <span />}</button>
        </SettingsControl>
        <SettingsControl icon={ClipboardIcon} title="Clear clipboard" description="Only clears a secret if it is still the latest copied value.">
          <select value={preferences.clipboardClearSeconds} onChange={(event) => updatePreferences({ clipboardClearSeconds: Number(event.target.value) as ClipboardClearSeconds })} aria-label="Clipboard clearing duration">
            {CLIPBOARD.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </SettingsControl>
      </div>

      <div className="settings-section-label">Sessions</div>
      <div className="settings-group">
        <div className="settings-session-row">
          <span className="settings-row-icon"><LaptopIcon aria-hidden="true" /></span>
          <span><strong>{currentDeviceLabel()}</strong><small>{lastSignIn ? `Signed in ${new Date(lastSignIn).toLocaleString()}` : "Current authenticated session"}</small></span>
          <i><CheckIcon aria-hidden="true" />Current</i>
        </div>
        <button type="button" className="settings-action-row system-interactive" onClick={signOutOthers} disabled={sessionWorking}><LogOutIcon aria-hidden="true" /><span><strong>Sign out other devices</strong><small>Revoke every other refresh session while keeping this browser signed in.</small></span>{sessionWorking && <Loader2Icon className="animate-spin" aria-hidden="true" />}</button>
      </div>

      <div className="settings-section-label">Vault</div>
      <button type="button" className="settings-lock-card system-interactive" onClick={onLock}><span><LockIcon aria-hidden="true" /></span><span><strong>Lock Vault</strong><small>Clear decrypted data and return to local unlock.</small></span></button>
      {error && <p className="settings-inline-error settings-security-error" role="alert">{error}</p>}
    </section>
  );
}

function SettingsControl(props: { icon: typeof LockIcon; title: string; description: string; children: React.ReactNode }) {
  const Icon = props.icon;
  return <div className="settings-group settings-control-row"><span className="settings-row-icon"><Icon aria-hidden="true" /></span><span><strong>{props.title}</strong><small>{props.description}</small></span><div>{props.children}</div></div>;
}
