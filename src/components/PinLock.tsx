"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XCircleIcon } from "lucide-react";
import { FaceIdIcon, AppleLockIcon } from "@/components/Icons";
import { hasBiometricsEnabled, unlockWithBiometrics } from "@/lib/biometrics";
import { canUseVaultWrapper, requireAuthenticatedVaultUserId, requireVaultWrapperOwner } from "@/lib/vaultKeyOwnership";

const MAX_ATTEMPTS = 3;
const PIN_STORAGE_KEY = "vault_pin_hash";
const PIN_ENCRYPTED_KEY = "vault_pin_encrypted_master";
const LEGACY_PIN_ITERATIONS = 100_000;
const PIN_ITERATIONS = 600_000;

type PinMetadata = {
  hash?: string;
  salt?: string;
  iterations?: number;
  ownerUserId?: string;
};

// ── Crypto helpers ────────────────────────────────────────────────────────────

async function hashPin(pin: string, salt: string, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations, hash: "SHA-256" },
    keyMaterial, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

async function derivePinKey(pin: string, salt: string, iterations: number): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(salt), iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, ["encrypt", "decrypt"]
  );
}

async function encryptWithPin(data: string, pin: string, salt: string, iterations: number): Promise<string> {
  const key = await derivePinKey(pin, salt, iterations);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(data)
  );
  // Store iv + ciphertext as base64
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

async function decryptWithPin(cipherB64: string, pin: string, salt: string, iterations: number): Promise<string> {
  const combined = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const key = await derivePinKey(pin, salt, iterations);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function savePinForMaster(pin: string, masterKey: string, userId: string) {
  const ownerUserId = requireAuthenticatedVaultUserId(userId);
  const salt = crypto.randomUUID();
  const pinHash = await hashPin(pin, salt, PIN_ITERATIONS);
  const encryptedMaster = await encryptWithPin(masterKey, pin, salt, PIN_ITERATIONS);
  localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify({ hash: pinHash, salt, iterations: PIN_ITERATIONS, ownerUserId }));
  localStorage.setItem(PIN_ENCRYPTED_KEY, encryptedMaster);
}

function readPinMetadata(): PinMetadata | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(PIN_STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed: unknown = JSON.parse(stored);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as PinMetadata : null;
  } catch {
    return null;
  }
}

export function hasPinLock(userId: string): boolean {
  const metadata = readPinMetadata();
  return Boolean(
    metadata &&
    localStorage.getItem(PIN_ENCRYPTED_KEY) &&
    canUseVaultWrapper(metadata.ownerUserId, userId)
  );
}

export function clearPinLock() {
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.removeItem(PIN_ENCRYPTED_KEY);
}

export async function verifyPinAndRecoverMaster(pin: string, userId: string): Promise<string> {
  const parsed = readPinMetadata();
  const encryptedMaster = localStorage.getItem(PIN_ENCRYPTED_KEY);
  if (!parsed || !encryptedMaster) {
    throw new Error("PIN unlock is not configured on this device.");
  }

  try {
    const ownerUserId = requireVaultWrapperOwner(parsed.ownerUserId, userId, "PIN");
    if (!parsed.hash || !parsed.salt) throw new Error("Invalid PIN enrollment.");
    const iterations = parsed.iterations ?? LEGACY_PIN_ITERATIONS;
    if (!Number.isSafeInteger(iterations) || iterations < LEGACY_PIN_ITERATIONS || iterations > PIN_ITERATIONS) {
      throw new Error("Invalid PIN enrollment.");
    }
    const inputHash = await hashPin(pin, parsed.salt, iterations);
    if (inputHash !== parsed.hash) {
      const attempts = Number.parseInt(localStorage.getItem("vault_pin_attempts") || "0", 10) + 1;
      localStorage.setItem("vault_pin_attempts", String(attempts));
      if (attempts >= MAX_ATTEMPTS) {
        clearPinLock();
        localStorage.removeItem("vault_pin_attempts");
        throw new Error("Too many wrong attempts. Sign in with your master key.");
      }
      const remaining = MAX_ATTEMPTS - attempts;
      throw new Error(`Wrong PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`);
    }

    const masterKey = await decryptWithPin(encryptedMaster, pin, parsed.salt, iterations);
    if (iterations < PIN_ITERATIONS) await savePinForMaster(pin, masterKey, ownerUserId);
    localStorage.removeItem("vault_pin_attempts");
    return masterKey;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Failed to verify PIN. Use your master key.");
  }
}

// ── PinLock Component ──────────────────────────────────────────────────────────

interface PinLockProps {
  authenticatedUserId: string;
  onUnlock: (masterKey: string) => void;
  onFallback: () => void;  // Called when user wants to use full login
}

export function PinLock({ authenticatedUserId, onUnlock, onFallback }: PinLockProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("vault_pin_attempts") || "0");
  });
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const hasBio = hasBiometricsEnabled(authenticatedUserId);

  // Read attempts from localStorage so they persist across refreshes
  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS) {
      clearPinLock();
      localStorage.removeItem("vault_pin_attempts");
      onFallback();
    }
  }, [attempts, onFallback]);

  // Focus container for keyboard input
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleKey = (digit: string) => {
    if (checking) return;
    if (digits.length >= 6) return;
    const next = [...digits, digit];
    setDigits(next);
    setError(null);
    if (next.length === 6) {
      verifyPin(next.join(""));
    }
  };

  const handleDelete = () => {
    if (checking) return;
    setDigits(d => d.slice(0, -1));
    setError(null);
  };

  const verifyPin = async (pin: string) => {
    setChecking(true);
    try {
      const masterKey = await verifyPinAndRecoverMaster(pin, authenticatedUserId);
      onUnlock(masterKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to verify PIN. Use your master key.";
      const nextAttempts = Number.parseInt(localStorage.getItem("vault_pin_attempts") || "0", 10);
      setAttempts(nextAttempts);
      setError(message);
      if (!hasPinLock(authenticatedUserId)) {
        setTimeout(onFallback, 1500);
      } else {
        setShake(true);
        setTimeout(() => { setShake(false); setDigits([]); }, 500);
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="apple-app apple-surface flex h-dvh w-full items-center justify-center px-4">
      <motion.div
        className="apple-material w-full max-w-xs flex flex-col items-center gap-8 rounded-[28px] p-7"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
      >
        {/* Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-[20px] bg-primary/10 flex items-center justify-center shadow-sm border border-primary/10">
            <AppleLockIcon className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-[24px] font-semibold text-foreground tracking-tight">Enter PIN</h1>
          <p className="text-[14px] text-muted-foreground text-center">
            Enter your 6-digit PIN to unlock Telkar Vault
          </p>
        </div>

        {/* PIN dots */}
        <motion.div
          className="flex gap-4"
          animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
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
        </motion.div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-destructive text-[13px] font-medium"
            >
              <XCircleIcon className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Numpad */}
        <div
          ref={containerRef}
          tabIndex={0}
          className="grid grid-cols-3 gap-3 w-full outline-none"
          onKeyDown={(e) => {
            if (e.key >= "0" && e.key <= "9") handleKey(e.key);
            if (e.key === "Backspace" || e.key === "Delete") handleDelete();
          }}
        >
          {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k) => {
            if (k === "") return <div key="empty" />;
            return (
              <motion.button
                key={k}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => k === "⌫" ? handleDelete() : handleKey(k)}
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

        {/* Fallback links */}
        <div className="flex flex-col items-center gap-4">
          {hasBio && (
            <button
              type="button"
              onClick={async () => {
                setChecking(true);
                try {
                  const masterKey = await unlockWithBiometrics(authenticatedUserId);
                  onUnlock(masterKey);
                } catch (error: unknown) {
                  setError(error instanceof Error ? error.message : "Biometric unlock failed.");
                  setChecking(false);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-foreground text-[14px] font-medium hover:bg-muted/80 transition-colors"
            >
              <FaceIdIcon className="w-4 h-4" />
              Use Face ID / Touch ID
            </button>
          )}
          <button
            type="button"
            onClick={onFallback}
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Use master password instead
          </button>
        </div>
      </motion.div>
    </div>
  );
}
