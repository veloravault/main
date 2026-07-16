"use client";

import type { CSSProperties } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import Image from "next/image";
import {
  CameraIcon,
  CheckIcon,
  ClipboardPasteIcon,
  FileSpreadsheetIcon,
  FingerprintPatternIcon,
  GlobeIcon,
  MoonIcon,
  SparklesIcon,
  SunIcon,
} from "lucide-react";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Features.module.css";
import {
  APPLE_EASE,
  LANDING_VIEWPORT,
  revealVariants,
  staggerItem,
} from "./motion";

const PIN_DOTS = [true, true, true, true, false, false];
const PIN_NEXT_INDEX = PIN_DOTS.findIndex((filled) => !filled);

const IMPORT_METHODS = [
  { icon: GlobeIcon, label: "Browser export" },
  { icon: ClipboardPasteIcon, label: "Paste a list" },
  { icon: CameraIcon, label: "Snap a photo" },
  { icon: FileSpreadsheetIcon, label: "CSV file" },
  { icon: SparklesIcon, label: "Magic parse" },
];

const FOUND_LOGINS = [
  {
    name: "Netflix",
    logo: "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.png",
  },
  {
    name: "Spotify",
    logo: "https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_Green.png",
  },
  { name: "Amazon", logo: "https://www.amazon.com/favicon.ico" },
];

const cardVariants = revealVariants(24);

const dotVariants: Variants = {
  hidden: { scale: 0.4, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.4, ease: APPLE_EASE },
  },
};

const rowVariants = staggerItem;

const checkVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: { delay: 0.2, type: "spring", stiffness: 420, damping: 16 },
  },
};

export function Features() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="features" className={`${shared.section} ${styles.section}`}>
      <div className={shared.container}>
        <motion.div
          className={shared.sectionHead}
          initial={reduceMotion ? false : "hidden"}
          whileInView="show"
          viewport={LANDING_VIEWPORT}
          variants={revealVariants(18)}
        >
          <p className={shared.eyebrow}>Features</p>
          <h2 className={shared.h2}>
            Built for privacy,
            <br />
            powered by simplicity
          </h2>
        </motion.div>

        <div className={styles.topRow}>
          {/* Card 1 — personalization */}
          <motion.article
            className={styles.bigCard}
            initial={reduceMotion ? false : "hidden"}
            whileInView="show"
            viewport={LANDING_VIEWPORT}
            variants={cardVariants}
            transition={{
              duration: 0.55,
              ease: "easeOut",
              staggerChildren: reduceMotion ? 0 : 0.09,
              delayChildren: reduceMotion ? 0 : 0.2,
            }}
          >
            <h3 className={styles.cardTitle}>
              Made to feel like your own private space
            </h3>
            <div className={styles.cardMedia}>
              <div className={styles.pinPad}>
                <span className={styles.pinPadLabel}>Unlock PIN</span>
                <div className={styles.pinRow}>
                  {PIN_DOTS.map((filled, i) => (
                    <motion.span
                      key={i}
                      className={styles.pinDot}
                      data-filled={filled}
                      data-next={i === PIN_NEXT_INDEX}
                      variants={filled ? dotVariants : undefined}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.toggleRow}>
                <div className={styles.brandingToggle}>
                  <span className={styles.biometricIconWrap}>
                    <FingerprintPatternIcon className={styles.brandingIcon} aria-hidden="true" />
                  </span>
                  <span className={styles.brandingLabel}>Enable biometric unlock</span>
                  <span className={styles.switch} data-on>
                    <span />
                  </span>
                </div>
                <div className={styles.themeToggle}>
                  <div className={styles.themeToggleGlider} aria-hidden="true" />
                  <span>
                    <MoonIcon aria-hidden="true" />
                  </span>
                  <span>
                    <SunIcon aria-hidden="true" />
                  </span>
                </div>
              </div>
            </div>
            <p className={styles.cardBody}>
              <strong>Personalize every detail.</strong> Choose light or dark
              mode, set a PIN, and turn on biometric unlock so opening your
              vault feels effortless — and still only yours.
            </p>
          </motion.article>

          {/* Card 2 — magic import */}
          <motion.article
            className={styles.bigCard}
            initial={reduceMotion ? false : "hidden"}
            whileInView="show"
            viewport={LANDING_VIEWPORT}
            variants={cardVariants}
            transition={{
              duration: 0.55,
              ease: "easeOut",
              delay: reduceMotion ? 0 : 0.1,
              staggerChildren: reduceMotion ? 0 : 0.13,
              delayChildren: reduceMotion ? 0 : 0.45,
            }}
          >
            <h3 className={styles.cardTitle}>
              Bring your passwords in, in seconds
            </h3>
            <div className={styles.cardMedia}>
              <div className={styles.importGrid}>
                {IMPORT_METHODS.map(({ icon: Icon, label }, i) => (
                  <div
                    key={label}
                    className={styles.importTile}
                    style={{ "--spotlight-delay": `${i * 1.4}s` } as CSSProperties}
                  >
                    <Icon className={styles.importIcon} aria-hidden="true" />
                    <span className={styles.importLabel}>{label}</span>
                  </div>
                ))}
              </div>

              <div className={styles.foundPanel}>
                <p className={styles.foundCaption}>3 logins found</p>
                <div className={styles.foundList}>
                  {FOUND_LOGINS.map(({ name, logo }) => (
                    <motion.div key={name} className={styles.foundRow} variants={rowVariants}>
                      <span className={styles.foundAvatar}>
                        <Image
                          className={styles.foundLogo}
                          src={logo}
                          alt=""
                          width={26}
                          height={26}
                        />
                      </span>
                      <span className={styles.foundName}>{name}</span>
                      <span className={styles.foundDots}>••••••••••</span>
                      <motion.span className={styles.foundCheckWrap} variants={checkVariants}>
                        <CheckIcon className={styles.foundCheck} aria-hidden="true" />
                      </motion.span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
            <p className={styles.cardBody}>
              <strong>Magic import.</strong> Paste a list, export a CSV from
              your browser, or snap a photo — Velora Vault parses it and shows
              you exactly what it found before anything is saved.
            </p>
          </motion.article>
        </div>
      </div>
    </section>
  );
}
