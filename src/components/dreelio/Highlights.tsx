import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Highlights.module.css";
import { SMALL_FEATURES } from "./data";
import { CARD_ICONS } from "./icons";

export function Highlights() {
  return (
    <section className={`${shared.section} ${styles.section}`}>
      <div className={shared.container}>
        <div className={shared.sectionHead}>
          <p className={shared.eyebrow}>Highlights</p>
          <h2 className={shared.h2}>The details that make it click</h2>
        </div>

        <div className={styles.grid}>
          {SMALL_FEATURES.map((f) => {
            const Icon = CARD_ICONS[f.icon];
            return (
              <article key={f.title} className={styles.card}>
                <span className={styles.icon}>
                  <Icon />
                </span>
                <h3 className={styles.title}>{f.title}</h3>
                <p className={styles.body}>{f.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
