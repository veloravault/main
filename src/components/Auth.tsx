"use client";

import { useState } from "react";
import { Loader2Icon, SunIcon, MoonIcon } from "lucide-react";
import { FaceIdIcon, AppleLockIcon } from "@/components/Icons";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { savePinForMaster, hasPinLock } from "@/components/PinLock";
import { isBiometricsSupported, hasBiometricsEnabled, enableBiometrics, unlockWithBiometrics } from "@/lib/biometrics";
import { useVaultKey } from "@/components/auth/VaultKeyProvider";

export function Auth({ onLogin }: { onLogin: (masterPass: string) => void }) {
  const { authenticatedUserId } = useVaultKey();
  const [loading, setLoading] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { setTheme, resolvedTheme } = useTheme();

  const themeToggleButton = (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors z-50"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        {resolvedTheme === "dark" ? (
          <motion.span
            key="sun"
            initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.2 }}
          >
            <SunIcon className="w-5 h-5" />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ rotate: 90, opacity: 0, scale: 0.7 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.2 }}
          >
            <MoonIcon className="w-5 h-5" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );

  // PIN setup state — shown after successful login if no PIN exists yet
  const [pendingMaster, setPendingMaster] = useState<string | null>(null);
  const [pinSetupPhase, setPinSetupPhase] = useState<"prompt" | "enter" | "confirm">("prompt");
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [pinConfirmDigits, setPinConfirmDigits] = useState<string[]>([]);
  const [pinError, setPinError] = useState<string | null>(null);
  const [savingPin, setSavingPin] = useState(false);

  const [isBioSupported] = useState(() => isBiometricsSupported());
  const hasBio = authenticatedUserId ? hasBiometricsEnabled(authenticatedUserId) : false;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!authenticatedUserId) {
      setError("Your authenticated account could not be verified.");
      setLoading(false);
      return;
    }

    if (!masterPassword || masterPassword.length < 8) {
      setError("Master key must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    // If no PIN is set yet, OR if biometrics are supported but not set up, offer to set up.
    if (!hasPinLock(authenticatedUserId) || (isBioSupported && !hasBio)) {
      setPendingMaster(masterPassword);
      setPinSetupPhase("prompt");
      setLoading(false);
      return;
    }

    onLogin(masterPassword);
    setLoading(false);
  };

  // ── PIN setup helpers ─────────────────────────────────────────────────────
  const handlePinDigit = (digit: string, isConfirm: boolean) => {
    if (!authenticatedUserId) {
      setPinError("Your authenticated account could not be verified.");
      return;
    }
    const userId = authenticatedUserId;
    const current = isConfirm ? pinConfirmDigits : pinDigits;
    const setter = isConfirm ? setPinConfirmDigits : setPinDigits;
    if (current.length >= 6) return;
    const next = [...current, digit];
    setter(next);
    setPinError(null);

    if (next.length === 6) {
      if (!isConfirm) {
        // Move to confirm phase
        setTimeout(() => setPinSetupPhase("confirm"), 200);
      } else {
        // Check they match
        const pinStr = pinDigits.join("");
        const confirmStr = next.join("");
        if (pinStr !== confirmStr) {
          setPinError("PINs don't match. Try again.");
          setPinConfirmDigits([]);
        } else {
          // Save and unlock
          setSavingPin(true);
          savePinForMaster(pinStr, pendingMaster!, userId).then(() => {
            setSavingPin(false);
            onLogin(pendingMaster!);
          });
        }
      }
    }
  };

  const handlePinDelete = (isConfirm: boolean) => {
    if (isConfirm) setPinConfirmDigits(d => d.slice(0, -1));
    else setPinDigits(d => d.slice(0, -1));
    setPinError(null);
  };

  // ── PIN setup screen ──────────────────────────────────────────────────────
  if (pendingMaster) {
    const isConfirm = pinSetupPhase === "confirm";
    const digits = isConfirm ? pinConfirmDigits : pinDigits;

    if (pinSetupPhase === "prompt") {
      return (
        <div className="flex h-dvh w-full items-center justify-center bg-background px-4 relative">
          {themeToggleButton}
          <motion.div
            className="w-full max-w-xs flex flex-col items-center gap-8 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
          >
            <div className="w-16 h-16 rounded-[20px] bg-primary/10 flex items-center justify-center shadow-sm border border-primary/10">
              <AppleLockIcon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-[24px] font-semibold text-foreground tracking-tight mb-2">Speed up future logins</h1>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Set a 6-digit PIN to unlock your vault instantly — no need to type your master key every time.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              {isBioSupported && (
                <button
                  onClick={async () => {
                    try {
                      if (!authenticatedUserId) throw new Error("Your authenticated account could not be verified.");
                      await enableBiometrics(pendingMaster!, authenticatedUserId);
                      onLogin(pendingMaster!);
                    } catch (error: unknown) {
                      setPinError(error instanceof Error ? error.message : "Biometric enrollment failed.");
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-foreground text-background font-semibold text-[16px] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <FaceIdIcon className="w-[22px] h-[22px]" />
                  Set up Face ID / Touch ID
                </button>
              )}
              <button
                onClick={() => setPinSetupPhase("enter")}
                className={`w-full py-3 rounded-xl font-semibold text-[16px] transition-colors ${
                  isBioSupported ? "bg-muted text-foreground hover:bg-muted/80" : "bg-foreground text-background hover:opacity-90"
                }`}
              >
                Set up PIN
              </button>
              <button
                onClick={() => onLogin(pendingMaster!)}
                className="w-full py-3 rounded-xl text-muted-foreground text-[15px] hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
              {pinError && (
                <p className="text-destructive text-[13px] font-medium mt-2">{pinError}</p>
              )}
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background px-4 relative">
        {themeToggleButton}
        <motion.div
          key={pinSetupPhase}
          className="w-full max-w-xs flex flex-col items-center gap-8"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-[24px] font-semibold text-foreground tracking-tight">
              {isConfirm ? "Confirm your PIN" : "Choose a PIN"}
            </h1>
            <p className="text-[13px] text-muted-foreground">
              {isConfirm ? "Enter the same 6 digits again" : "Enter 6 digits you'll remember"}
            </p>
          </div>

          {/* PIN dots */}
          <div className="flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-4 h-4 rounded-full border-2"
                animate={{
                  backgroundColor: i < digits.length ? "var(--foreground)" : "transparent",
                  borderColor: i < digits.length ? "var(--foreground)" : "var(--border)",
                  scale: i === digits.length - 1 && digits.length > 0 ? [1, 1.3, 1] : 1,
                }}
                transition={{ duration: 0.15 }}
              />
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {pinError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-destructive text-[13px] font-medium -mt-4"
              >
                {pinError}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3 w-full">
            {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k) => {
              if (k === "") return <div key="empty" />;
              return (
                <motion.button
                  key={k}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => k === "⌫" ? handlePinDelete(isConfirm) : handlePinDigit(k, isConfirm)}
                  disabled={savingPin}
                  className="h-16 rounded-2xl text-[22px] font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {savingPin && k === "0" ? <Loader2Icon className="w-5 h-5 animate-spin mx-auto" /> : k}
                </motion.button>
              );
            })}
          </div>

          {isConfirm && (
            <button
              type="button"
              onClick={() => { setPinSetupPhase("enter"); setPinDigits([]); setPinConfirmDigits([]); setPinError(null); }}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Change PIN
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background px-4 sm:px-0 font-sans relative">
      {themeToggleButton}
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
      >
        <div className="space-y-4 text-center pb-8 min-h-[72px]">
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Enter your Master Key</h1>
          <p className="text-[14px] leading-6 text-muted-foreground">Unlock your encrypted vault for this session.</p>
        </div>

        {hasBio && (
          <div className="mb-6">
            <button
              onClick={async () => {
                try {
                  if (!authenticatedUserId) throw new Error("Your authenticated account could not be verified.");
                  const masterKey = await unlockWithBiometrics(authenticatedUserId);
                  onLogin(masterKey);
                } catch (error: unknown) {
                  setError(error instanceof Error ? error.message : "Biometric unlock failed.");
                }
              }}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
            >
              <FaceIdIcon className="w-[22px] h-[22px]" />
              Unlock with Face ID / Touch ID
            </button>

            <div className="flex items-center gap-4 my-6">
              <div className="h-px bg-border flex-1" />
              <span className="text-[12px] text-muted-foreground uppercase tracking-widest font-semibold">Or Use Master Key</span>
              <div className="h-px bg-border flex-1" />
            </div>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="relative focus-within:bg-muted/30 transition-colors">
              <label htmlFor="masterPassword" className="absolute top-2 left-4 text-[12px] text-muted-foreground pointer-events-none font-medium uppercase tracking-wider">Master Key (Min 8)</label>
              <input
                id="masterPassword"
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                autoFocus
                className="w-full pt-7 pb-2.5 px-4 text-[17px] text-foreground focus:outline-none bg-transparent pr-12"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                )}
              </button>
            </div>
          </div>
          
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="border rounded-lg p-4 mt-4 text-center shadow-sm bg-destructive/10 border-destructive/30"
              >
                <p className="text-[13px] font-medium leading-relaxed text-destructive">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    </div>
  );
}
