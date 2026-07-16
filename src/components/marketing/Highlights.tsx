import { LayersIcon, ShieldCheckIcon, UserCheckIcon } from "lucide-react";
import styles from "@/app/landing.module.css";

const highlights = [
  {
    icon: ShieldCheckIcon,
    title: "Encrypted before storage",
    description:
      "Sensitive vault values are encrypted with your master key before they ever reach the database.",
  },
  {
    icon: LayersIcon,
    title: "One private place",
    description:
      "Passwords, documents, notes and financial essentials, collected in a single calm, encrypted home.",
  },
  {
    icon: UserCheckIcon,
    title: "Access is considered",
    description:
      "Every invitation is reviewed by hand. Admission is considered, not automatic.",
  },
];

export function Highlights() {
  return (
    <section className={styles.highlightsSection} aria-labelledby="highlights-title">
      <div className={styles.sectionHeading}>
        <p className={styles.sectionEyebrow}>Why Velora Vault stands out</p>
        <h2 id="highlights-title">Considered, not automatic.</h2>
      </div>

      <div className={styles.highlightsGrid}>
        {highlights.map(({ icon: Icon, title, description }) => (
          <article className={styles.highlightCard} key={title}>
            <span className={styles.highlightGlyph} aria-hidden="true">
              <Icon />
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
