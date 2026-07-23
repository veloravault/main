"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheckIcon } from "lucide-react";
import styles from "./Footer.module.css";
import { VeloraBrandMark } from "./VeloraBrand";
import { PaymentBadges } from "./PaymentBadges";
import { FOOTER_COLUMNS } from "./data";
import { TAP_PRESS } from "./motion";

// The footer holds Privacy/Terms links and always sits at the bottom of the
// page, so it doesn't get a scroll-triggered entrance animation: a
// `whileInView` reveal here can leave it (and those links) stuck at
// `opacity:0` if the page is scrolled non-linearly - an anchor jump, browser
// scroll restoration, or a fast trackpad flick can all land past the
// intersection threshold before Framer Motion registers it. Hover/tap
// feedback on individual links is unaffected and stays.
export function Footer() {
  const reduceMotion = useReducedMotion();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.primary}>
          <div className={styles.identity}>
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
              A private home for passwords, documents, notes, credentials, and financial essentials.
            </p>
          </div>

          <div className={styles.linkCols}>
            {FOOTER_COLUMNS.map((col) => (
              <nav key={col.heading} className={styles.linkCol} aria-label={col.heading}>
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
              </nav>
            ))}
          </div>
        </div>

        <div className={styles.trustRail}>
          <PaymentBadges className={styles.paymentBadges} />
          <span className={styles.securedBy}>
            <ShieldCheckIcon aria-hidden="true" /> Payments secured by Razorpay
          </span>
        </div>

        <div className={styles.legal}>
          <p>© 2026 Velora Vault. All rights reserved.</p>
          <nav aria-label="Legal">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
