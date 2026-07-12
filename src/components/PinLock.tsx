"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheckIcon, XCircleIcon } from "lucide-react";

const MAX_ATTEMPTS = 3;
const PIN_STORAGE_KEY = "vault_pin_hash";
const PIN_ENCRYPTED_KEY = "vault_pin_encrypted_master";

// ── Crypto helpers ────────────────────────────────────────────────────────────

async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100_000, hash: "SHA-256" },
    keyMaterial, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

async function derivePinKey(pin: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, ["encrypt", "decrypt"]
  );
}

async function encryptWithPin(data: string, pin: string, salt: string): Promise<string> {
  const key = await derivePinKey(pin, salt);
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

async function decryptWithPin(cipherB64: string, pin: string, salt: string): Promise<string> {
  const combined = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const key = await derivePinKey(pin, salt);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function savePinForMaster(pin: string, masterKey: string) {
  const salt = crypto.randomUUID();
  const pinHash = await hashPin(pin, salt);
  const encryptedMaster = await encryptWithPin(masterKey, pin, salt);
  localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify({ hash: pinHash, salt }));
  localStorage.setItem(PIN_ENCRYPTED_KEY, encryptedMaster);
}

export function hasPinLock(): boolean {
  return !!(
    typeof window !== "undefined" &&
    localStorage.getItem(PIN_STORAGE_KEY) &&
    localStorage.getItem(PIN_ENCRYPTED_KEY)
  );
}

export function clearPinLock() {
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.removeItem(PIN_ENCRYPTED_KEY);
}

// ── PinLock Component ──────────────────────────────────────────────────────────

interface PinLockProps {
  onUnlock: (masterKey: string) => void;
  onFallback: () => void;  // Called when user wants to use full login
}

export function PinLock({ onUnlock, onFallback }: PinLockProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("vault_pin_attempts") || "0");
  });
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      const stored = localStorage.getItem(PIN_STORAGE_KEY);
      const encryptedMaster = localStorage.getItem(PIN_ENCRYPTED_KEY);
      if (!stored || !encryptedMaster) { onFallback(); return; }

      const { hash, salt } = JSON.parse(stored);
      const inputHash = await hashPin(pin, salt);

      if (inputHash === hash) {
        // Correct PIN — decrypt master key
        const masterKey = await decryptWithPin(encryptedMaster, pin, salt);
        localStorage.removeItem("vault_pin_attempts");
        onUnlock(masterKey);
      } else {
        // Wrong PIN
        const newAttempts = attempts + 1;
        localStorage.setItem("vault_pin_attempts", String(newAttempts));
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          clearPinLock();
          localStorage.removeItem("vault_pin_attempts");
          setError("Too many wrong attempts. Please sign in with your master key.");
          setTimeout(onFallback, 1500);
        } else {
          setError(`Wrong PIN. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts === 1 ? "" : "s"} left.`);
          setShake(true);
          setTimeout(() => { setShake(false); setDigits([]); }, 500);
        }
      }
    } catch {
      setError("Failed to verify PIN. Please use your master key.");
      setTimeout(onFallback, 1500);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background px-4">
      <motion.div
        className="w-full max-w-xs flex flex-col items-center gap-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
      >
        {/* Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-foreground flex items-center justify-center shadow-lg">
            <ShieldCheckIcon className="w-8 h-8 text-background" />
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
          {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => {
            if (k === "") return <div key={i} />;
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

        {/* Fallback link */}
        <button
          type="button"
          onClick={onFallback}
          className="text-[13px] text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          Use master password instead
        </button>
      </motion.div>
    </div>
  );
}
