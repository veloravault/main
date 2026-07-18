import type { Metadata } from "next";
import { AuthGateway } from "@/components/auth/AuthGateway";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { parseSafeNextPath } from "@/lib/access/validation";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Log in",
  description: "Sign in to your Velora Vault account.",
  path: "/login",
});

const STATE_NOTICES: Record<string, string> = {
  suspended: "Your account has been suspended. Contact support if you believe this is a mistake.",
  revoked: "This account no longer has vault access. Contact support for details.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; state?: string | string[] }>;
}) {
  const { next, state } = await searchParams;
  const nextPath = parseSafeNextPath(typeof next === "string" ? next : null);
  const notice = typeof state === "string" ? STATE_NOTICES[state] : undefined;

  return (
    <PublicPageShell>
      <AuthGateway initialMode="sign-in" nextPath={nextPath} notice={notice} />
    </PublicPageShell>
  );
}
