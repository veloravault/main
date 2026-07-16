import styles from "@/app/landing.module.css";

const categories = [
  {
    title: "Encryption",
    items: [
      {
        name: "AES-256-GCM, entirely in your browser",
        detail:
          "Vault text and files are encrypted and decrypted client-side, with a fresh random salt and IV every time — before anything reaches the server.",
      },
      {
        name: "PBKDF2 at 600,000 iterations",
        detail:
          "Your master password is never stored or transmitted. It's run through PBKDF2-SHA256 600,000 times to derive the key that unlocks your vault.",
      },
      {
        name: "The key, not the password, stays in memory",
        detail:
          "Once unlocked, only the derived encryption key is held in memory — never your password — and it's cleared the moment you sign out.",
      },
    ],
  },
  {
    title: "Convenience unlock",
    note: "PIN and biometrics are a faster way back in, layered on top of your master password — not a replacement for it.",
    items: [
      {
        name: "PIN cost doubled to 1,200,000 iterations",
        detail:
          "PIN unlock derives its key at a deliberately higher PBKDF2 cost, specifically to raise the price of brute-forcing a 6-digit PIN offline.",
      },
      {
        name: "Verifier and key derived independently",
        detail:
          "Checking your PIN and decrypting your vault use separately salted keys, so neither can be reverse-derived from the other.",
      },
      {
        name: "Locked out after 3 attempts",
        detail:
          "Three incorrect PINs wipe the local PIN unlock entirely — you're back to your full master password, no retries left to guess.",
      },
      {
        name: "Face ID, Touch ID, Windows Hello",
        detail:
          "Biometric unlock uses your device's own WebAuthn authenticator. A random key is generated locally and released only after a successful check — it never touches our servers.",
      },
    ],
  },
  {
    title: "Access control & account safety",
    items: [
      {
        name: "Row-level security on every table",
        detail:
          "Vault data requires both account ownership and a live active-membership check — a suspended account loses access immediately, not just in the UI.",
      },
      {
        name: "Account-switch protection",
        detail:
          "If a different account signs in mid-action, any in-flight unlock or vault operation for the previous account is refused outright, never silently applied.",
      },
      {
        name: "Re-verification before anything destructive",
        detail:
          "Deleting your account or clearing vault data requires proving your identity again, plus a typed confirmation, immediately before it happens.",
      },
      {
        name: "No unauthenticated access, at the database level",
        detail:
          "Direct data-API access is fully revoked for anonymous requests — only signed-in, RLS-checked sessions can reach vault tables at all.",
      },
    ],
  },
  {
    title: "Infrastructure hardening",
    items: [
      {
        name: "Strict, nonce-based Content Security Policy",
        detail:
          "Every request gets a fresh cryptographic nonce; scripts only run if they carry it — no inline-script or eval loophole in production.",
      },
      {
        name: "CSP violations are logged, not ignored",
        detail:
          "Browser-reported policy violations are collected server-side, so attempted attacks are visible instead of silently blocked and forgotten.",
      },
      {
        name: "Origin-verified, byte-bounded requests",
        detail:
          "State-changing requests are checked against the app's real origin, and every request body is streamed with a strict size ceiling before it's parsed.",
      },
    ],
  },
  {
    title: "Abuse prevention",
    items: [
      {
        name: "Two-tier rate limiting",
        detail:
          "Access requests are capped per IP and per email-and-IP pair, enforced atomically so concurrent requests can't race past the limit.",
      },
      {
        name: "Fingerprinted, never stored raw",
        detail:
          "Rate-limit tracking keys off HMAC-SHA256 fingerprints of identifying data — never raw emails or IP addresses.",
      },
      {
        name: "Silent honeypot filtering",
        detail:
          "A hidden form field quietly absorbs automated bot traffic without ever processing or storing it.",
      },
    ],
  },
];

export function SecurityDetails() {
  return (
    <section className={styles.securityDetailsSection} aria-labelledby="security-details-title">
      <div className={styles.sectionHeading}>
        <p className={styles.sectionEyebrow}>Every layer, explained</p>
        <h2 id="security-details-title">Not secured by a slogan.</h2>
        <p className={styles.securityDetailsIntro}>
          Here is exactly what protects your data, mechanism by mechanism —
          not marketing language, but what the system actually does.
        </p>
      </div>

      <div className={styles.securityDetailsGrid}>
        {categories.map((category) => (
          <article className={styles.securityCategory} key={category.title}>
            <h3>{category.title}</h3>
            {category.note && <p className={styles.securityCategoryNote}>{category.note}</p>}
            <dl>
              {category.items.map((item) => (
                <div key={item.name}>
                  <dt>{item.name}</dt>
                  <dd>{item.detail}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
