"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2Icon } from "lucide-react";
import { FaceIdIcon, PremiumShieldIcon } from "@/components/Icons";
import { motion, AnimatePresence } from "framer-motion";
import { savePinForMaster, hasPinLock } from "@/components/PinLock";
import { isBiometricsSupported, hasBiometricsEnabled, enableBiometrics, unlockWithBiometrics } from "@/lib/biometrics";

export function Auth({ 
  onLogin,
  initialSessionActive = false,
  initialEmail = ""
}: { 
  onLogin: (masterPass: string) => void,
  initialSessionActive?: boolean,
  initialEmail?: string
}) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  // PIN setup state — shown after successful login if no PIN exists yet
  const [pendingMaster, setPendingMaster] = useState<string | null>(null);
  const [pinSetupPhase, setPinSetupPhase] = useState<"prompt" | "enter" | "confirm">("prompt");
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [pinConfirmDigits, setPinConfirmDigits] = useState<string[]>([]);
  const [pinError, setPinError] = useState<string | null>(null);
  const [savingPin, setSavingPin] = useState(false);

  const [isBioSupported, setIsBioSupported] = useState(false);
  const [hasBio, setHasBio] = useState(false);

  useEffect(() => {
    setIsBioSupported(isBiometricsSupported());
    setHasBio(hasBiometricsEnabled());
  }, []);

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email above first, then click Forgot Password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!masterPassword || masterPassword.length < 8) {
      setError("Master key must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError("✅ Check your email for the confirmation link!");
        setLoading(false);
        return;
      }

      // Sign in: skip if we already have an active session
      if (!initialSessionActive) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      
      // If no PIN is set yet, OR if biometrics are supported but not set up, offer to set up
      if (!hasPinLock() || (isBioSupported && !hasBio)) {
        setPendingMaster(masterPassword);
        setPinSetupPhase("prompt");
        setLoading(false);
        return;
      }

      onLogin(masterPassword);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  // ── PIN setup helpers ─────────────────────────────────────────────────────
  const handlePinDigit = (digit: string, isConfirm: boolean) => {
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
          savePinForMaster(pinStr, pendingMaster!).then(() => {
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
        <div className="flex h-screen w-full items-center justify-center bg-background px-4">
          <motion.div
            className="w-full max-w-xs flex flex-col items-center gap-8 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
          >
            <div className="w-16 h-16 rounded-[18px] bg-foreground flex items-center justify-center shadow-md">
              <PremiumShieldIcon className="w-8 h-8 text-background" />
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
                      await enableBiometrics(pendingMaster!);
                      onLogin(pendingMaster!);
                    } catch (err: any) {
                      setPinError(err.message);
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
      <div className="flex h-screen w-full items-center justify-center bg-background px-4">
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
            {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => {
              if (k === "") return <div key={i} />;
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
    <div className="flex h-screen w-full items-center justify-center bg-background px-4 sm:px-0 font-sans">
      <motion.div 
        className="w-full max-w-sm"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
      >
        <div className="space-y-4 text-center pb-8 min-h-[72px]">
          <AnimatePresence mode="wait">
            <motion.h1 
              key={isSignUp ? "signup" : "signin"}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="text-[28px] font-semibold tracking-tight text-foreground"
            >
              {initialSessionActive
                ? "Enter your Master Key"
                : isSignUp
                ? "Create Telkar Vault"
                : "Sign in to Telkar Vault"}
            </motion.h1>
          </AnimatePresence>
        </div>
        
        {/* Sign In / Create Account toggle — hidden when session already exists */}
        {!initialSessionActive && (
          <div className="flex bg-muted/50 p-1 rounded-xl mx-auto w-fit mb-6">
            <button 
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`px-6 py-1.5 rounded-lg text-[14px] font-medium transition-all duration-200 ${!isSignUp ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Sign In
            </button>
            <button 
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`px-6 py-1.5 rounded-lg text-[14px] font-medium transition-all duration-200 ${isSignUp ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Create Account
            </button>
          </div>
        )}

        {initialSessionActive && hasBio && (
          <div className="mb-6">
            <button
              onClick={async () => {
                try {
                  const masterKey = await unlockWithBiometrics();
                  onLogin(masterKey);
                } catch (err: any) {
                  setError(err.message);
                }
              }}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
            >
              <FaceIdIcon className="w-[22px] h-[22px]" />
              Sign in with Face ID / Touch ID
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
            {!initialSessionActive && (
              <>
                <div className="relative border-b border-border focus-within:bg-muted/30 transition-colors">
                  <label htmlFor="email" className="absolute top-2 left-4 text-[12px] text-muted-foreground pointer-events-none font-medium uppercase tracking-wider">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full pt-7 pb-2.5 px-4 text-[17px] text-foreground focus:outline-none bg-transparent"
                  />
                </div>
                <div className="relative border-b border-border focus-within:bg-muted/30 transition-colors">
                  <label htmlFor="password" className="absolute top-2 left-4 text-[12px] text-muted-foreground pointer-events-none font-medium uppercase tracking-wider">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    className="w-full pt-7 pb-2.5 px-4 text-[17px] text-foreground focus:outline-none bg-transparent"
                  />
                </div>
              </>
            )}
            <div className="relative focus-within:bg-muted/30 transition-colors">
              <label htmlFor="masterPassword" className="absolute top-2 left-4 text-[12px] text-muted-foreground pointer-events-none font-medium uppercase tracking-wider">Master Key (Min 8)</label>
              <input
                id="masterPassword"
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                autoFocus={initialSessionActive}
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
              className={`border rounded-lg p-4 mt-4 text-center shadow-sm ${
                error.startsWith("✅")
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-destructive/10 border-destructive/30"
              }`}
            >
              <p className={`text-[13px] font-medium leading-relaxed ${
                error.startsWith("✅") ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              }`}>{error}</p>
            </motion.div>
          )}
          </AnimatePresence>
        </form>

        <div className="mt-8 text-center space-y-4">
          {!isSignUp && !initialSessionActive && (
            <div>
              {forgotSent ? (
                <p className="text-[14px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✅ Password reset link sent to your email!
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-[14px] text-muted-foreground hover:text-foreground transition-colors font-medium disabled:opacity-50"
                >
                  Forgot password? <span className="text-[11px] opacity-70 inline-block ml-0.5">↗</span>
                </button>
              )}
            </div>
          )}
          {!initialSessionActive && (
            <div className="text-[15px] text-foreground">
              <AnimatePresence mode="wait">
                <motion.span
                  key={isSignUp ? "signup_prompt" : "signin_prompt"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="inline-block"
                >
                  {isSignUp ? "Already have an account?" : "Don't have a Vault Account?"}
                </motion.span>
              </AnimatePresence>{" "}
              <button
                type="button"
                className="font-semibold text-foreground hover:underline"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isSignUp ? "signup_btn" : "signin_btn"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="inline-block"
                  >
                    {isSignUp ? "Sign In" : "Create Your Account"}
                  </motion.span>
                </AnimatePresence>
                <span className="text-[12px] opacity-70 inline-block ml-0.5">↗</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
