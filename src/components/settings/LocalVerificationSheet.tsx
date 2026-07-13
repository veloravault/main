"use client";

import { useEffect, useState } from "react";
import { FingerprintIcon, Loader2Icon, LockKeyholeIcon } from "lucide-react";
import { AdaptiveSheet, AdaptiveSheetBody, AdaptiveSheetFooter } from "@/components/ui/adaptive-sheet";
import { Button } from "@/components/ui/button";
import { hasBiometricsEnabled, unlockWithBiometrics } from "@/lib/biometrics";
import { hasPinLock, verifyPinAndRecoverMaster } from "@/components/PinLock";

export function LocalVerificationSheet(props: {
  open: boolean;
  masterPassword: string;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}) {
  const [value, setValue] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"biometric" | "pin" | "master">("master");
  const usesBio = mode === "biometric";
  const usesPin = mode === "pin";

  useEffect(() => {
    if (!props.open) return;
    queueMicrotask(() => setMode(hasBiometricsEnabled() ? "biometric" : hasPinLock() ? "pin" : "master"));
  }, [props.open]);

  const verify = async () => {
    setWorking(true);
    setError(null);
    try {
      const recovered = usesBio ? await unlockWithBiometrics() : usesPin ? await verifyPinAndRecoverMaster(value) : value;
      if (recovered !== props.masterPassword) throw new Error(usesPin ? "The PIN does not unlock this vault." : "The master key does not match this vault.");
      setValue("");
      props.onOpenChange(false);
      props.onVerified();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Verification failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <AdaptiveSheet open={props.open} onOpenChange={(open) => { if (!working) { props.onOpenChange(open); if (!open) { setValue(""); setError(null); } } }} title="Verify it’s you" description="Confirm locally before continuing with this destructive action." size="sm">
      <AdaptiveSheetBody>
        <div className="settings-verification-icon">{usesBio ? <FingerprintIcon aria-hidden="true" /> : <LockKeyholeIcon aria-hidden="true" />}</div>
        <p className="settings-verification-copy">{usesBio ? "Use Face ID, Touch ID or your platform authenticator." : usesPin ? "Enter your six-digit vault PIN." : "Enter the current master key. It stays on this device."}</p>
        {!usesBio && <input type={usesPin ? "text" : "password"} inputMode={usesPin ? "numeric" : undefined} maxLength={usesPin ? 6 : undefined} autoComplete="off" value={value} onChange={(event) => setValue(usesPin ? event.target.value.replace(/\D/g, "").slice(0, 6) : event.target.value)} placeholder={usesPin ? "6-digit PIN" : "Current master key"} className="settings-verification-input" autoFocus />}
        {error && <p className="settings-inline-error" role="alert">{error}</p>}
      </AdaptiveSheetBody>
      <AdaptiveSheetFooter><Button variant="ghost" disabled={working} onClick={() => props.onOpenChange(false)}>Cancel</Button><Button onClick={verify} disabled={working || (!usesBio && (usesPin ? value.length !== 6 : value.length < 8))} className="settings-primary-button">{working ? <Loader2Icon className="animate-spin" /> : "Verify"}</Button></AdaptiveSheetFooter>
    </AdaptiveSheet>
  );
}
