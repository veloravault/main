"use client";

import { motion, useReducedMotion } from "framer-motion";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Footer.module.css";
import { VeloraBrandMark } from "./VeloraBrand";
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
      <div className={shared.container}>
        <motion.div className={styles.card} variants={staggerContainer}>
          <div className={styles.top}>
            <motion.div className={styles.brandCol} variants={staggerItem}>
              <motion.a
                href="/"
                className={styles.brand}
                whileHover={reduceMotion ? undefined : { x: 2 }}
                whileTap={reduceMotion ? undefined : TAP_PRESS}
              >
                <VeloraBrandMark className={styles.mark} />
                <span>Velora Vault</span>
              </motion.a>
              <p className={styles.desc}>
                A private, encrypted home for passwords, documents, notes,
                and financial essentials.
              </p>
            </motion.div>

            <motion.div className={styles.linkCols} variants={staggerContainer}>
              {FOOTER_COLUMNS.map((col) => (
                <motion.div key={col.heading} className={styles.linkCol} variants={staggerItem}>
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
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className={styles.divider} />

          <div className={styles.bottom}>
            <p>© 2026 Velora Vault. All rights reserved.</p>
          </div>
        </motion.div>
      </div>
    </motion.footer>
  );
}
