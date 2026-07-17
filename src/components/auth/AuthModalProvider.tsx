"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AuthGateway } from "@/components/auth/AuthGateway";
import type { AuthMode } from "@/components/auth/AuthShell";

type AuthModalContextValue = {
  openAuth: (mode: AuthMode) => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

const MODE_COPY: Record<AuthMode, { title: string; description: string }> = {
  "sign-in": {
    title: "Sign in to Velora Vault",
    description: "Use your account email and password.",
  },
  "sign-up": {
    title: "Create your Velora Vault account",
    description: "Set an email and password to create your account.",
  },
};

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) throw new Error("useAuthModal must be used within an AuthModalProvider");
  return context;
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthMode | null>(null);

  const openAuth = useCallback((next: AuthMode) => setMode(next), []);

  return (
    <AuthModalContext.Provider value={{ openAuth }}>
      {children}
      <Dialog open={mode !== null} onOpenChange={(next) => { if (!next) setMode(null); }}>
        <DialogContent
          className="max-w-[calc(100%-2rem)] border-0 bg-transparent p-0 shadow-none ring-0 transition-none sm:max-w-[480px]"
          showCloseButton
        >
          <DialogTitle className="sr-only">{mode ? MODE_COPY[mode].title : "Sign in or sign up"}</DialogTitle>
          <DialogDescription className="sr-only">{mode ? MODE_COPY[mode].description : ""}</DialogDescription>
          {mode && <AuthGateway variant="modal" initialMode={mode} key={mode} />}
        </DialogContent>
      </Dialog>
    </AuthModalContext.Provider>
  );
}
