import type { Metadata } from "next";
import rootStyles from "../dreelio/dreelio.module.css";
import styles from "@/components/legal/Legal.module.css";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact us",
  description: "Get in touch with the Velora Vault team.",
  path: "/contact",
});

const CONTACT_CHANNELS = [
  {
    title: "General & account support",
    body: "Questions about your account, signing up, or how the vault works.",
    email: "hello@veloravault.in",
  },
  {
    title: "Security disclosures",
    body: "Found a vulnerability? Tell us before anyone else finds it — we credit responsible disclosures.",
    email: "security@veloravault.in",
  },
  {
    title: "Privacy & data requests",
    body: "Access, correction, or deletion requests for the account information we hold.",
    email: "privacy@veloravault.in",
  },
];

export default function ContactPage() {
  return (
    <PublicPageShell>
      <article className={styles.article}>
        <div className={rootStyles.container}>
          <h1 className={styles.title}>Contact us</h1>
          <p className={styles.intro}>
            Velora Vault doesn&rsquo;t route your message through a support
            widget or a web form we don&rsquo;t need. Reach us directly at the
            address that fits, and we&rsquo;ll get back to you.
          </p>

          <div className={styles.contactGrid}>
            {CONTACT_CHANNELS.map((channel) => (
              <div key={channel.email} className={styles.contactCard}>
                <p className={styles.contactCardTitle}>{channel.title}</p>
                <p className={styles.contactCardBody}>{channel.body}</p>
                <a href={`mailto:${channel.email}`} className={styles.contactCardEmail}>
                  {channel.email}
                </a>
              </div>
            ))}
          </div>

          <div className={styles.callout}>
            <p>
              <strong>The short version:</strong>{" "}
              we read every email ourselves — expect a reply within one
              business day.
            </p>
          </div>
        </div>
      </article>
    </PublicPageShell>
  );
}
