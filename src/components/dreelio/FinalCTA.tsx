import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./FinalCTA.module.css";

export function FinalCTA() {
  return (
    <section id="contact" className={`${shared.section} ${styles.section}`}>
      <div className={`${shared.container} ${styles.inner}`}>
        <h2 className={styles.title}>Ready to get started</h2>
        <p className={styles.subtitle}>Request access to your private vault. No credit card, ever.</p>
        <a href="/request-access" className={`${shared.btn} ${shared.btnDark}`}>
          Request access
        </a>
      </div>
    </section>
  );
}
