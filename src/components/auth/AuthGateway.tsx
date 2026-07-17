"use client";

import Link from "next/link";
import { AuthShell, type AuthMode } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import styles from "@/components/auth/auth-shell.module.css";

type AuthGatewayProps = {
  initialMode: AuthMode;
  nextPath?: string | null;
  notice?: string;
};

const modeCopy: Record<AuthMode, { title: string; description: string }> = {
  "sign-in": {
    title: "Sign in to Velora Vault",
    description: "Use your account credentials. Your vault master key is entered separately after signing in.",
  },
  "sign-up": {
    title: "Create your Velora Vault account",
    description: "Set an email and password to sign in. Your vault master key is set separately, after your email is confirmed.",
  },
};

export function AuthGateway({ initialMode: mode, nextPath, notice }: AuthGatewayProps) {
  const copy = modeCopy[mode];

  return (
    <AuthShell
      title={copy.title}
      description={copy.description}
      mode={mode}
      embedded
      footer={
        <>
          <span>{mode === "sign-in" ? "New to Velora Vault?" : "Already have an account?"}</span>{" "}
          <Link href={mode === "sign-in" ? "/signup" : "/login"}>
            {mode === "sign-in" ? "Create an account" : "Sign in"}
          </Link>
          <small>Your master key never belongs in your sign-in credentials.</small>
        </>
      }
    >
      {notice && <p className={styles.alert} role="alert">{notice}</p>}
      {mode === "sign-in" ? <SignInForm nextPath={nextPath} /> : <SignUpForm />}
    </AuthShell>
  );
}
