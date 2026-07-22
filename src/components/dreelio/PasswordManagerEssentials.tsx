import {
  FileKeyIcon,
  FingerprintIcon,
  KeyRoundIcon,
  LockKeyholeIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "lucide-react";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./PasswordManagerEssentials.module.css";

const ESSENTIALS = [
  {
    icon: KeyRoundIcon,
    title: "Generate, save, and use strong passwords",
    body: "Create unique credentials and keep them ready when you need to sign in.",
  },
  {
    icon: FileKeyIcon,
    title: "Keep important details together",
    body: "Organize passwords, secure notes, documents, cards, and account details.",
  },
  {
    icon: LockKeyholeIcon,
    title: "Protect everything before storage",
    body: "Use one private workspace built around local encryption and clear access controls.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Spot weak and reused credentials",
    body: "Review password health signals and replace credentials that put more than one account at risk.",
  },
  {
    icon: SearchIcon,
    title: "Find saved information quickly",
    body: "Search across the vault and move directly to the password, note, document, or card you need.",
  },
  {
    icon: FingerprintIcon,
    title: "Unlock in the way that suits you",
    body: "Use your master key, a device PIN, or a supported platform authenticator for convenient local access.",
  },
] as const;

export function PasswordManagerEssentials() {
  return (
    <section className={`${shared.section} ${styles.section}`} aria-labelledby="password-manager-essentials-title">
      <div className={shared.container}>
        <h2 id="password-manager-essentials-title" className={`${shared.h2} ${styles.title}`}>
          Everything you need in a password manager
        </h2>

        <div className={styles.grid}>
          {ESSENTIALS.map(({ icon: Icon, title, body }) => (
            <article className={styles.card} key={title}>
              <div className={styles.placeholder} role="img" aria-label={`Placeholder image for ${title}`}>
                <Icon aria-hidden="true" />
                <span>Placeholder image</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
