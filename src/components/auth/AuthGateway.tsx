"use client";

import { useState } from "react";
import { RequestAccessForm } from "@/components/access/RequestAccessForm";
import { AuthShell, type AuthMode } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/SignInForm";

type AuthGatewayProps = {
  initialMode: AuthMode;
  nextPath?: string | null;
};

const modeCopy: Record<AuthMode, { title: string; description: string }> = {
  "sign-in": {
    title: "Sign in to Velora Vault",
    description: "Use your account credentials. Your vault master key is entered separately after access is verified.",
  },
  "request-access": {
    title: "Request private access",
    description: "Tell us who you are. Every request is reviewed before an invitation is sent.",
  },
};

export function AuthGateway({ initialMode, nextPath }: AuthGatewayProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const copy = modeCopy[mode];

  return (
    <AuthShell
      title={copy.title}
      description={copy.description}
      mode={mode}
      onModeChange={setMode}
      footer={<span>Your master key never belongs in an access request.</span>}
    >
      {mode === "sign-in" ? <SignInForm nextPath={nextPath} /> : <RequestAccessForm />}
    </AuthShell>
  );
}
