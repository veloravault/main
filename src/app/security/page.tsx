import type { Metadata } from "next";
import Link from "next/link";
import rootStyles from "../dreelio/dreelio.module.css";
import { LegalHeader } from "@/components/legal/LegalHeader";
import { VaultSeal } from "@/components/dreelio/VaultSeal";
import styles from "./security.module.css";

export const metadata: Metadata = {
  title: "How security works — Velora Vault",
  description:
    "The encryption model, access controls, recovery limits, and threat boundaries behind Velora Vault.",
};

const CRYPTO_FACTS = [
  ["Cipher", "AES-256-GCM"],
  ["Key derivation", "PBKDF2-SHA-256 · 600,000 iterations"],
  ["Per operation", "Fresh 16-byte salt · fresh 12-byte IV"],
  ["Key handling", "Master key held in memory while unlocked"],
] as const;

export default function SecurityPage() {
  return (
    <div className={rootStyles.root}>
      <LegalHeader />
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Security architecture</p>
            <h1>What Velora protects—and what it cannot.</h1>
            <p>
              Security claims should be inspectable. This page describes the
              encryption and access controls implemented today, along with the
              recovery and device-level risks they do not solve.
            </p>
          </div>
          <VaultSeal />
        </section>

        <section className={styles.factGrid} aria-label="Implemented cryptography">
          {CRYPTO_FACTS.map(([label, value]) => (
            <article key={label} className={styles.fact}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </section>

        <section className={styles.section}>
          <p className={styles.sectionIndex}>01 · Stored vault data</p>
          <div className={styles.sectionBody}>
            <h2>Encryption happens in your browser before storage.</h2>
            <p>
              Password records, secure notes, wallet records, bank records, and
              document contents are encrypted with AES-256-GCM before Velora
              sends them to database or object storage. Each encryption operation
              uses PBKDF2-SHA-256 with 600,000 iterations, a fresh 16-byte salt,
              and a fresh 12-byte IV.
            </p>
            <p>
              The master key is held in browser memory while the vault is unlocked.
              It is separate from the account password and is not written to the
              account, database, or normal server logs.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <p className={styles.sectionIndex}>02 · Access control</p>
          <div className={styles.sectionBody}>
            <h2>Encryption and authorization do different jobs.</h2>
            <p>
              Supabase row-level security policies require record ownership and
              active membership before encrypted vault rows or document objects
              are returned. This limits which ciphertext an authenticated account
              can reach; the master key is still required to decrypt it locally.
            </p>
            <div className={styles.flow} aria-label="Vault access sequence">
              <span>Signed-in account</span><i aria-hidden="true">→</i>
              <span>Active membership</span><i aria-hidden="true">→</i>
              <span>Owned ciphertext</span><i aria-hidden="true">→</i>
              <span>Local unlock</span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <p className={styles.sectionIndex}>03 · PIN and biometrics</p>
          <div className={styles.sectionBody}>
            <h2>Local unlock is a convenience layer, not a second vault.</h2>
            <p>
              A six-digit PIN derives a local wrapping key. A supported platform
              authenticator can also protect a local wrapper. Either method recovers
              the master key into memory for the active unlocked session; neither
              replaces the master key or sends it to Velora.
            </p>
            <p>
              PIN attempts are limited in the interface, but a copied local wrapper
              is still exposed to offline guessing because six digits have a small
              keyspace. Protect the device itself and use the master key when local
              unlock is unavailable or reset.
            </p>
          </div>
        </section>

        <section className={`${styles.section} ${styles.warningSection}`}>
          <p className={styles.sectionIndex}>04 · Recovery</p>
          <div className={styles.sectionBody}>
            <h2>Velora cannot recover a lost master key.</h2>
            <p>
              Resetting the account password only restores account sign-in. It does
              not change, reveal, or recover the vault master key. Without the same
              master key, previously encrypted contents cannot be decrypted by you
              or by Velora.
            </p>
            <p className={styles.warning}>
              Keep a protected offline copy of the master key. Do not store it in the
              same vault as the data it unlocks.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <p className={styles.sectionIndex}>05 · Threat boundaries</p>
          <div className={styles.sectionBody}>
            <h2>Storage encryption cannot secure a compromised endpoint.</h2>
            <p>Velora&rsquo;s current model does not protect against:</p>
            <ul className={styles.boundaries}>
              <li>An unlocked device used by another person</li>
              <li>Device malware or a malicious browser extension</li>
              <li>Phishing, screen capture, clipboard monitoring, or keylogging</li>
              <li>A weak, reused, shared, or exposed master key</li>
              <li>Content deliberately exported or copied after local decryption</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <p className={styles.sectionIndex}>06 · AI-assisted import</p>
          <div className={styles.sectionBody}>
            <h2>Selected import material is processed before encrypted storage.</h2>
            <p>
              AI-assisted import is optional. When you choose text or an image for
              processing, that selected source material is sent through Velora&rsquo;s
              configured processing service so draft records can be extracted. Your
              master key is not included. You review the drafts before the approved
              results are encrypted and saved.
            </p>
            <p>
              If source material must never leave the browser in readable form, use
              manual entry instead of AI-assisted import or image scanning.
            </p>
          </div>
        </section>

        <section className={styles.finalCard}>
          <div>
            <p className={styles.eyebrow}>Private beta</p>
            <h2>Review the boundaries before you request access.</h2>
            <p>Security is strongest when the product and the user each know their part.</p>
          </div>
          <div className={styles.actions}>
            <Link href="/request-access" className={styles.primaryAction}>Request access</Link>
            <Link href="/privacy" className={styles.secondaryAction}>Read the privacy policy</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

