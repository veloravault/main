"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MoonIcon, SunIcon } from "lucide-react";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Nav.module.css";
import { VeloraBrandMark } from "./VeloraBrand";
import { NAV_LINKS } from "./data";
import {
  HOVER_LIFT,
  LANDING_VIEWPORT,
  TAP_PRESS,
  revealVariants,
} from "./motion";
import { useTheme } from "@/components/ThemeProvider";

type ThemeToggleProps = {
  className?: string;
  isDark: boolean;
  onToggle: () => void;
  reduceMotion: boolean | null;
};

function ThemeToggle({
  className,
  isDark,
  onToggle,
  reduceMotion,
}: ThemeToggleProps) {
  return (
    <motion.button
      type="button"
      className={className}
      onClick={onToggle}
      aria-label="Toggle appearance"
      whileHover={reduceMotion ? undefined : { scale: 1.04 }}
      whileTap={reduceMotion ? undefined : TAP_PRESS}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "sun" : "moon"}
          initial={reduceMotion ? false : { opacity: 0, rotate: -30, scale: 0.82 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, rotate: 30, scale: 0.82 }}
          transition={{ duration: 0.16 }}
        >
          {isDark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  return (
    <motion.header
      className={styles.header}
      initial={reduceMotion ? false : "hidden"}
      animate="show"
      variants={revealVariants(14, 0.04)}
    >
      <nav className={styles.nav} aria-label="Primary">
        <motion.a
          href="/"
          className={styles.brand}
          aria-label="Velora Vault home"
          whileHover={reduceMotion ? undefined : { scale: 1.01 }}
          whileTap={reduceMotion ? undefined : TAP_PRESS}
        >
          <VeloraBrandMark className={styles.mark} />
          <span>Velora Vault</span>
        </motion.a>

        <ul className={styles.links}>
          {NAV_LINKS.map((link) => (
            <motion.li
              key={link.label}
              whileHover={reduceMotion ? undefined : { y: -1 }}
            >
              <a href={link.href}>{link.label}</a>
            </motion.li>
          ))}
        </ul>

        <div className={styles.authActions}>
          <motion.a
            href="/login"
            className={styles.signIn}
            whileHover={reduceMotion ? undefined : { y: -1 }}
          >
            Sign in
          </motion.a>
          <motion.a
            href="/signup"
            className={`${shared.btn} ${shared.btnDark} ${styles.cta}`}
            whileHover={reduceMotion ? undefined : HOVER_LIFT}
            whileTap={reduceMotion ? undefined : TAP_PRESS}
          >
            Sign up
          </motion.a>
          <ThemeToggle
            className={styles.themeToggle}
            isDark={resolvedTheme === "dark"}
            onToggle={toggleTheme}
            reduceMotion={reduceMotion}
          />
        </div>

        <div className={styles.mobileControls}>
          <ThemeToggle
            className={styles.mobileThemeToggle}
            isDark={resolvedTheme === "dark"}
            onToggle={toggleTheme}
            reduceMotion={reduceMotion}
          />
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

      <AnimatePresence initial={false}>
        {open && (
        <motion.div
          className={styles.mobileMenu}
          initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.99 }}
          transition={{ duration: 0.24 }}
          viewport={LANDING_VIEWPORT}
        >
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
            href="/signup"
            className={`${shared.btn} ${shared.btnDark}`}
            onClick={() => setOpen(false)}
          >
            Sign up
          </a>
        </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
