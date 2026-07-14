import Link from "next/link";
import styles from "@/app/landing.module.css";

function VaultMark() {
  return (
    <span className={styles.vaultMark} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <i />
    </span>
  );
}

export function LandingHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.brand} href="/" aria-label="Telkar Vault home">
          <VaultMark />
          <span>Telkar Vault</span>
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
