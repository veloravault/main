"use client";

import { motion, useReducedMotion } from "framer-motion";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Pricing.module.css";
import { PRICING_TIERS } from "./pricing-data";
import {
  HOVER_LIFT,
  LANDING_VIEWPORT,
  TAP_PRESS,
  revealVariants,
  staggerContainer,
  staggerItem,
} from "./motion";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

const FREE_HIGHLIGHTS = PRICING_TIERS[0].features.slice(0, 4);

export function Pricing() {
  const reduceMotion = useReducedMotion();
  const { openAuth } = useAuthModal();

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
          <p className={shared.eyebrow}>Pricing</p>
          <h2 className={shared.h2}>Start free. Upgrade when you need to.</h2>
          <p className={styles.intro}>
            No credit card to sign up. Create your account, set your master key, and your vault is ready.
          </p>
        </motion.div>

        <motion.div className={styles.betaPanel} variants={revealVariants(20, 0.06)}>
          <motion.ol className={styles.steps} variants={staggerContainer}>
            {FREE_HIGHLIGHTS.map((feature) => (
              <motion.li key={feature} className={styles.step} variants={staggerItem}>
                <span className={styles.stepIndex}>✓</span>
                <div>
                  <h3 className={styles.stepFeature}>{feature}</h3>
                </div>
              </motion.li>
            ))}
          </motion.ol>

          <motion.div className={styles.actionPanel} variants={staggerItem}>
            <span className={styles.status}><i aria-hidden="true" /> Free tier, no card required</span>
            <h3>Ready when you are.</h3>
            <p>
              Sign up with an email and password. Your vault master key is set
              separately and never touches our servers.
            </p>
            <motion.button
              type="button"
              onClick={() => openAuth("sign-up")}
              className={`${shared.btn} ${shared.btnDark} ${styles.cta}`}
              whileHover={reduceMotion ? undefined : HOVER_LIFT}
              whileTap={reduceMotion ? undefined : TAP_PRESS}
            >
              Sign up free
            </motion.button>
            <a href="/pricing" className={styles.compareLink}>Compare all plans</a>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
