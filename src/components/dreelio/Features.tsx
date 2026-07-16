import Image from "next/image";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Features.module.css";
import { INTEGRATIONS } from "./data";

const SWATCHES = ["#4a3f38", "#7c756f", "#f2c230", "#f07c25", "#279a4a", "#3d7bf0"];

export function Features() {
  return (
    <section id="features" className={`${shared.section} ${styles.section}`}>
      <div className={shared.container}>
        <div className={shared.sectionHead}>
          <p className={shared.eyebrow}>Features</p>
          <h2 className={shared.h2}>
            Built for privacy,
            <br />
            powered by simplicity
          </h2>
        </div>

        <div className={styles.topRow}>
          {/* Card 1 — personalization */}
          <article className={styles.bigCard}>
            <h3 className={styles.cardTitle}>
              Made to feel like your own private space
            </h3>
            <div className={styles.cardMedia}>
              <div className={styles.swatchBar}>
                {SWATCHES.map((c, i) => (
                  <span
                    key={c}
                    className={styles.swatch}
                    style={{ background: c }}
                    data-active={i === 0}
                  >
                    {i === 0 && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12.5 4 4 10-10" />
                      </svg>
                    )}
                  </span>
                ))}
                <span className={styles.swatchGhost} />
                <span className={styles.swatchGhost} />
              </div>
              <div className={styles.toggleRow}>
                <div className={styles.brandingToggle}>
                  <span className={styles.switch} data-on>
                    <span />
                  </span>
                  Enable biometric unlock
                </div>
                <div className={styles.themeToggle}>
                  <span data-active>🌙</span>
                  <span>☀️</span>
                </div>
              </div>
            </div>
            <p className={styles.cardBody}>
              <strong>Personalize every detail.</strong> Choose light or dark
              mode, set a PIN, and turn on biometric unlock so opening your
              vault feels effortless — and still only yours.
            </p>
          </article>

          {/* Card 2 — magic import */}
          <article className={styles.bigCard}>
            <h3 className={styles.cardTitle}>
              Bring your passwords in, in seconds
            </h3>
            <div className={styles.cardMedia}>
              <div className={styles.integrationGrid}>
                {INTEGRATIONS.map((tool, i) => (
                  <span key={`${tool.alt}-${i}`} className={styles.integration}>
                    <Image src={tool.src} alt={tool.alt} width={34} height={34} />
                  </span>
                ))}
              </div>
            </div>
            <p className={styles.cardBody}>
              <strong>Magic import.</strong> Paste a list, export a CSV from
              your browser, or snap a photo — Velora Vault parses it and shows
              you exactly what it found before anything is saved.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
