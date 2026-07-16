import Link from "next/link";
import { VeloraBrandMark } from "@/components/dreelio/VeloraBrand";
import styles from "./Legal.module.css";

export function LegalHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand}>
          <VeloraBrandMark className={styles.mark} />
          <span>Velora Vault</span>
        </Link>
        <Link href="/" className={styles.back}>
          ← Back to home
        </Link>
      </div>
    </header>
  );
}
