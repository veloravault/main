"use client";

export type AutoLockMinutes = 0 | 1 | 5 | 15 | 30;
export type ClipboardClearSeconds = 0 | 15 | 30 | 60;

export interface VaultPreferences {
  autoLockMinutes: AutoLockMinutes;
  clipboardClearSeconds: ClipboardClearSeconds;
}

export const DEFAULT_VAULT_PREFERENCES: VaultPreferences = {
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
};

const STORAGE_KEY = "velora_vault_preferences_v1";
const CHANGE_EVENT = "velora:vault-preferences-change";
const AUTO_LOCK_VALUES = new Set<AutoLockMinutes>([0, 1, 5, 15, 30]);
const CLIPBOARD_VALUES = new Set<ClipboardClearSeconds>([0, 15, 30, 60]);

function normalize(value: unknown): VaultPreferences {
  if (!value || typeof value !== "object") return DEFAULT_VAULT_PREFERENCES;
  const candidate = value as Partial<VaultPreferences>;
  return {
    autoLockMinutes: AUTO_LOCK_VALUES.has(candidate.autoLockMinutes as AutoLockMinutes)
      ? candidate.autoLockMinutes as AutoLockMinutes
      : DEFAULT_VAULT_PREFERENCES.autoLockMinutes,
    clipboardClearSeconds: CLIPBOARD_VALUES.has(candidate.clipboardClearSeconds as ClipboardClearSeconds)
      ? candidate.clipboardClearSeconds as ClipboardClearSeconds
      : DEFAULT_VAULT_PREFERENCES.clipboardClearSeconds,
  };
}

export function loadVaultPreferences(): VaultPreferences {
  if (typeof window === "undefined") return DEFAULT_VAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : DEFAULT_VAULT_PREFERENCES;
  } catch {
    return DEFAULT_VAULT_PREFERENCES;
  }
}

export function saveVaultPreferences(patch: Partial<VaultPreferences>): VaultPreferences {
  if (typeof window === "undefined") return normalize({ ...DEFAULT_VAULT_PREFERENCES, ...patch });
  const next = normalize({ ...loadVaultPreferences(), ...patch });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent<VaultPreferences>(CHANGE_EVENT, { detail: next }));
  return next;
}

export function subscribeVaultPreferences(listener: (value: VaultPreferences) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handleCustom = (event: Event) => {
    listener((event as CustomEvent<VaultPreferences>).detail ?? loadVaultPreferences());
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener(loadVaultPreferences());
  };
  window.addEventListener(CHANGE_EVENT, handleCustom);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}
