"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Hero.module.css";
import { ParallaxMedia } from "./ParallaxMedia";
import { VaultSeal } from "./VaultSeal";
import {
  HOVER_LIFT,
  TAP_PRESS,
  staggerContainer,
  staggerItem,
} from "./motion";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

export function Hero() {
  const reduceMotion = useReducedMotion();
  const { openAuth } = useAuthModal();

  return (
    <section className={styles.hero}>
      <motion.div
        className={`${shared.container} ${styles.inner}`}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        variants={staggerContainer}
      >
        <motion.h1 className={styles.title} variants={staggerItem}>
          One private vault
          <br />
          for everything that matters
        </motion.h1>
        <motion.p className={styles.subtitle} variants={staggerItem}>
          Passwords, documents, notes, and financial essentials — encrypted on
          your device before they&rsquo;re stored.
        </motion.p>
        <motion.div className={styles.actions} variants={staggerItem}>
          <motion.button
            type="button"
            onClick={() => openAuth("sign-up")}
            className={`${shared.btn} ${shared.btnDark}`}
            whileHover={reduceMotion ? undefined : HOVER_LIFT}
            whileTap={reduceMotion ? undefined : TAP_PRESS}
          >
            Sign up free
          </motion.button>
          <motion.a
            href="#features"
            className={`${shared.btn} ${shared.btnGhost}`}
            whileHover={reduceMotion ? undefined : HOVER_LIFT}
            whileTap={reduceMotion ? undefined : TAP_PRESS}
          >
            See features
          </motion.a>
        </motion.div>

        <ParallaxMedia className={styles.stage} distance={12} delay={0.18}>
          <motion.span className={styles.seal} variants={staggerItem}>
            <VaultSeal />
          </motion.span>
          <div className={styles.dashboard}>
            <Image
              src="/dreelio/img/hero-dashboard.png"
              alt="An image of Velora Vault's dashboard"
              width={1072}
              height={744}
              priority
              sizes="(max-width: 1000px) 100vw, 1000px"
            />
          </div>
          <motion.span
            className={styles.badge}
            initial={reduceMotion ? false : { opacity: 0, x: 10, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.72, duration: 0.42 }}
          >
            <span className={styles.badgeDot} aria-hidden="true" />
            AES-256-GCM · encrypted before storage
          </motion.span>
        </ParallaxMedia>
      </motion.div>
    </section>
  );
}
