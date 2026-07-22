import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import styles from "@/components/auth/auth-shell.module.css";

export const metadata: Metadata = {
  title: "Confirm your email - Velora Vault",
  description: "Confirm your Velora Vault account.",
  robots: { index: false, follow: false },
};

type ConfirmSearchParams = {
  token_hash?: string | string[];
  type?: string | string[];
  state?: string | string[];
};

export default async function ConfirmSignupPage({
  searchParams,
}: {
  searchParams: Promise<ConfirmSearchParams>;
}) {
  const parameters = await searchParams;
  const tokenHash = typeof parameters.token_hash === "string" ? parameters.token_hash : "";
  const type = typeof parameters.type === "string" ? parameters.type : "";
  const state = typeof parameters.state === "string" ? parameters.state : "";
  const canConfirm = type === "email" && tokenHash.length >= 20 && tokenHash.length <= 2048;
  const expired = state === "expired";
  const title = canConfirm ? "Confirm your email." : "This link can’t be used.";
  const description = canConfirm
    ? "Your confirmation is ready to be verified. Continue explicitly to finish creating your account."
    : expired
      ? "This confirmation link is no longer valid. Start again to get a fresh one."
      : "This link is incomplete or invalid. Return to account setup for help.";

  return (
    <PublicPageShell>
      <AuthShell
        compact
        eyebrow={canConfirm ? "Confirm email" : expired ? "Link expired" : "Link unavailable"}
        title={title}
        description={description}
        footer={canConfirm ? "The link is verified only after you press Confirm email." : undefined}
      >
        {canConfirm ? (
          <form action="/auth/confirm-signup" method="post" className={styles.formStack}>
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value="email" />
            <button className={styles.primaryAction} type="submit">
              <span>Confirm email</span><ArrowRightIcon width={17} height={17} aria-hidden="true" />
            </button>
          </form>
        ) : (
          <Link className={styles.actionLink} href="/signup">
            <span>Get started free</span><ArrowRightIcon width={17} height={17} aria-hidden="true" />
          </Link>
        )}
      </AuthShell>
    </PublicPageShell>
  );
}
