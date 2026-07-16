import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Footer.module.css";
import { VeloraBrandMark } from "./VeloraBrand";
import { FOOTER_COLUMNS } from "./data";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={shared.container}>
        <div className={styles.card}>
          <div className={styles.top}>
            <div className={styles.brandCol}>
              <a href="/" className={styles.brand}>
                <VeloraBrandMark className={styles.mark} />
                <span>Velora Vault</span>
              </a>
              <p className={styles.desc}>
                A private, encrypted home for passwords, documents, notes,
                and financial essentials.
              </p>
            </div>

            <div className={styles.linkCols}>
              {FOOTER_COLUMNS.map((col) => (
                <div key={col.heading} className={styles.linkCol}>
                  <p className={styles.colHeading}>{col.heading}</p>
                  <ul>
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <a href={link.href}>{link.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.bottom}>
            <p>© 2026 Velora Vault. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
