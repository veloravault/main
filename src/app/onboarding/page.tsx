import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { AuthorizationError, getMembershipForUser, requireUser } from "@/lib/server/access";
import styles from "@/components/auth/auth-shell.module.css";

export const metadata: Metadata = {
  title: "Create your private access — Velora Vault",
  description: "Complete your Velora Vault invitation.",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof AuthorizationError && error.code === "UNAUTHENTICATED") {
      redirect("/login?next=/vault");
    }
    throw error;
  }

  const membership = await getMembershipForUser(user.id);
  if (membership?.status === "active") redirect("/vault");
  if (membership?.status !== "invited") redirect("/request-access?state=not-approved");

  return (
    <AuthShell
      compact
      eyebrow="Private setup · 02"
      title="Two secrets. Two separate jobs."
      description="Your sign-in password protects this account. Your existing master key decrypts your vault only in this browser and is never sent to us."
      footer={(
        <dl className={styles.keyGuide}>
          <div><dt>Sign-in password</dt><dd>Stored by authentication</dd></div>
          <div><dt>Vault master key</dt><dd>Held in local memory only</dd></div>
        </dl>
      )}
    >
      <OnboardingForm userId={user.id} email={user.email ?? "your invited email"} />
    </AuthShell>
  );
}
