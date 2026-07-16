import type { Metadata } from "next";
import rootStyles from "../dreelio/dreelio.module.css";
import styles from "@/components/legal/Legal.module.css";
import { LegalHeader } from "@/components/legal/LegalHeader";

export const metadata: Metadata = {
  title: "Privacy Policy — Velora Vault",
  description: "How Velora Vault collects, encrypts, and handles your data.",
};

export default function PrivacyPage() {
  return (
    <div className={rootStyles.root}>
      <LegalHeader />
      <article className={styles.article}>
        <div className={rootStyles.container}>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.updated}>Last updated: July 17, 2026</p>
          <p className={styles.intro}>
            Velora Vault is a private, invite-only home for your passwords,
            documents, notes, and financial essentials. This policy explains
            what we collect, what we can and cannot see, and how your data is
            protected.
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>What we collect</h2>
            <p>We collect the minimum needed to run an invite-only service:</p>
            <ul>
              <li>
                <strong>Account information</strong> — your name and email
                address, provided when you request access and again when you
                accept an invitation.
              </li>
              <li>
                <strong>Encrypted vault contents</strong> — your passwords,
                documents, notes, cards, and bank details, but only in
                encrypted form. See below for what this means in practice.
              </li>
              <li>
                <strong>Session and device metadata</strong> — sign-in
                timestamps and basic device information, used to keep your
                account secure and to detect suspicious activity.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>How your vault is encrypted</h2>
            <p>
              Everything you save to your vault is encrypted with AES-256-GCM
              on your device before it is ever sent to our servers. The
              encryption key is derived from your master key using PBKDF2 with
              600,000 iterations, and that master key is never transmitted to
              us, stored on our servers, or written to any log.
            </p>
            <p>
              PIN and biometric unlock use a separate, independently derived
              key, so unlocking your device with a PIN never exposes your
              actual vault encryption key.
            </p>
            <p>
              In practice, this means we store encrypted data we cannot read.
              We do not have the ability to decrypt your vault contents, view
              your passwords, or open your documents.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>How we use your information</h2>
            <p>We use the information above only to:</p>
            <ul>
              <li>Operate the request-access and invitation flow</li>
              <li>Authenticate you and maintain your session</li>
              <li>Enforce that only active, invited members can access data</li>
              <li>Detect and prevent abuse or unauthorized access</li>
              <li>Provide customer support when you contact us</li>
            </ul>
            <p>
              We do not sell your information, and we do not use your vault
              contents for advertising, analytics, or model training — we
              cannot, since we cannot decrypt it.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Access control</h2>
            <p>
              Velora Vault is invite-only. Every request to your data is
              checked at the database level against your active membership
              status, not just whether you are signed in. If your access is
              revoked, your encrypted data becomes inaccessible even to our
              own systems in the normal course of operation.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Third-party services</h2>
            <p>
              We rely on Supabase for authentication, database hosting, and
              storage infrastructure. Supabase stores the encrypted data
              described above; it does not have access to your master key or
              the ability to decrypt your vault contents.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Data retention and deletion</h2>
            <p>
              We retain your account information and encrypted vault data for
              as long as your account is active. You can request deletion of
              your account and all associated data at any time by contacting
              us; we will remove it within a reasonable timeframe, except
              where retention is required by law.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Your rights</h2>
            <p>Depending on where you live, you may have the right to:</p>
            <ul>
              <li>Access the account information we hold about you</li>
              <li>Request a copy of your encrypted vault data</li>
              <li>Request correction of inaccurate account information</li>
              <li>Request deletion of your account and data</li>
            </ul>
            <p>To exercise any of these rights, contact us using the details below.</p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Children&rsquo;s privacy</h2>
            <p>
              Velora Vault is not directed at children, and we do not
              knowingly collect information from anyone under the age of 16.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Changes to this policy</h2>
            <p>
              We may update this policy as the service evolves. If we make
              material changes, we will update the date at the top of this
              page.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact us</h2>
            <p>
              Questions about this policy or your data can be sent to{" "}
              <a href="mailto:privacy@velora.vault">privacy@velora.vault</a>.
            </p>
          </section>

          <div className={styles.callout}>
            <p>
              <strong>The short version:</strong>{" "}
              your master key never leaves your device, so we can&rsquo;t
              read your vault even if we wanted to. We only handle
              what&rsquo;s needed to run an invite-only account system
              around it.
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
