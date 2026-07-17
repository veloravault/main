import type { Metadata } from "next";
import { AuthGateway } from "@/components/auth/AuthGateway";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";

export const metadata: Metadata = {
  title: "Sign up — Velora Vault",
  description: "Create your Velora Vault account.",
};

const STATE_NOTICES: Record<string, string> = {
  "setup-incomplete": "We couldn't find an account to finish setting up. Sign up again to get a fresh confirmation email.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string | string[] }>;
}) {
  const { state } = await searchParams;
  const notice = typeof state === "string" ? STATE_NOTICES[state] : undefined;

  return (
    <PublicPageShell>
      <AuthGateway initialMode="sign-up" notice={notice} />
    </PublicPageShell>
  );
}
