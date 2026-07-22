import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/auth/OnboardingFlow";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { AuthorizationError, getMembershipForUser, requireUser } from "@/lib/server/access";

export const metadata: Metadata = {
  title: "Set up your vault - Velora Vault",
  description: "Set up your Velora Vault.",
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
      <OnboardingFlow userId={user.id} email={user.email ?? "your account email"} />
    </PublicPageShell>
  );
}
