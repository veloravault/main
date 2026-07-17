import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { AuthorizationError, getMembershipForUser, requireUser } from "@/lib/server/access";
import styles from "@/components/auth/auth-shell.module.css";

export const metadata: Metadata = {
  title: "Set your master key — Velora Vault",
  description: "Set your Velora Vault master key.",
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
  switch (membership?.status) {
    case "invited":
      break;
    case "suspended":
      redirect("/login?state=suspended");
      break;
    case "revoked":
      redirect("/login?state=revoked");
      break;
    default:
      redirect("/signup?state=setup-incomplete");
  }

  return (
    <PublicPageShell>
      <AuthShell
        compact
        eyebrow="Vault setup"
        title="Your master key protects everything."
        description="It decrypts your vault only in this browser and is never sent to us, stored on our servers, or recoverable if lost."
        footer={(
          <dl className={styles.keyGuide}>
            <div><dt>Sign-in password</dt><dd>Set when you signed up</dd></div>
            <div><dt>Vault master key</dt><dd>Held in local memory only</dd></div>
          </dl>
        )}
      >
        <OnboardingForm userId={user.id} email={user.email ?? "your account email"} />
      </AuthShell>
    </PublicPageShell>
  );
}
