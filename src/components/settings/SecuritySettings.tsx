"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckIcon, FingerprintIcon, GridIcon, LaptopIcon, Loader2Icon, LockIcon, LogOutIcon, TimerResetIcon, ClipboardIcon, XCircleIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { disableBiometrics, enableBiometrics, hasBiometricsEnabled, isBiometricsSupported } from "@/lib/biometrics";
import { clearPinLock, hasPinLock, savePinForMaster } from "@/components/PinLock";
import { loadVaultPreferences, saveVaultPreferences, subscribeVaultPreferences, type AutoLockMinutes, type ClipboardClearSeconds, type VaultPreferences } from "@/lib/vaultPreferences";
import { useToast } from "@/components/Toast";
import { useVaultKey } from "@/components/auth/VaultKeyProvider";
import { AdaptiveSheet, AdaptiveSheetBody } from "@/components/ui/adaptive-sheet";

const AUTO_LOCK: Array<{ value: AutoLockMinutes; label: string }> = [
  { value: 0, label: "Immediately" }, { value: 1, label: "1 minute" }, { value: 5, label: "5 minutes" }, { value: 15, label: "15 minutes" }, { value: 30, label: "30 minutes" },
];
const CLIPBOARD: Array<{ value: ClipboardClearSeconds; label: string }> = [
  { value: 0, label: "Never" }, { value: 15, label: "15 seconds" }, { value: 30, label: "30 seconds" }, { value: 60, label: "60 seconds" },
];

// Chromium-based browsers (Chrome, Edge, and also Brave, Opera, Vivaldi...)
// all include "Chrome" in their user agent for compatibility, and Brave in
// particular deliberately omits any "Brave" token to avoid being
// fingerprinted - there is no reliable way to distinguish them from the UA
// string alone, so they're all honestly labeled by engine (Chrome) rather
// than guessing a brand that can't actually be detected.
function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//i.test(ua) ? "Edge" : /Chrome/i.test(ua) ? "Chrome" : /Safari/i.test(ua) ? "Safari" : /Firefox/i.test(ua) ? "Firefox" : "Browser";
  const platform = /Mac/i.test(ua) ? "macOS" : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Android/i.test(ua) ? "Android" : "Unknown device";
  return `${browser} on ${platform}`;
}

type VaultSessionRow = {
  id: string;
  created_at: string | null;
  refreshed_at: string | null;
  not_after: string | null;
  user_agent: string | null;
  is_current: boolean;
};

export function SecuritySettings({ masterPassword, onLock }: { masterPassword: string; onLock: () => void }) {
  const { authenticatedUserId, isAuthenticatedUserCurrent } = useVaultKey();
  const [preferences, setPreferences] = useState<VaultPreferences>(() => loadVaultPreferences());
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioWorking, setBioWorking] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinWorking, setPinWorking] = useState(false);
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [pinSetupStage, setPinSetupStage] = useState<"enter" | "confirm">("enter");
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [pinConfirmDigits, setPinConfirmDigits] = useState<string[]>([]);
  const [pinSetupError, setPinSetupError] = useState<string | null>(null);
  const [savingPinSetup, setSavingPinSetup] = useState(false);
  const [pinShake, setPinShake] = useState(false);
  const [sessionWorking, setSessionWorking] = useState(false);
  const [sessions, setSessions] = useState<VaultSessionRow[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const loadSessions = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc("list_my_sessions");
    if (rpcError) {
      setSessionsError(rpcError.message);
      return;
    }
    setSessions((data ?? []) as VaultSessionRow[]);
    setSessionsError(null);
  }, []);

  useEffect(() => subscribeVaultPreferences(setPreferences), []);
  useEffect(() => {
    queueMicrotask(() => {
      setBioSupported(isBiometricsSupported());
      setBioEnabled(authenticatedUserId ? hasBiometricsEnabled(authenticatedUserId) : false);
      setPinEnabled(authenticatedUserId ? hasPinLock(authenticatedUserId) : false);
    });
    void loadSessions();
  }, [authenticatedUserId, loadSessions]);

  const updatePreferences = (patch: Partial<VaultPreferences>) => setPreferences(saveVaultPreferences(patch));

  // PIN and Face ID/Touch ID are mutually exclusive device unlock methods -
  // only one is ever active, so the lock screen only ever has to offer one.
  // Swapping only takes effect once the new method is confirmed working, so
  // a cancelled/failed setup never leaves the device with neither enabled.
  const toggleBiometrics = async () => {
    if (!bioEnabled && pinEnabled && !confirm("Switch this device's unlock method to Face ID / Touch ID? PIN unlock will be turned off once it's set up.")) {
      return;
    }
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
        if (pinEnabled) {
          clearPinLock();
          setPinEnabled(false);
        }
        setBioEnabled(true);
        toast("Biometric unlock enabled", "success");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Biometric setup could not be completed. Try again or continue with your master key.");
    } finally {
      setBioWorking(false);
    }
  };

  const disablePinLock = () => {
    if (!pinEnabled) return;
    if (!confirm("Turn off PIN unlock on this device? You'll need your master key to unlock next time.")) return;
    setPinWorking(true);
    setError(null);
    try {
      clearPinLock();
      setPinEnabled(false);
      toast("PIN unlock disabled on this device", "info");
    } finally {
      setPinWorking(false);
    }
  };

  const openPinSetup = () => {
    if (bioEnabled && !confirm("Switch this device's unlock method to PIN? Face ID / Touch ID will be turned off once your PIN is set.")) {
      return;
    }
    setPinSetupStage("enter");
    setPinDigits([]);
    setPinConfirmDigits([]);
    setPinSetupError(null);
    setPinSetupOpen(true);
  };

  const closePinSetup = (open: boolean) => {
    if (savingPinSetup) return;
    setPinSetupOpen(open);
  };

  const handlePinSetupDigit = (digit: string) => {
    if (savingPinSetup) return;
    const isConfirm = pinSetupStage === "confirm";
    const current = isConfirm ? pinConfirmDigits : pinDigits;
    if (current.length >= 6) return;
    const next = [...current, digit];
    (isConfirm ? setPinConfirmDigits : setPinDigits)(next);
    setPinSetupError(null);
    if (next.length !== 6) return;

    if (!isConfirm) {
      setTimeout(() => setPinSetupStage("confirm"), 200);
      return;
    }
    const pinStr = pinDigits.join("");
    const confirmStr = next.join("");
    if (pinStr !== confirmStr) {
      setPinSetupError("PINs don't match. Try again.");
      setPinShake(true);
      setTimeout(() => { setPinShake(false); setPinConfirmDigits([]); }, 500);
      return;
    }
    if (!authenticatedUserId) {
      setPinSetupError("Your authenticated account could not be verified.");
      return;
    }
    setSavingPinSetup(true);
    void savePinForMaster(pinStr, masterPassword, authenticatedUserId, isAuthenticatedUserCurrent)
      .then(() => {
        if (bioEnabled) {
          disableBiometrics(authenticatedUserId);
          setBioEnabled(false);
        }
        setPinEnabled(true);
        setPinSetupOpen(false);
        toast("PIN unlock enabled", "success");
      })
      .catch((reason: unknown) => {
        setPinSetupError(reason instanceof Error ? reason.message : "PIN enrollment failed. Try again.");
        setPinConfirmDigits([]);
      })
      .finally(() => setSavingPinSetup(false));
  };

  const handlePinSetupDelete = () => {
    if (savingPinSetup) return;
    const isConfirm = pinSetupStage === "confirm";
    (isConfirm ? setPinConfirmDigits : setPinDigits)((d) => d.slice(0, -1));
    setPinSetupError(null);
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
    void loadSessions();
  };

  const revokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    const { error: rpcError } = await supabase.rpc("revoke_my_session", { p_session_id: sessionId });
    setRevokingSessionId(null);
    if (rpcError) {
      toast(rpcError.message, "error");
      return;
    }
    setSessions((prev) => prev?.filter((session) => session.id !== sessionId) ?? prev);
    toast("Session signed out", "success");
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
        <SettingsControl icon={GridIcon} title="PIN unlock" description={pinEnabled ? "Enabled on this device" : "Use a 6-digit PIN to unlock faster"}>
          <button
            type="button"
            className={`settings-toggle system-interactive ${pinEnabled ? "is-on" : ""}`}
            role="switch"
            aria-checked={pinEnabled}
            aria-label={pinEnabled ? "Turn off PIN unlock" : "Set up PIN unlock"}
            disabled={pinWorking || (!pinEnabled && !authenticatedUserId)}
            onClick={pinEnabled ? disablePinLock : openPinSetup}
          >
            {pinWorking ? <Loader2Icon className="animate-spin" /> : <span />}
          </button>
        </SettingsControl>
        <SettingsControl icon={ClipboardIcon} title="Clear clipboard" description="Only clears a secret if it is still the latest copied value.">
          <select value={preferences.clipboardClearSeconds} onChange={(event) => updatePreferences({ clipboardClearSeconds: Number(event.target.value) as ClipboardClearSeconds })} aria-label="Clipboard clearing duration">
            {CLIPBOARD.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </SettingsControl>
      </div>

      <div className="settings-section-label">Sessions</div>
      <div className="settings-group">
        {sessionsError && <p className="settings-inline-error" role="alert">{sessionsError}</p>}
        {sessions === null && !sessionsError && (
          <div className="settings-session-row">
            <span className="settings-row-icon"><Loader2Icon className="animate-spin" aria-hidden="true" /></span>
            <span><strong>Loading sessions…</strong></span>
          </div>
        )}
        {sessions?.map((session) => {
          const lastActive = session.refreshed_at ?? session.created_at;
          return (
            <div className="settings-session-row" key={session.id}>
              <span className="settings-row-icon"><LaptopIcon aria-hidden="true" /></span>
              <span>
                <strong>{describeUserAgent(session.user_agent)}</strong>
                <small>{lastActive ? `Active ${new Date(lastActive).toLocaleString()}` : "Active session"}</small>
              </span>
              {session.is_current ? (
                <i><CheckIcon aria-hidden="true" />Current</i>
              ) : (
                <button
                  type="button"
                  className="settings-session-revoke system-interactive"
                  onClick={() => revokeSession(session.id)}
                  disabled={revokingSessionId === session.id}
                >
                  {revokingSessionId === session.id ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : "Sign out"}
                </button>
              )}
            </div>
          );
        })}
        {sessions?.length === 0 && (
          <div className="settings-session-row">
            <span className="settings-row-icon"><LaptopIcon aria-hidden="true" /></span>
            <span><strong>No active sessions found</strong></span>
          </div>
        )}
        <button type="button" className="settings-action-row system-interactive" onClick={signOutOthers} disabled={sessionWorking}><LogOutIcon aria-hidden="true" /><span><strong>Sign out other devices</strong><small>Revoke every other refresh session while keeping this browser signed in.</small></span>{sessionWorking && <Loader2Icon className="animate-spin" aria-hidden="true" />}</button>
      </div>

      <div className="settings-section-label">Vault</div>
      <button type="button" className="settings-lock-card system-interactive" onClick={onLock}><span><LockIcon aria-hidden="true" /></span><span><strong>Lock Vault</strong><small>Clear decrypted data and return to local unlock.</small></span></button>
      {error && <p className="settings-inline-error settings-security-error" role="alert">{error}</p>}

      <AdaptiveSheet
        open={pinSetupOpen}
        onOpenChange={closePinSetup}
        title={pinSetupStage === "enter" ? "Choose a PIN" : "Confirm your PIN"}
        description={pinSetupStage === "enter" ? "Enter 6 digits you'll remember" : "Enter the same 6 digits again"}
        size="sm"
      >
        <AdaptiveSheetBody>
          <div className="flex flex-col items-center gap-6 py-2">
            <motion.div
              className="flex gap-4"
              animate={pinShake ? { x: [-8, 8, -8, 8, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              {Array.from({ length: 6 }).map((_, i) => {
                const count = pinSetupStage === "confirm" ? pinConfirmDigits.length : pinDigits.length;
                return (
                  <motion.div
                    key={i}
                    className="w-4 h-4 rounded-full border-2"
                    animate={{
                      backgroundColor: i < count ? "var(--foreground)" : "transparent",
                      borderColor: i < count ? "var(--foreground)" : "var(--border)",
                      scale: i === count - 1 && count > 0 ? [1, 1.3, 1] : 1,
                    }}
                    transition={{ duration: 0.15 }}
                  />
                );
              })}
            </motion.div>

            <AnimatePresence>
              {pinSetupError && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-destructive text-[13px] font-medium"
                >
                  <XCircleIcon className="w-4 h-4 shrink-0" />
                  {pinSetupError}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k) => {
                if (k === "") return <div key="empty" />;
                return (
                  <motion.button
                    key={k}
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => (k === "⌫" ? handlePinSetupDelete() : handlePinSetupDigit(k))}
                    disabled={savingPinSetup}
                    className="h-14 rounded-2xl text-[20px] font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {savingPinSetup && k === "0" ? <Loader2Icon className="w-4 h-4 animate-spin mx-auto" /> : k}
                  </motion.button>
                );
              })}
            </div>

            {pinSetupStage === "confirm" && (
              <button
                type="button"
                onClick={openPinSetup}
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Start over
              </button>
            )}
          </div>
        </AdaptiveSheetBody>
      </AdaptiveSheet>
    </section>
  );
}

function SettingsControl(props: { icon: typeof LockIcon; title: string; description: string; children: React.ReactNode }) {
  const Icon = props.icon;
  return <div className="settings-group settings-control-row"><span className="settings-row-icon"><Icon aria-hidden="true" /></span><span><strong>{props.title}</strong><small>{props.description}</small></span><div>{props.children}</div></div>;
}
