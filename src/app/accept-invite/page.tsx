import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { InviteFragmentBridge } from "@/components/auth/InviteFragmentBridge";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import styles from "@/components/auth/auth-shell.module.css";

export const metadata: Metadata = {
  title: "Accept invitation — Velora Vault",
  description: "Confirm your invitation to Velora Vault.",
  robots: { index: false, follow: false },
};

type InviteSearchParams = {
  token_hash?: string | string[];
  type?: string | string[];
  state?: string | string[];
};

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<InviteSearchParams>;
}) {
  const parameters = await searchParams;
  const tokenHash = typeof parameters.token_hash === "string" ? parameters.token_hash : "";
  const type = typeof parameters.type === "string" ? parameters.type : "";
  const state = typeof parameters.state === "string" ? parameters.state : "";
  const canConfirm = type === "invite" && tokenHash.length >= 20 && tokenHash.length <= 2048;
  const expired = state === "expired";
  const awaitingFragment = !state && !canConfirm;
  const title = canConfirm ? "Enter when you’re ready." : awaitingFragment ? "Opening your invitation." : "This link can’t be used.";
  const description = canConfirm
    ? "Your invitation is ready to be verified. Continue explicitly to create your private sign-in."
    : awaitingFragment
      ? "Velora Vault is securely completing the invitation from your email."
    : expired
      ? "The invitation is no longer valid. Ask the vault owner to send a fresh invitation."
      : "This invitation is incomplete or invalid. Return to the access page for help.";

  return (
    <PublicPageShell>
      <AuthShell
        compact
        eyebrow={canConfirm ? "Private invitation · 01" : awaitingFragment ? "Private invitation" : expired ? "Invitation expired" : "Invitation unavailable"}
        title={title}
        description={description}
        footer={canConfirm ? "The link is verified only after you press Accept invitation." : undefined}
      >
        {canConfirm ? (
          <form action="/auth/confirm" method="post" className={styles.formStack}>
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value="invite" />
            <button className={styles.primaryAction} type="submit">
              <span>Accept invitation</span><ArrowRightIcon width={17} height={17} aria-hidden="true" />
            </button>
          </form>
        ) : awaitingFragment ? (
          <InviteFragmentBridge />
        ) : (
          <Link className={styles.actionLink} href="/request-access">
            <span>Return to access</span><ArrowRightIcon width={17} height={17} aria-hidden="true" />
          </Link>
        )}
      </AuthShell>
    </PublicPageShell>
  );
}
