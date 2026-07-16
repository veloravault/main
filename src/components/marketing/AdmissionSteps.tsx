import Link from "next/link";
import styles from "@/app/landing.module.css";

const steps = [
  {
    label: "Step 01",
    title: "Request access",
    description: "Tell us your name and email. No account, no payment, no waitlist to browse.",
  },
  {
    label: "Step 02",
    title: "It's reviewed by hand",
    description: "Every request is considered individually. Admission is considered, not automatic.",
  },
  {
    label: "Step 03",
    title: "You're invited in",
    description: "If an invitation becomes available, we'll reach out with next steps.",
  },
];

export function AdmissionSteps() {
  return (
    <section className={styles.admissionSection} aria-labelledby="admission-title">
      <div className={styles.sectionHeading}>
        <p className={styles.sectionEyebrow}>How admission works</p>
        <h2 id="admission-title">There is one way in.</h2>
      </div>

      <div className={styles.admissionGrid}>
        {steps.map((step) => (
          <article className={styles.admissionCard} key={step.title}>
            <span>{step.label}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>

      <div className={styles.productCta}>
        <Link className={styles.primaryCta} href="/request-access">
          Request access <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
