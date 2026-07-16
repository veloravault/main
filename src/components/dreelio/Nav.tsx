"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MoonIcon, SunIcon } from "lucide-react";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Nav.module.css";
import { VeloraBrandMark } from "./VeloraBrand";
import { NAV_LINKS } from "./data";
import { useTheme } from "@/components/ThemeProvider";

export function Nav() {
  const [open, setOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  const ThemeToggle = ({ className }: { className?: string }) => (
    <button
      type="button"
      className={className}
      onClick={toggleTheme}
      aria-label="Toggle appearance"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={resolvedTheme === "dark" ? "sun" : "moon"}
          initial={reduceMotion ? false : { opacity: 0, rotate: -30, scale: 0.82 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, rotate: 30, scale: 0.82 }}
          transition={{ duration: 0.16 }}
        >
          {resolvedTheme === "dark" ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Primary">
        <a href="#" className={styles.brand} aria-label="Velora Vault home">
          <VeloraBrandMark className={styles.mark} />
          <span>Velora Vault</span>
        </a>

        <ul className={styles.links}>
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>

        <div className={styles.authActions}>
          <a href="/login" className={styles.signIn}>
            Sign in
          </a>
          <a href="/request-access" className={`${shared.btn} ${shared.btnDark} ${styles.cta}`}>
            Request access
          </a>
          <ThemeToggle className={styles.themeToggle} />
        </div>

        <div className={styles.mobileControls}>
          <ThemeToggle className={styles.mobileThemeToggle} />
          <button
            className={styles.burger}
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span data-open={open} />
            <span data-open={open} />
          </button>
        </div>
      </nav>

      {open && (
        <div className={styles.mobileMenu}>
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <a
            href="/login"
            className={styles.mobileSignIn}
            onClick={() => setOpen(false)}
          >
            Sign in
          </a>
          <a
            href="/request-access"
            className={`${shared.btn} ${shared.btnDark}`}
            onClick={() => setOpen(false)}
          >
            Request access
          </a>
        </div>
      )}
    </header>
  );
}
