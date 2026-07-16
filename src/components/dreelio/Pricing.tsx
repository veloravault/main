"use client";

import { motion, useReducedMotion } from "framer-motion";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Pricing.module.css";
import { BETA_STEPS } from "./data";
import {
  HOVER_LIFT,
  LANDING_VIEWPORT,
  TAP_PRESS,
  revealVariants,
  staggerContainer,
  staggerItem,
} from "./motion";

export function Pricing() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id="pricing"
      className={`${shared.section} ${styles.section}`}
      initial={reduceMotion ? false : "hidden"}
      whileInView="show"
      viewport={LANDING_VIEWPORT}
    >
      <div className={shared.container}>
        <motion.div className={shared.sectionHead} variants={revealVariants()}>
          <p className={shared.eyebrow}>Private beta access</p>
          <h2 className={shared.h2}>Free during private beta</h2>
          <p className={styles.intro}>
            Request an invitation and we&rsquo;ll email you if your access is approved.
            There is no credit card and submitting a request does not create an account.
          </p>
        </motion.div>

        <motion.div className={styles.betaPanel} variants={revealVariants(20, 0.06)}>
          <motion.ol className={styles.steps} variants={staggerContainer}>
            {BETA_STEPS.map((step) => (
              <motion.li key={step.index} className={styles.step} variants={staggerItem}>
                <span className={styles.stepIndex}>{step.index}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </div>
              </motion.li>
            ))}
          </motion.ol>

          <motion.div className={styles.actionPanel} variants={staggerItem}>
            <span className={styles.status}><i aria-hidden="true" /> Invitations are manually reviewed</span>
            <h3>Start with a request, not an account.</h3>
            <p>
              If invited, you&rsquo;ll create sign-in credentials and use a separate
              master key that never belongs in the request form.
            </p>
            <motion.a
              href="/request-access"
              className={`${shared.btn} ${shared.btnDark} ${styles.cta}`}
              whileHover={reduceMotion ? undefined : HOVER_LIFT}
              whileTap={reduceMotion ? undefined : TAP_PRESS}
            >
              Request access
            </motion.a>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
