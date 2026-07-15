import Link from "next/link";
import styles from "@/app/landing.module.css";
import { VeloraMark } from "@/components/Icons";

export function LandingHeader() {
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
