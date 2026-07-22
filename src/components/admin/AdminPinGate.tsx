"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { XCircleIcon } from "lucide-react";
import { AppleLockIcon } from "@/components/Icons";
import { hasPinLock, verifyPinAndRecoverMaster } from "@/components/PinLock";
import { useVaultKey } from "@/components/auth/VaultKeyProvider";
import { AdminConsole } from "@/components/admin/AdminConsole";

const MAX_DIGITS = 6;

type GateStatus = "checking" | "locked" | "unlocked";

/**
 * Reuses the vault's device PIN as a step-up check before the owner console
 * loads. `requireAdmin()` (server-side) is the real authorization boundary -
 * this is only a local convenience gate, same as PIN unlock is for the vault
 * itself, so a user without vault PIN set up on this device sees no gate at
 * all. Starts in "checking" (never "unlocked") so neither this component's
 * SSR pass nor its first client paint can render admin content before the
 * PIN status is actually known.
 */
export function AdminPinGate({ adminUserId, adminEmail }: { adminUserId: string; adminEmail: string }) {
  const [status, setStatus] = useState<GateStatus>("checking");

  useEffect(() => {
    queueMicrotask(() => setStatus(hasPinLock(adminUserId) ? "locked" : "unlocked"));
  }, [adminUserId]);

  if (status === "checking") return <div className="apple-app apple-surface" aria-busy="true" />;
  if (status === "locked") return <AdminPinPrompt adminUserId={adminUserId} onUnlock={() => setStatus("unlocked")} />;
  return <AdminConsole adminEmail={adminEmail} />;
}

function AdminPinPrompt({ adminUserId, onUnlock }: { adminUserId: string; onUnlock: () => void }) {
  const router = useRouter();
  const { isAuthenticatedUserCurrent } = useVaultKey();
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const verifyPin = async (pin: string) => {
    setChecking(true);
    try {
      // The console never touches encrypted vault data - the recovered
      // master key is discarded immediately. A successful decrypt is only
      // used here as proof the PIN was correct.
      await verifyPinAndRecoverMaster(pin, adminUserId, isAuthenticatedUserCurrent);
      onUnlock();
    } catch (err) {
      if (!hasPinLock(adminUserId)) {
        // Max attempts reached - verifyPinAndRecoverMaster already cleared the PIN device-wide.
        setError("Too many wrong attempts. Your device PIN has been reset - unlock the vault with your master key to set it up again.");
        setTimeout(() => router.replace("/vault"), 1500);
      } else {
        setError(err instanceof Error ? err.message : "Failed to verify PIN.");
        setShake(true);
        setTimeout(() => { setShake(false); setDigits([]); }, 500);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleKey = (digit: string) => {
    if (checking) return;
    if (digits.length >= MAX_DIGITS) return;
    const next = [...digits, digit];
    setDigits(next);
    setError(null);
    if (next.length === MAX_DIGITS) void verifyPin(next.join(""));
  };

  const handleDelete = () => {
    if (checking) return;
    setDigits((d) => d.slice(0, -1));
    setError(null);
  };

  return (
    <div className="apple-app apple-surface flex h-dvh w-full items-center justify-center px-4">
      <motion.div
        className="apple-material w-full max-w-xs flex flex-col items-center gap-8 rounded-[28px] p-7"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-[20px] bg-primary/10 flex items-center justify-center shadow-sm border border-primary/10">
            <AppleLockIcon className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-[24px] font-semibold text-foreground tracking-tight">Confirm PIN</h1>
          <p className="text-[14px] text-muted-foreground text-center">Enter your PIN to open the owner console</p>
        </div>

        <motion.div
          className="flex gap-4"
          animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {Array.from({ length: MAX_DIGITS }).map((_, i) => (
            <motion.div
              role="alert"
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
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-destructive text-[13px] font-medium text-center"
            >
              <XCircleIcon className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div
          ref={containerRef}
          tabIndex={0}
          className="grid grid-cols-3 gap-3 w-full outline-none"
          onKeyDown={(e) => {
            if (e.key >= "0" && e.key <= "9") handleKey(e.key);
            if (e.key === "Backspace" || e.key === "Delete") handleDelete();
          }}
        >
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k) => {
            if (k === "") return <div key="empty" />;
            return (
              <motion.button
                key={k}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => (k === "⌫" ? handleDelete() : handleKey(k))}
                disabled={checking}
                className={`h-16 rounded-2xl text-[22px] font-medium transition-colors border ${
                  k === "⌫"
                    ? "text-muted-foreground border-border bg-card hover:bg-muted"
                    : "text-foreground border-border bg-card hover:bg-muted active:bg-muted/80"
                } disabled:opacity-50`}
              >
                {k}
              </motion.button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => router.replace("/vault")}
          className="text-[13px] text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          Cancel and return to vault
        </button>
      </motion.div>
    </div>
  );
}
