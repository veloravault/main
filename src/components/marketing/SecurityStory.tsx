import styles from "@/app/landing.module.css";

const securityPoints = [
  ["Encrypted before storage", "Sensitive vault values are encrypted with your master key before they are stored."],
  ["Two separate secrets", "Your sign-in password authenticates your account. Your master key unlocks encrypted vault content."],
  ["Built around your control", "Your master key stays within the vault experience and is never included in an access request or invitation."],
];

export function SecurityStory() {
  return (
    <section className={styles.securitySection} id="security" aria-labelledby="security-title">
      <div className={styles.securityLead}>
        <p className={styles.sectionEyebrow}>Security, in plain language</p>
        <h2 id="security-title">Private is a design decision.</h2>
        <p>
          Velora Vault separates account access from the key that protects your
          sensitive information. That boundary stays intact from invitation to
          every unlock.
        </p>
      </div>

      <div className={styles.securityList}>
        {securityPoints.map(([title, description]) => (
          <article key={title}>
            <span aria-hidden="true">✓</span>
            <div><h3>{title}</h3><p>{description}</p></div>
          </article>
        ))}
      </div>

      <aside className={styles.privacyNote} id="privacy" aria-labelledby="privacy-title">
        <span className={styles.privacyGlyph} aria-hidden="true"><i /><i /></span>
        <div>
          <p className={styles.sectionEyebrow}>A useful, honest boundary</p>
          <h3 id="privacy-title">Protected without pretending.</h3>
          <p>
            Sensitive values are encrypted. Helpful index details such as titles
            and categories can remain queryable so your vault stays usable. We
            describe the system as it is—not as a slogan.
          </p>
        </div>
      </aside>
    </section>
  );
}
