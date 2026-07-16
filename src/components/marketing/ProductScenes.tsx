import Link from "next/link";
import styles from "@/app/landing.module.css";
import { VideoScene } from "./VideoScene";

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
        <VideoScene
          src="/videos/add-password.mp4"
          poster="/videos/add-password-poster.png"
          label="Walkthrough: adding a new password to Velora Vault"
        />
      </article>

      <article className={`${styles.featureScene} ${styles.reverseScene}`}>
        <div className={styles.featureCopy}>
          <span>Documents</span>
          <h3>Upload a document in seconds.</h3>
          <p>
            Drop in a file, let AI Vision suggest a title, and it&apos;s
            encrypted before it&apos;s stored.
          </p>
          <KeyFeatures
            items={[
              "Upload PDFs and files by category",
              "Optional AI Vision suggests a clear title",
              "Search across every stored document",
              "Nothing indexed outside your vault",
            ]}
          />
        </div>
        <VideoScene
          src="/videos/add-document.mp4"
          poster="/videos/add-document-poster.png"
          label="Walkthrough: uploading a new document to Velora Vault"
        />
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
          <h3>Add a card in seconds.</h3>
          <p>
            Nickname it, enter the details, and it&apos;s encrypted before it
            saves — PIN fields stay optional.
          </p>
          <KeyFeatures
            items={[
              "Cards and account references in one place",
              "Sensitive numbers concealed until revealed",
              "Grouped separately from passwords and notes",
              "Encrypted before storage, like everything else",
            ]}
          />
        </div>
        <VideoScene
          src="/videos/add-card.mp4"
          poster="/videos/add-card-poster.png"
          label="Walkthrough: adding a new card to Velora Vault"
        />
      </article>

      <div className={styles.productCta}>
        <Link className={styles.secondaryCta} href="/request-access">
          Request access <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
