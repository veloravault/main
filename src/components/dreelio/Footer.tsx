"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheckIcon } from "lucide-react";
import styles from "./Footer.module.css";
import { VeloraBrandMark } from "./VeloraBrand";
import { PaymentBadges } from "./PaymentBadges";
import { FOOTER_COLUMNS } from "./data";
import {
  LANDING_VIEWPORT,
  TAP_PRESS,
  revealVariants,
  staggerContainer,
  staggerItem,
} from "./motion";

export function Footer() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.footer
      className={styles.footer}
      initial={reduceMotion ? false : "hidden"}
      whileInView="show"
      viewport={LANDING_VIEWPORT}
      variants={revealVariants(18)}
    >
      <motion.div className={styles.inner} variants={staggerContainer}>
        <div className={styles.primary}>
          <motion.div className={styles.identity} variants={staggerItem}>
            <motion.a
              href="/"
              className={styles.brand}
              aria-label="Velora Vault home"
              whileHover={reduceMotion ? undefined : { x: 2 }}
              whileTap={reduceMotion ? undefined : TAP_PRESS}
            >
              <VeloraBrandMark className={styles.mark} />
              <span>Velora Vault</span>
            </motion.a>
            <p className={styles.promise}>Encrypted before storage. Yours to unlock.</p>
            <p className={styles.desc}>
              A private home for passwords, documents, notes, and financial essentials.
            </p>
          </motion.div>

          <motion.div className={styles.linkCols} variants={staggerContainer}>
            {FOOTER_COLUMNS.map((col) => (
              <motion.nav
                key={col.heading}
                className={styles.linkCol}
                aria-label={col.heading}
                variants={staggerItem}
              >
                <p className={styles.colHeading}>{col.heading}</p>
                <ul>
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <motion.a
                        href={link.href}
                        whileHover={reduceMotion ? undefined : { x: 2 }}
                      >
                        {link.label}
                      </motion.a>
                    </li>
                  ))}
                </ul>
              </motion.nav>
            ))}
          </motion.div>
        </div>

        <motion.div className={styles.trustRail} variants={staggerItem}>
          <PaymentBadges className={styles.paymentBadges} />
          <span className={styles.securedBy}>
            <ShieldCheckIcon aria-hidden="true" /> Payments secured by Razorpay
          </span>
        </motion.div>

        <div className={styles.legal}>
          <p>© 2026 Velora Vault. All rights reserved.</p>
          <nav aria-label="Legal">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </nav>
        </div>
      </motion.div>
    </motion.footer>
  );
}
