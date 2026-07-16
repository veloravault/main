import type { Metadata } from "next";
import rootStyles from "../dreelio/dreelio.module.css";
import styles from "@/components/legal/Legal.module.css";
import { LegalHeader } from "@/components/legal/LegalHeader";

export const metadata: Metadata = {
  title: "Contact Us — Velora Vault",
  description: "Get in touch with the Velora Vault team.",
};

const CONTACT_CHANNELS = [
  {
    title: "General & account support",
    body: "Questions about requesting access, your invitation, or how the vault works.",
    email: "hello@velora.vault",
  },
  {
    title: "Security disclosures",
    body: "Found a vulnerability? Tell us before anyone else finds it — we credit responsible disclosures.",
    email: "security@velora.vault",
  },
  {
    title: "Privacy & data requests",
    body: "Access, correction, or deletion requests for the account information we hold.",
    email: "privacy@velora.vault",
  },
];

export default function ContactPage() {
  return (
    <div className={rootStyles.root}>
      <LegalHeader />
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
    </div>
  );
}
