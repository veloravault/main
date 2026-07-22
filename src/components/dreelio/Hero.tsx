"use client";

import { motion, useReducedMotion } from "framer-motion";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Hero.module.css";
import { HeroVaultMedia } from "./HeroVaultMedia";
import { ParallaxMedia } from "./ParallaxMedia";
import {
  HOVER_LIFT,
  TAP_PRESS,
  staggerContainer,
  staggerItem,
} from "./motion";

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className={styles.hero}>
      <motion.div
        className={`${shared.container} ${styles.inner}`}
        // Above-the-fold content: `initial={false}` renders directly at the
        // "show" target so the H1/subtitle/CTA/hero visual never ship as
        // `opacity:0` in the server HTML (that would gate the LCP element
        // behind JS hydration in production, not just in dev).
        initial={false}
        animate="show"
        variants={staggerContainer}
      >
        <motion.h1 className={styles.title} variants={staggerItem}>
          One private vault
          <br />
          for everything that matters
        </motion.h1>
        <motion.p className={styles.subtitle} variants={staggerItem}>
          Passwords, documents, notes, and financial essentials - encrypted on
          your device before they&rsquo;re stored.
        </motion.p>
        <motion.div className={styles.actions} variants={staggerItem}>
          <motion.a
            href="/signup"
            className={`${shared.btn} ${shared.btnDark}`}
            whileHover={reduceMotion ? undefined : HOVER_LIFT}
            whileTap={reduceMotion ? undefined : TAP_PRESS}
          >
            Get started free
          </motion.a>
          <motion.a
            href="#features"
            className={`${shared.btn} ${shared.btnGhost}`}
            whileHover={reduceMotion ? undefined : HOVER_LIFT}
            whileTap={reduceMotion ? undefined : TAP_PRESS}
          >
            See features
          </motion.a>
        </motion.div>

        <ParallaxMedia className={styles.stage} distance={12} delay={0.18} aboveFold>
          <div className={styles.dashboard}>
            <HeroVaultMedia />
          </div>
          <motion.span
            className={styles.badge}
            initial={false}
            animate={{ opacity: 1, x: 0, scale: 1 }}
          >
            <span className={styles.badgeDot} aria-hidden="true" />
            AES-256-GCM · encrypted before storage
          </motion.span>
        </ParallaxMedia>
      </motion.div>
    </section>
  );
}
