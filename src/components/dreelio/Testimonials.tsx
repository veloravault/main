import Image from "next/image";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Testimonials.module.css";
import { TESTIMONIALS } from "./data";

export function Testimonials() {
  const row = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section className={`${shared.section} ${styles.section}`}>
      <div className={shared.container}>
        <blockquote className={styles.bigQuote}>
          &ldquo;Your vault, encrypted before it ever leaves your device&rdquo;
        </blockquote>
        <div className={styles.author}>
          <p className={styles.authorName}>The Velora Vault promise</p>
          <p className={styles.authorRole}>No exceptions.</p>
        </div>
      </div>

      <div className={styles.marquee}>
        <div className={styles.track}>
          {row.map((t, i) => (
            <figure key={`${t.name}-${i}`} className={styles.card}>
              <blockquote className={styles.quote}>&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className={styles.caption}>
                <Image src={t.avatar} alt={t.name} width={40} height={40} className={styles.avatar} />
                <span>
                  <span className={styles.name}>{t.name}</span>
                  <span className={styles.role}>{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
