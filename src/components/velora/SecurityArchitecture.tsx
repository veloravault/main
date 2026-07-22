"use client";

import { motion, useReducedMotion } from "framer-motion";
import shared from "@/app/velora/velora.module.css";
import styles from "./SecurityArchitecture.module.css";
import { SECURITY_PRINCIPLES } from "./data";
import { VaultSeal } from "./VaultSeal";
import {
  HOVER_LIFT,
  LANDING_VIEWPORT,
  TAP_PRESS,
  revealVariants,
  staggerContainer,
  staggerItem,
} from "./motion";

export function SecurityArchitecture() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id="security"
      className={`${shared.section} ${styles.section}`}
      initial={reduceMotion ? false : "hidden"}
      whileInView="show"
      viewport={LANDING_VIEWPORT}
    >
      <div className={shared.container}>
        <motion.div className={styles.header} variants={revealVariants()}>
          <div>
            <p className={shared.eyebrow}>Security architecture</p>
            <h2 className={shared.h2}>The promise, with the boundaries included.</h2>
            <p className={styles.lead}>
              These are implementation details, not customer quotes. See what is
              encrypted, what Velora cannot recover, and where device security still matters.
            </p>
          </div>
          <VaultSeal compact />
        </motion.div>

        <motion.div className={styles.grid} variants={staggerContainer}>
          {SECURITY_PRINCIPLES.map((principle) => (
            <motion.article
              key={principle.index}
              className={styles.card}
              variants={staggerItem}
              whileHover={reduceMotion ? undefined : HOVER_LIFT}
            >
              <span className={styles.index}>{principle.index}</span>
              <h3>{principle.name}</h3>
              <p>{principle.detail}</p>
            </motion.article>
          ))}
        </motion.div>

        <motion.div className={styles.footer} variants={revealVariants(12, 0.08)}>
          <p>Security is a system of guarantees and limits. Both should be visible.</p>
          <motion.a
            href="/security"
            className={`${shared.btn} ${shared.btnGhost}`}
            whileHover={reduceMotion ? undefined : HOVER_LIFT}
            whileTap={reduceMotion ? undefined : TAP_PRESS}
          >
            How security works
          </motion.a>
        </motion.div>
      </div>
    </motion.section>
  );
}

