import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/app/onboarding/onboarding.module.css";

export const metadata: Metadata = {
  title: "Accept invitation — Telkar Vault",
  description: "Confirm your invitation to Telkar Vault.",
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

  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Invitation navigation">
        <Link className={styles.brand} href="/" aria-label="Telkar Vault home">
          <span className={styles.brandMark} aria-hidden="true"><i /><i /><i /><i /><b /></span>
          <span>Telkar Vault</span>
        </Link>
        <span className={styles.navStatus}>Private invitation</span>
      </nav>

      <section className={styles.centerStage} aria-labelledby="invitation-title">
        <div className={styles.card}>
          <span className={styles.stepMark} aria-hidden="true">01</span>
          {canConfirm ? (
            <>
              <p className={styles.eyebrow}>Invitation ready</p>
              <h1 id="invitation-title">Enter when you’re ready.</h1>
              <p className={styles.lede}>
                Your invitation is ready to be verified. Continue explicitly to create your private sign-in.
              </p>
              <form action="/auth/confirm" method="post" className={styles.actionForm}>
                <input type="hidden" name="token_hash" value={tokenHash} />
                <input type="hidden" name="type" value="invite" />
                <button className={styles.primaryAction} type="submit">
                  <span>Accept invitation</span><span aria-hidden="true">→</span>
                </button>
              </form>
              <p className={styles.securityNote}>The link is verified only after you press Accept invitation.</p>
            </>
          ) : (
            <>
              <p className={styles.eyebrow}>{expired ? "Invitation expired" : "Invitation unavailable"}</p>
              <h1 id="invitation-title">This link can’t be used.</h1>
              <p className={styles.lede}>
                {expired
                  ? "The invitation is no longer valid. Ask the vault owner to send a fresh invitation."
                  : "This invitation is incomplete or invalid. Return to the access page for help."}
              </p>
              <Link className={styles.secondaryAction} href="/request-access">Return to access</Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
