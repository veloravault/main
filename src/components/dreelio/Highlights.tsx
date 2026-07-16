"use client";

import { motion, useReducedMotion } from "framer-motion";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Highlights.module.css";
import { SMALL_FEATURES } from "./data";
import { CARD_ICONS } from "./icons";
import {
  HOVER_LIFT,
  LANDING_VIEWPORT,
  TAP_PRESS,
  revealVariants,
  staggerContainer,
  staggerItem,
} from "./motion";

export function Highlights() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      className={`${shared.section} ${styles.section}`}
      initial={reduceMotion ? false : "hidden"}
      whileInView="show"
      viewport={LANDING_VIEWPORT}
    >
      <div className={shared.container}>
        <motion.div className={shared.sectionHead} variants={revealVariants()}>
          <p className={shared.eyebrow}>Highlights</p>
          <h2 className={shared.h2}>The details that make it click</h2>
        </motion.div>

        <motion.div className={styles.grid} variants={staggerContainer}>
          {SMALL_FEATURES.map((f) => {
            const Icon = CARD_ICONS[f.icon];
            return (
              <motion.article
                key={f.title}
                className={styles.card}
                variants={staggerItem}
                whileHover={reduceMotion ? undefined : HOVER_LIFT}
                whileTap={reduceMotion ? undefined : TAP_PRESS}
              >
                <span className={styles.icon}>
                  <Icon />
                </span>
                <h3 className={styles.title}>{f.title}</h3>
                <p className={styles.body}>{f.body}</p>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </motion.section>
  );
}
