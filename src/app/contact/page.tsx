import type { Metadata } from "next";
import rootStyles from "../dreelio/dreelio.module.css";
import { ContactForm } from "@/components/contact/ContactForm";
import styles from "@/components/contact/Contact.module.css";
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
    body: "Found a vulnerability? Tell us before anyone else finds it - we credit responsible disclosures.",
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
          <header className={styles.heading}>
            <p className={styles.eyebrow}>Talk to a person</p>
            <h1 className={styles.title}>How can we help?</h1>
            <p className={styles.intro}>
              Ask about your account, privacy, or Velora Vault. For anything
              sensitive, choose the security channel below.
            </p>
          </header>

          <div className={styles.layout}>
            <aside className={styles.channels} aria-label="Direct email channels">
              {CONTACT_CHANNELS.map((channel) => (
                <div key={channel.email} className={styles.channelCard}>
                  <p className={styles.channelTitle}>{channel.title}</p>
                  <p className={styles.channelBody}>{channel.body}</p>
                  <a href={`mailto:${channel.email}`} className={styles.channelEmail}>
                    {channel.email}
                  </a>
                </div>
              ))}
              <p className={styles.responseNote}>We read every message and usually reply within one business day.</p>
            </aside>

            <section className={styles.formCard} aria-labelledby="contact-form-title">
              <h2 id="contact-form-title" className={styles.formTitle}>Send us a message</h2>
              <p className={styles.formIntro}>Your message goes to a private owner-only inbox.</p>
              <ContactForm />
            </section>
          </div>
        </div>
      </article>
    </PublicPageShell>
  );
}
