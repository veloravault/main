import type { Metadata } from "next";
import rootStyles from "../velora/velora.module.css";
import styles from "@/components/legal/Legal.module.css";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "How Velora Vault collects, encrypts, and handles your data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <PublicPageShell>
      <article className={styles.article}>
        <div className={rootStyles.container}>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.updated}>Last updated: July 22, 2026</p>
          <p className={styles.intro}>
            Velora Vault is a private, encrypted home for your passwords,
            documents, notes, and financial essentials. This policy explains
            what we collect, what we can and cannot see, and how your data is
            protected.
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>What we collect</h2>
            <p>We collect the minimum needed to run your account:</p>
            <ul>
              <li>
                <strong>Account information</strong> - your email address,
                account status, profile choices, and any optional master key
                hint you choose to save. A hint is readable account metadata,
                so it must never contain the master key itself. Supabase Auth handles your sign-in password;
                Velora Vault does not store the raw password in its application database.
              </li>
              <li>
                <strong>Encrypted vault contents</strong> - your passwords,
                documents, notes, cards, and bank details, but only in
                encrypted form. See below for what this means in practice.
              </li>
              <li>
                <strong>Session and device metadata</strong> - sign-in
                timestamps and basic device information, used to keep your
                account secure and to detect suspicious activity.
              </li>
              <li>
                <strong>Contact form submissions</strong> - if you use the
                contact form, we collect the name, email address, topic,
                subject, and message you enter so we can respond to you.
              </li>
              <li>
                <strong>Analytics data</strong> - only if you accept the
                analytics cookie prompt, we collect basic usage data such as
                pages viewed, referring pages, and device/browser type through
                Google Analytics. See <strong>Analytics</strong> below.
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
              PIN and supported platform-authenticator unlock are optional,
              device-local convenience layers. They protect a local wrapper
              and recover the master key into memory for the active unlocked
              session; they do not replace the master key.
            </p>
            <p>
              In practice, this means we store encrypted data we cannot read.
              We do not have the ability to decrypt your vault contents, view
              your passwords, or open your documents.
            </p>
            <p>
              AI-assisted import is an explicit exception to local-only content
              processing: source text or images you select are sent to the
              configured processing service before reviewed results are
              encrypted and saved. See <a href="/security">How security works</a>
              for the full recovery and threat boundaries.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>How we use your information</h2>
            <p>We use the information above only to:</p>
            <ul>
              <li>Create and confirm your account when you get started</li>
              <li>Authenticate you and maintain your session</li>
              <li>Enforce that only your own active account can access your data</li>
              <li>Detect and prevent abuse or unauthorized access</li>
              <li>Provide customer support when you contact us</li>
            </ul>
            <p>
              We do not sell your information, and we do not use your vault
              contents for advertising, analytics, or model training - we
              cannot, since we cannot decrypt it.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Analytics</h2>
            <p>
              We use Google Analytics to understand how the marketing site is
              used - pages viewed, referring pages, approximate location, and
              device/browser type. This never includes your vault contents,
              master key, or anything you store inside the app, and it never
              runs on your unlocked vault pages.
            </p>
            <p>
              Analytics is opt-in: it does not load until you accept the
              cookie prompt shown on your first visit. You can decline, and
              you can change your choice at any time by clearing your browser&rsquo;s
              site data for veloravault.in, which resets the prompt.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Access control</h2>
            <p>
              Every request to your data is checked at the database level
              against your own account and its active status, not just
              whether you are signed in. If your access is suspended or
              revoked, your encrypted data becomes inaccessible even to our
              own systems in the normal course of operation.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Third-party services</h2>
            <p>We use a limited set of providers to operate Velora Vault:</p>
            <ul>
              <li><strong>Supabase</strong> for authentication, account data, encrypted vault records, and avatar storage.</li>
              <li><strong>Cloudflare R2</strong> for encrypted document blobs. Documents are encrypted on your device before upload.</li>
              <li><strong>Razorpay</strong> to process Plus subscriptions. Payment details are collected and handled by Razorpay, not stored in your vault database.</li>
              <li><strong>Transactional email providers</strong> configured through Supabase Auth for account confirmation and security messages.</li>
              <li><strong>Configured AI processing services</strong> only when you explicitly use AI-assisted import or categorization. The selected source material is sent for that requested operation.</li>
              <li><strong>Google Analytics</strong>, only if you accept the analytics cookie prompt. See <strong>Analytics</strong> above for what this covers.</li>
            </ul>
            <p>
              These providers do not receive your master key. Supabase and
              Cloudflare R2 store only encrypted vault content and cannot
              decrypt it without that key.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Data retention and deletion</h2>
            <p>
              We retain your account information and encrypted vault data for
              as long as your account is active. You can permanently delete
              your account and associated vault data from the Danger Zone in
              Settings. You may also contact us for help with a deletion request.
              Limited records may be retained where required by law.
            </p>
            <p>
              Contact form submissions are retained so we can respond to your
              message and for a limited period afterward for support
              recordkeeping. Contact us using the details below if you&rsquo;d
              like an earlier submission deleted.
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
              <a href="mailto:privacy@veloravault.in">privacy@veloravault.in</a>.
            </p>
          </section>

          <div className={styles.callout}>
            <p>
              <strong>The short version:</strong>{" "}
              your master key never leaves your device, so we can&rsquo;t
              read your vault even if we wanted to. We only handle
              what&rsquo;s needed to run the account system around it.
            </p>
          </div>
        </div>
      </article>
    </PublicPageShell>
  );
}
