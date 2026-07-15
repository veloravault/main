import Link from "next/link";
import styles from "@/app/landing.module.css";

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div>
        <span>© {new Date().getFullYear()} Velora Vault</span>
        <nav aria-label="Footer navigation">
          <Link href="#security">Security</Link>
          <Link href="#privacy">Privacy</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </div>
    </footer>
  );
}
