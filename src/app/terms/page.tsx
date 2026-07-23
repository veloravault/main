import type { Metadata } from "next";
import rootStyles from "../velora/velora.module.css";
import styles from "@/components/legal/Legal.module.css";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Use",
  description: "The terms that govern your use of Velora Vault.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <PublicPageShell>
      <article className={styles.article}>
        <div className={rootStyles.container}>
          <h1 className={styles.title}>Terms of Use</h1>
          <p className={styles.updated}>Last updated: July 23, 2026</p>
          <p className={styles.intro}>
            These terms govern your access to and use of Velora Vault. By
            creating an account or using the service, you agree to them.
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>The service</h2>
            <p>
              Velora Vault is a private vault for storing passwords,
              documents, notes, technical credentials, and financial
              essentials. We may suspend or revoke access for accounts that
              violate these terms.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Your account</h2>
            <p>
              When you create an account, you set a sign-in password. Afterward, you set
              a separate master key that encrypts your vault. You&rsquo;re
              responsible for keeping both confidential and for all activity
              that happens under your account.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Your master key</h2>
            <p>
              Your master key encrypts your vault on your device before
              anything is saved, and it is never sent to us or stored on our
              servers. This means:
            </p>
            <ul>
              <li>We cannot see, recover, or reset your master key.</li>
              <li>
                <strong>
                  If you lose your master key, your vault data cannot be
                  recovered
                </strong>{" "}
 - by you, by us, or by anyone else. There is no backdoor and
                no recovery process, because we never have access to the key
                in the first place.
              </li>
            </ul>
            <p>
              Please store your master key somewhere safe and separate from
              your vault.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the service for anything unlawful</li>
              <li>Attempt to access another member&rsquo;s vault or account</li>
              <li>Attempt to circumvent access controls</li>
              <li>Probe, scan, or test the service&rsquo;s security without authorization</li>
              <li>Interfere with the normal operation of the service for other members</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Service availability</h2>
            <p>
              Velora Vault is provided on an ongoing basis, but we don&rsquo;t
              guarantee uninterrupted or error-free availability. We may
              modify, suspend, or discontinue features at any time, and we&rsquo;ll
              try to give reasonable notice of any change that materially
              affects your access to your data.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Termination</h2>
            <p>
              You may stop using Velora Vault and request account deletion at
              any time. We may suspend or terminate access for accounts that
              violate these terms or pose a security risk to the service or
              other members.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Disclaimer and limitation of liability</h2>
            <p>
              Velora Vault is provided &ldquo;as is,&rdquo; without warranties
              of any kind, express or implied. To the fullest extent
              permitted by law, we are not liable for indirect, incidental,
              or consequential damages arising from your use of the service,
              including data loss resulting from a lost master key, as
              described above.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Changes to these terms</h2>
            <p>
              We may update these terms as the service evolves. Continued use
              of Velora Vault after an update constitutes acceptance of the
              revised terms.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact us</h2>
            <p>
              Questions about these terms can be sent to{" "}
              <a href="mailto:hello@veloravault.in">hello@veloravault.in</a>.
            </p>
          </section>

          <div className={styles.callout}>
            <p>
              <strong>The short version:</strong>{" "}
              use it responsibly, respect other members&rsquo; privacy, and
              keep your master key safe - because if it&rsquo;s gone, so is
              access to your vault.
            </p>
          </div>
        </div>
      </article>
    </PublicPageShell>
  );
}
