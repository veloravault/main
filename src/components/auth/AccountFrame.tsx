"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { VeloraBrandMark } from "@/components/dreelio/VeloraBrand";
import styles from "./account-frame.module.css";

export function AccountFrame({ children }: { children: ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const isDark = resolvedTheme === "dark";

  return (
    <div className={styles.frame}>
      <motion.header
        className={styles.header}
        initial={reduceMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        <motion.a
          href="/"
          className={styles.brand}
          aria-label="Velora Vault home"
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        >
          <VeloraBrandMark className={styles.mark} />
          <span>Velora Vault</span>
        </motion.a>

        <motion.button
          type="button"
          className={styles.themeToggle}
          aria-label="Toggle appearance"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          whileHover={reduceMotion ? undefined : { scale: 1.04 }}
          whileTap={reduceMotion ? undefined : { scale: 0.92 }}
        >
          {isDark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
        </motion.button>
      </motion.header>

      <div className={styles.content}>{children}</div>
    </div>
  );
}
