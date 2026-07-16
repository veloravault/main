import styles from "@/app/landing.module.css";

const stack = ["Next.js", "React", "Supabase", "TypeScript", "Tailwind CSS", "Framer Motion"];

export function TechFoundation() {
  return (
    <section className={styles.techSection} aria-labelledby="tech-title">
      <div className={styles.techIntro}>
        <p className={styles.sectionEyebrow}>Built on a trusted foundation</p>
        <h2 id="tech-title">No shortcuts in the stack.</h2>
        <p>
          Velora Vault is built with the same tools you would choose for
          anything that has to be right the first time.
        </p>
      </div>

      <ul className={styles.techGrid}>
        {stack.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </section>
  );
}
