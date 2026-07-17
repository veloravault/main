"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon, CheckIcon, EyeOffIcon } from "lucide-react";
import styles from "@/app/security/security.module.css";
import {
  LANDING_VIEWPORT,
  HOVER_LIFT,
  TAP_PRESS,
  revealVariants,
  staggerContainer,
  staggerItem,
} from "./motion";
import { RecoveryVisual, SecurityFlowVisual, SecurityHeroVisual } from "./SecurityVisuals";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

const CRYPTO_FACTS = [
  ["Cipher", "AES-256-GCM"],
  ["Key derivation", "PBKDF2-SHA-256 · 600,000 iterations"],
  ["Per operation", "Fresh 16-byte salt · fresh 12-byte IV"],
  ["Key handling", "Master key held in memory while unlocked"],
] as const;

const THREAT_BOUNDARIES = [
  "An unlocked device used by another person",
  "Device malware or a malicious browser extension",
  "Phishing, screen capture, clipboard monitoring, or keylogging",
  "A weak, reused, shared, or exposed master key",
  "Content deliberately exported or copied after local decryption",
] as const;

export function SecurityPageContent() {
  const reduceMotion = useReducedMotion();
  const { openAuth } = useAuthModal();
  const reveal = reduceMotion ? undefined : revealVariants(22);

  return (
    <main className={styles.page}>
      <motion.section
        className={styles.hero}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        variants={staggerContainer}
      >
        <motion.div className={styles.heroCopy} variants={staggerItem}>
          <p className={styles.eyebrow}>Security architecture</p>
          <h1>What Velora protects—and what it cannot.</h1>
          <p>
            Security claims should be inspectable. This page describes the
            encryption and access controls implemented today, along with the
            recovery and device-level risks they do not solve.
          </p>
          <a className={styles.jumpLink} href="#security-model">
            Follow the security model <ArrowRightIcon aria-hidden="true" />
          </a>
        </motion.div>
        <motion.div className={styles.heroVisual} variants={staggerItem}>
          <SecurityHeroVisual />
        </motion.div>
      </motion.section>

      <motion.section
        className={styles.factGrid}
        aria-label="Implemented cryptography"
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={LANDING_VIEWPORT}
        variants={staggerContainer}
      >
        {CRYPTO_FACTS.map(([label, value]) => (
          <motion.article key={label} className={styles.fact} variants={staggerItem}>
            <span>{label}</span>
            <strong>{value}</strong>
            <CheckIcon aria-hidden="true" />
          </motion.article>
        ))}
      </motion.section>

      <div id="security-model" className={styles.story}>
        <motion.section
          className={styles.storyRow}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "show"}
          viewport={LANDING_VIEWPORT}
          variants={reveal}
        >
          <div className={styles.sectionBody}>
            <p className={styles.sectionIndex}>01 · Stored vault data</p>
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
          <SecurityFlowVisual mode="encryption" />
        </motion.section>

        <motion.section
          className={`${styles.storyRow} ${styles.storyRowReverse}`}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "show"}
          viewport={LANDING_VIEWPORT}
          variants={reveal}
        >
          <div className={styles.sectionBody}>
            <p className={styles.sectionIndex}>02 · Access control</p>
            <h2>Encryption and authorization do different jobs.</h2>
            <p>
              Supabase row-level security policies require record ownership and
              active membership before encrypted vault rows or document objects
              are returned. This limits which ciphertext an authenticated account
              can reach; the master key is still required to decrypt it locally.
            </p>
            <ol className={styles.accessSteps} aria-label="Vault access sequence">
              {[
                "Signed-in account",
                "Active membership",
                "Owned ciphertext",
                "Local unlock",
              ].map((step, index) => (
                <li key={step}><span>{index + 1}</span>{step}</li>
              ))}
            </ol>
          </div>
          <SecurityFlowVisual mode="authorization" />
        </motion.section>

        <motion.section
          className={styles.storyRow}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "show"}
          viewport={LANDING_VIEWPORT}
          variants={reveal}
        >
          <div className={styles.sectionBody}>
            <p className={styles.sectionIndex}>03 · PIN and biometrics</p>
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
          <SecurityFlowVisual mode="unlock" />
        </motion.section>
      </div>

      <motion.section
        className={styles.recoverySection}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={LANDING_VIEWPORT}
        variants={reveal}
      >
        <div className={styles.sectionBody}>
          <p className={styles.sectionIndex}>04 · Recovery</p>
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
        <RecoveryVisual />
      </motion.section>

      <motion.section
        className={styles.boundarySection}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={LANDING_VIEWPORT}
        variants={reveal}
      >
        <div className={styles.sectionHeading}>
          <p className={styles.sectionIndex}>05 · Threat boundaries</p>
          <h2>Storage encryption cannot secure a compromised endpoint.</h2>
          <p>Velora&rsquo;s current model does not protect against:</p>
        </div>
        <motion.ul className={styles.boundaries} variants={staggerContainer}>
          {THREAT_BOUNDARIES.map((boundary) => (
            <motion.li key={boundary} variants={staggerItem}>
              <EyeOffIcon aria-hidden="true" />
              <span>{boundary}</span>
            </motion.li>
          ))}
        </motion.ul>
      </motion.section>

      <motion.section
        className={styles.importSection}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={LANDING_VIEWPORT}
        variants={reveal}
      >
        <p className={styles.sectionIndex}>06 · AI-assisted import</p>
        <div className={styles.importGrid}>
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
          <div className={styles.importChoice} aria-label="Import privacy choice">
            <span>Selected source</span>
            <ArrowRightIcon aria-hidden="true" />
            <strong>Review drafts</strong>
            <ArrowRightIcon aria-hidden="true" />
            <span>Encrypt &amp; save</span>
          </div>
        </div>
      </motion.section>

      <motion.section
        className={styles.finalCard}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={LANDING_VIEWPORT}
        variants={reveal}
      >
        <div>
          <p className={styles.eyebrow}>Get started</p>
          <h2>Review the boundaries before you sign up.</h2>
          <p>Security is strongest when the product and the user each know their part.</p>
        </div>
        <div className={styles.actions}>
          <motion.div whileHover={reduceMotion ? undefined : HOVER_LIFT} whileTap={reduceMotion ? undefined : TAP_PRESS}>
            <button type="button" onClick={() => openAuth("sign-up")} className={styles.primaryAction}>Sign up free</button>
          </motion.div>
          <Link href="/privacy" className={styles.secondaryAction}>Read the privacy policy</Link>
        </div>
      </motion.section>
    </main>
  );
}
