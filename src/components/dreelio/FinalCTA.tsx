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

export function FinalCTA() {
  const reduceMotion = useReducedMotion();

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
        <motion.h2 className={styles.title} variants={staggerItem}>Request a private-beta invitation</motion.h2>
        <motion.p className={styles.subtitle} variants={staggerItem}>
          Every request is manually reviewed. If approved, your invitation email explains the next step.
        </motion.p>
        <motion.a
          href="/request-access"
          className={`${shared.btn} ${shared.btnDark}`}
          variants={staggerItem}
          whileHover={reduceMotion ? undefined : HOVER_LIFT}
          whileTap={reduceMotion ? undefined : TAP_PRESS}
        >
          Request access
        </motion.a>
      </motion.div>
    </motion.section>
  );
}
