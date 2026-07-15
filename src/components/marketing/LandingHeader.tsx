"use client";

import Link from "next/link";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import styles from "@/app/landing.module.css";
import { VeloraMark } from "@/components/VeloraMark";

export function LandingHeader() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.brand} href="/" aria-label="Velora Vault home">
          <VeloraMark className={styles.vaultMark} aria-hidden="true" />
          <span>Velora Vault</span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Primary navigation">
          <Link href="#security">Security</Link>
          <Link href="#privacy">Privacy</Link>
        </nav>

        <nav className={styles.headerActions} aria-label="Account navigation">
          <button
            type="button"
            className={styles.themeToggle}
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
          >
            {resolvedTheme === "dark" ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
          </button>
          <Link className={styles.signInLink} href="/login">
            Sign in
          </Link>
          <Link className={styles.compactCta} href="/request-access">
            Request access
          </Link>
        </nav>
      </div>
    </header>
  );
}
