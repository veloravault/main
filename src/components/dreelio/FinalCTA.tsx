"use client";

import { motion, useReducedMotion } from "framer-motion";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./FinalCTA.module.css";
import {
  HOVER_LIFT,
  LANDING_VIEWPORT,
  TAP_PRESS,
  staggerContainer,
  staggerItem,
} from "./motion";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

export function FinalCTA() {
  const reduceMotion = useReducedMotion();
  const { openAuth } = useAuthModal();

  return (
    <motion.section
      id="contact"
      className={`${shared.section} ${styles.section}`}
      initial={reduceMotion ? false : "hidden"}
      whileInView="show"
      viewport={LANDING_VIEWPORT}
    >
      <motion.div
        className={`${shared.container} ${styles.inner}`}
        variants={staggerContainer}
      >
        <motion.h2 className={styles.title} variants={staggerItem}>Create your Velora Vault account</motion.h2>
        <motion.p className={styles.subtitle} variants={staggerItem}>
          Sign up in a minute. Confirm your email, set a master key, and your vault is ready.
        </motion.p>
        <motion.button
          type="button"
          onClick={() => openAuth("sign-up")}
          className={`${shared.btn} ${shared.btnDark}`}
          variants={staggerItem}
          whileHover={reduceMotion ? undefined : HOVER_LIFT}
          whileTap={reduceMotion ? undefined : TAP_PRESS}
        >
          Sign up free
        </motion.button>
      </motion.div>
    </motion.section>
  );
}
