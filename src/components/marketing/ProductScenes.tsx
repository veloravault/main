import Link from "next/link";
import styles from "@/app/landing.module.css";
import { PasswordVideoScene } from "./PasswordVideoScene";

function KeyFeatures({ items }: { items: string[] }) {
  return (
    <div className={styles.keyFeatures}>
      <span className={styles.keyFeaturesLabel}>Key features</span>
      <ol>
        {items.map((item, index) => (
          <li key={item}>
            <b>{String(index + 1).padStart(2, "0")}</b>
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}

function DocumentScene() {
  return (
    <div className={`${styles.sceneVisual} ${styles.documentVisual}`} aria-hidden="true">
      <div className={styles.documentStack}>
        <span><i>PDF</i><strong>Identity</strong><small>2 documents</small></span>
        <span><i>DOC</i><strong>Records</strong><small>8 documents</small></span>
        <span><i>PDF</i><strong>Home</strong><small>4 documents</small></span>
      </div>
    </div>
  );
}

function NoteScene() {
  return (
    <div className={`${styles.sceneVisual} ${styles.noteVisual}`} aria-hidden="true">
      <div className={styles.notePaper}>
        <span>PRIVATE NOTE</span>
        <strong>Things worth remembering</strong>
        <i /><i /><i /><i />
      </div>
      <div className={styles.importBadge}>
        <span>✦</span>
        <div><strong>Magic Import</strong><small>Ready to review</small></div>
      </div>
    </div>
  );
}

function FinanceScene() {
  return (
    <div className={`${styles.sceneVisual} ${styles.financeVisual}`} aria-hidden="true">
      <div className={styles.financeCard}>
        <span>Velora Vault</span>
        <i />
        <strong>••••&nbsp;&nbsp;••••&nbsp;&nbsp;2486</strong>
        <small>FINANCIAL ESSENTIAL</small>
      </div>
      <div className={styles.financeDetail}><span>Account detail</span><strong>Secured</strong></div>
    </div>
  );
}

export function ProductScenes() {
  return (
    <section className={styles.productSection} aria-labelledby="product-title">
      <div className={styles.sectionHeading}>
        <p className={styles.sectionEyebrow}>Made for what matters</p>
        <h2 id="product-title">Not another dashboard. A place for the essentials.</h2>
      </div>

      <article className={styles.featureScene}>
        <div className={styles.featureCopy}>
          <span>Passwords</span>
          <h3>Add a password in seconds.</h3>
          <p>
            Title it, type it, save it — encrypted with your master key the
            moment it lands in your vault.
          </p>
          <KeyFeatures
            items={[
              "Encrypted the moment you hit save",
              "Title and password in one short sheet",
              "Reveal or copy without leaving the list",
              "Every credential tied to your master key",
            ]}
          />
        </div>
        <PasswordVideoScene />
      </article>

      <article className={`${styles.featureScene} ${styles.reverseScene}`}>
        <div className={styles.featureCopy}>
          <span>Documents</span>
          <h3>Important records, calmly arranged.</h3>
          <p>Give private documents a secure home that is easy to navigate.</p>
          <KeyFeatures
            items={[
              "Upload PDFs and files by category",
              "Titles kept clear without manual renaming",
              "Search across every stored document",
              "Nothing indexed outside your vault",
            ]}
          />
        </div>
        <DocumentScene />
      </article>

      <article className={styles.featureScene}>
        <div className={styles.featureCopy}>
          <span>Notes + Magic Import</span>
          <h3>Bring it in. Make it yours.</h3>
          <p>Capture private notes and review imported details before saving.</p>
          <KeyFeatures
            items={[
              "Private notes with no formatting to fight",
              "Magic Import reviews details before anything saves",
              "Nothing is written to your vault without confirmation",
              "Encrypted the same way as everything else",
            ]}
          />
        </div>
        <NoteScene />
      </article>

      <article className={`${styles.featureScene} ${styles.reverseScene}`}>
        <div className={styles.featureCopy}>
          <span>Financial essentials</span>
          <h3>The details you need, discreetly held.</h3>
          <p>Keep cards, accounts and everyday financial references together.</p>
          <KeyFeatures
            items={[
              "Cards and account references in one place",
              "Sensitive numbers concealed until revealed",
              "Grouped separately from passwords and notes",
              "Encrypted before storage, like everything else",
            ]}
          />
        </div>
        <FinanceScene />
      </article>

      <div className={styles.productCta}>
        <Link className={styles.secondaryCta} href="/request-access">
          Request access <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
