import Image from "next/image";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={`${shared.container} ${styles.inner}`}>
        <h1 className={styles.title}>
          One private vault
          <br />
          for everything that matters
        </h1>
        <p className={styles.subtitle}>
          Passwords, documents, notes, and financial essentials — encrypted on
          your device before they&rsquo;re ever saved. Only you hold the key.
        </p>
        <div className={styles.actions}>
          <a href="#pricing" className={`${shared.btn} ${shared.btnDark}`}>
            Request access
          </a>
          <a href="#features" className={`${shared.btn} ${shared.btnGhost}`}>
            See features
          </a>
        </div>

        <div className={styles.stage}>
          <div className={styles.dashboard}>
            <Image
              src="/dreelio/img/hero-dashboard.png"
              alt="An image of Velora Vault's dashboard"
              width={1072}
              height={744}
              priority
              sizes="(max-width: 1000px) 100vw, 1000px"
            />
          </div>
          <span className={styles.badge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M3 3h18v6H3zM3 9h12v6H3zM3 15h6v6H3z" />
            </svg>
            AES-256 encrypted
          </span>
        </div>
      </div>
    </section>
  );
}
