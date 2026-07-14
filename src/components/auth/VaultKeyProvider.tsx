"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearLocalVaultSession } from "@/lib/vaultSession";
import { scopeVaultKeyToAuthenticatedUser, shouldClearVaultKeyForAuthChange } from "@/lib/vaultKeyOwnership";

type VaultKeyContextValue = {
  authenticatedUserId: string | null;
  masterKey: string | null;
  setMasterKey: (value: string) => void;
  clearMasterKey: () => void;
};

const VaultKeyContext = createContext<VaultKeyContextValue | null>(null);

export function VaultKeyProvider({ children }: { children: React.ReactNode }) {
  const [masterKey, setMasterKeyState] = useState<string | null>(null);
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);
  const [masterKeyUserId, setMasterKeyUserId] = useState<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  const clearMasterKey = useCallback(() => {
    setMasterKeyUserId(null);
    setMasterKeyState(null);
    clearLocalVaultSession();
  }, []);

  const setMasterKey = useCallback((value: string) => {
    const currentUserId = currentUserIdRef.current;
    if (!currentUserId) {
      clearMasterKey();
      return;
    }

    setMasterKeyUserId(currentUserId);
    setMasterKeyState(value);
  }, [clearMasterKey]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const previousUserId = currentUserIdRef.current;
      const currentUserId = session?.user.id ?? null;
      currentUserIdRef.current = currentUserId;
      setAuthenticatedUserId(currentUserId);

      if (shouldClearVaultKeyForAuthChange(previousUserId, currentUserId)) {
        clearMasterKey();
      }
    });

    return () => subscription.unsubscribe();
  }, [clearMasterKey]);

  const scopedMasterKey = scopeVaultKeyToAuthenticatedUser(masterKey, masterKeyUserId, authenticatedUserId);
  const value = useMemo(
    () => ({
      authenticatedUserId,
      masterKey: scopedMasterKey,
      setMasterKey,
      clearMasterKey,
    }),
    [authenticatedUserId, clearMasterKey, scopedMasterKey, setMasterKey],
  );

  return <VaultKeyContext.Provider value={value}>{children}</VaultKeyContext.Provider>;
}

export function useVaultKey() {
  const value = useContext(VaultKeyContext);
  if (!value) throw new Error("useVaultKey must be used within VaultKeyProvider");
  return value;
}
