"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import styles from "./auth-shell.module.css";

export type AuthMode = "sign-in" | "sign-up";

type AuthShellProps = {
  title: string;
  description: ReactNode;
  eyebrow?: string;
  mode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
  children: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
};

const modes: Array<{ value: AuthMode; label: string }> = [
  { value: "sign-in", label: "Sign In" },
  { value: "sign-up", label: "Sign Up" },
];

export function AuthShell({
  title,
  description,
  eyebrow,
  mode,
  onModeChange,
  children,
  footer,
  compact = false,
}: AuthShellProps) {
  const reduceMotion = useReducedMotion();
  const contentKey = mode ?? title;

  return (
    <main className={styles.page}>
      <motion.section
        className={`${styles.stage} ${compact ? styles.compact : ""}`}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
      >
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}

        <AnimatePresence mode="wait" initial={false}>
          <motion.header
            key={`heading-${contentKey}`}
            className={styles.heading}
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
          >
            <h1>{title}</h1>
            <p>{description}</p>
          </motion.header>
        </AnimatePresence>

        {mode && onModeChange && (
          <div className={styles.segmented} role="group" aria-label="Access method">
            {modes.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={mode === item.value}
                onClick={() => onModeChange(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`content-${contentKey}`}
            className={styles.content}
            initial={reduceMotion ? false : { opacity: 0, x: mode === "sign-up" ? 14 : -14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: mode === "sign-up" ? -14 : 14 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>

        {footer && <footer className={styles.footer}>{footer}</footer>}
      </motion.section>
    </main>
  );
}
