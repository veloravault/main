import styles from "@/app/landing.module.css";

function PasswordScene() {
  return (
    <div className={`${styles.sceneVisual} ${styles.passwordVisual}`} aria-hidden="true">
      <div className={styles.sceneToolbar}>
        <span />
        <i />
      </div>
      <div className={styles.passwordList}>
        <div><i>G</i><span><strong>Google</strong><small>personal@icloud.com</small></span><b>••••••</b></div>
        <div><i>A</i><span><strong>Apple ID</strong><small>velora@icloud.com</small></span><b>••••••</b></div>
        <div><i>N</i><span><strong>Notion</strong><small>Workspace</small></span><b>••••••</b></div>
      </div>
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
          <h3>Your sign-ins, without the noise.</h3>
          <p>Keep the credentials you rely on organized and close at hand.</p>
        </div>
        <PasswordScene />
      </article>

      <article className={`${styles.featureScene} ${styles.reverseScene}`}>
        <div className={styles.featureCopy}>
          <span>Documents</span>
          <h3>Important records, calmly arranged.</h3>
          <p>Give private documents a secure home that is easy to navigate.</p>
        </div>
        <DocumentScene />
      </article>

      <div className={styles.splitScenes}>
        <article className={styles.smallScene}>
          <div className={styles.featureCopy}>
            <span>Notes + Magic Import</span>
            <h3>Bring it in. Make it yours.</h3>
            <p>Capture private notes and review imported details before saving.</p>
          </div>
          <NoteScene />
        </article>

        <article className={`${styles.smallScene} ${styles.darkScene}`}>
          <div className={styles.featureCopy}>
            <span>Financial essentials</span>
            <h3>The details you need, discreetly held.</h3>
            <p>Keep cards, accounts and everyday financial references together.</p>
          </div>
          <FinanceScene />
        </article>
      </div>
    </section>
  );
}
