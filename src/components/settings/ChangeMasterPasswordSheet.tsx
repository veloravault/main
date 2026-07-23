"use client";

import { useState } from "react";
import { Loader2Icon, XCircleIcon } from "lucide-react";
import { AdaptiveSheet, AdaptiveSheetBody, AdaptiveSheetFooter } from "@/components/ui/adaptive-sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { getStrength } from "@/lib/passwordHealth";
import { useVaultKey } from "@/components/auth/VaultKeyProvider";
import { clearPinLock, hasPinLock } from "@/components/PinLock";
import { disableBiometrics, hasBiometricsEnabled } from "@/lib/biometrics";
import { rotateMasterPassword, MasterPasswordRotationError, type RotationProgress } from "@/lib/masterPasswordRotation";
import { useToast } from "@/components/Toast";

function stageLabel(stage: RotationProgress["stage"]): string {
  if (stage === "items") return "Re-encrypting passwords";
  if (stage === "notes") return "Re-encrypting secure notes";
  if (stage === "wallet") return "Re-encrypting wallet & bank records";
  if (stage === "documents") return "Re-encrypting documents";
  if (stage === "credentials") return "Re-encrypting credentials";
  if (stage === "committing") return "Saving changes";
  return "Cleaning up";
}

export function ChangeMasterPasswordSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { masterKey, authenticatedUserId, setMasterKey } = useVaultKey();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<RotationProgress | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const strength = getStrength(newPassword);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setProgress(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRotating) return;
    setError(null);

    if (currentPassword !== masterKey) {
      setError("That's not your current master key.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Your new master key must be at least 8 characters long.");
      return;
    }
    if (strength.level === "weak") {
      setError("Choose a stronger master key - it's the only thing protecting your vault.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new master key confirmation does not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a master key different from your current one.");
      return;
    }
    if (!authenticatedUserId) {
      setError("Your authenticated account could not be verified.");
      return;
    }

    setIsRotating(true);
    try {
      await rotateMasterPassword(currentPassword, newPassword, setProgress);
    } catch (err) {
      setError(err instanceof MasterPasswordRotationError ? err.message : "The change could not be completed. Nothing was changed.");
      setIsRotating(false);
      return;
    }

    // The vault is now re-encrypted with the new password server-side -
    // everything below is local/best-effort cleanup. A failure here must
    // never be reported as "nothing was changed."
    const hadPinLock = hasPinLock(authenticatedUserId);
    const hadBiometrics = hasBiometricsEnabled(authenticatedUserId);
    try {
      if (hadPinLock) clearPinLock();
      if (hadBiometrics) disableBiometrics(authenticatedUserId);
    } catch {
      // Best-effort - stale PIN/biometric wrappers will just fail to unlock
      // next time, and the user can redo setup from Settings.
    }

    // The saved hint describes the OLD master key - left in place, it would
    // describe a secret that no longer exists, which is actively misleading
    // rather than merely unhelpful. Clear it server-side so Account Settings
    // reflects reality on next load; a failure here is also best-effort.
    let hadHint = false;
    try {
      const { data } = await supabase.auth.getUser();
      hadHint = Boolean(data.user?.user_metadata?.master_key_hint);
      if (hadHint) {
        await supabase.auth.updateUser({ data: { master_key_hint: null } });
      }
    } catch {
      // Best-effort - a stale hint just means the user should set a new one.
    }

    const committed = setMasterKey(newPassword, authenticatedUserId);
    setIsRotating(false);
    reset();
    onOpenChange(false);

    if (!committed) {
      toast("Master key changed, but your session changed during the process - sign in again to continue.", "error");
      return;
    }
    let message = "Master key changed.";
    if (hadHint && (hadPinLock || hadBiometrics)) {
      message = "Master key changed. Your master key hint and this device's PIN/Face ID/Touch ID were all cleared since they no longer match - set new ones from Settings if you'd like.";
    } else if (hadHint) {
      message = "Master key changed. Your master key hint was cleared since it no longer matches - set a new one from Settings if you'd like.";
    } else if (hadPinLock || hadBiometrics) {
      message = "Master key changed. PIN and Face ID / Touch ID were turned off - set them up again from Settings if you'd like.";
    }
    toast(message, "success");
  };

  return (
    <AdaptiveSheet
      open={open}
      onOpenChange={(next) => { if (!isRotating) { onOpenChange(next); if (!next) reset(); } }}
      title="Change master password"
      description="Re-encrypts your entire vault with a new master key."
      size="sm"
    >
      <form onSubmit={handleSubmit} noValidate>
        <AdaptiveSheetBody className="space-y-4">
          <p className="text-[13px] text-muted-foreground bg-secondary/60 rounded-xl px-3 py-2">
            Consider exporting a backup first, from Data &amp; Backup, in case anything interrupts this.
          </p>
          <div>
            <label htmlFor="rotate-current" className="account-field-label">Current master password</label>
            <input id="rotate-current" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="account-field-input full-width" disabled={isRotating} required />
          </div>
          <div>
            <label htmlFor="rotate-new" className="account-field-label">New master password</label>
            <input id="rotate-new" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="account-field-input full-width" disabled={isRotating} required minLength={8} />
            {newPassword && <PasswordStrengthMeter strength={strength} />}
          </div>
          <div>
            <label htmlFor="rotate-confirm" className="account-field-label">Confirm new master password</label>
            <input id="rotate-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="account-field-input full-width" disabled={isRotating} required />
          </div>
          {progress && (
            <p className="text-[13px] text-muted-foreground flex items-center gap-2">
              <Loader2Icon className="w-4 h-4 animate-spin" aria-hidden="true" />
              {stageLabel(progress.stage)} ({progress.completed}/{progress.total})
            </p>
          )}
          {error && (
            <p className="text-[13px] text-destructive flex items-center gap-2" role="alert">
              <XCircleIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
        </AdaptiveSheetBody>
        <AdaptiveSheetFooter>
          <Button type="button" variant="ghost" onClick={() => { onOpenChange(false); reset(); }} disabled={isRotating}>Cancel</Button>
          <Button type="submit" className="import-primary-action" disabled={isRotating}>
            {isRotating ? "Changing…" : "Change master password"}
          </Button>
        </AdaptiveSheetFooter>
      </form>
    </AdaptiveSheet>
  );
}
