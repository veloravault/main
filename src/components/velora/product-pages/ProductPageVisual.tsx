import {
  BanknoteIcon,
  CheckIcon,
  CreditCardIcon,
  FileTextIcon,
  KeyRoundIcon,
  LockKeyholeIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import type { ProductPageId } from "./product-page-data";
import styles from "./product-pages.module.css";

const VISUAL_LABELS: Record<ProductPageId, string> = {
  "password-manager": "Velora Vault password workspace preview",
  "how-it-works": "Velora Vault account and encryption flow",
  "secure-documents": "Velora Vault secure document workspace preview",
  "digital-wallet": "Velora Vault digital wallet preview",
  "magic-import": "Velora Vault Magic Import review flow",
};

function VisualHeader({ title }: { title: string }) {
  return (
    <header className={styles.visualHeader}>
      <span className={styles.visualBrand}><i /><i /><i /><i /></span>
      <strong>{title}</strong>
      <span className={styles.visualStatus}><LockKeyholeIcon /> Private</span>
    </header>
  );
}

function PasswordManagerVisual() {
  return (
    <>
      <VisualHeader title="Your vault" />
      <div className={styles.visualSearch}><SearchIcon /> Search everything</div>
      <div className={styles.passwordVisualGrid}>
        <div className={styles.visualNav}>
          <span data-active><KeyRoundIcon /> Passwords <b>24</b></span>
          <span><FileTextIcon /> Documents <b>8</b></span>
          <span><CreditCardIcon /> Wallet <b>3</b></span>
          <span><BanknoteIcon /> Bank vault <b>2</b></span>
        </div>
        <article className={styles.passwordDetail}>
          <small>Selected login</small>
          <h3>Email account</h3>
          <dl>
            <div><dt>Username</dt><dd>aria@example.com</dd></div>
            <div><dt>Password</dt><dd>••••••••••••••</dd></div>
          </dl>
          <span><ShieldCheckIcon /> Strong, no reuse detected</span>
        </article>
      </div>
    </>
  );
}

function HowItWorksVisual() {
  return (
    <>
      <VisualHeader title="Protection path" />
      <div className={styles.keyFlow}>
        <article><span><CheckIcon /></span><small>01</small><strong>Account verified</strong><p>Email and account password</p></article>
        <i aria-hidden="true" />
        <article><span><KeyRoundIcon /></span><small>02</small><strong>Master key entered</strong><p>Held in browser memory</p></article>
        <i aria-hidden="true" />
        <article><span><LockKeyholeIcon /></span><small>03</small><strong>Vault unlocked</strong><p>Ciphertext decrypted locally</p></article>
      </div>
      <div className={styles.keyBoundary}><ShieldCheckIcon /><span><strong>Separate responsibilities</strong><small>Authentication does not reveal the decryption key.</small></span></div>
    </>
  );
}

function DocumentsVisual() {
  return (
    <>
      <VisualHeader title="Secure documents" />
      <div className={styles.documentVisual}>
        <div className={styles.documentList}>
          <span data-active><i>ID</i><b>Passport</b><small>Identity</small></span>
          <span><i>IN</i><b>Insurance policy</b><small>Finance</small></span>
          <span><i>TX</i><b>Tax statement</b><small>Records</small></span>
        </div>
        <article className={styles.documentSheet}>
          <span className={styles.fileIcon}><FileTextIcon /></span>
          <small>Protected document</small>
          <h3>Passport</h3>
          <div><span>Document number</span><strong>•••••• 4821</strong></div>
          <div><span>Expires</span><strong>18 July 2032</strong></div>
          <p><ShieldCheckIcon /> Encrypted file, 2.4 MB</p>
        </article>
      </div>
    </>
  );
}

function WalletVisual() {
  return (
    <>
      <VisualHeader title="Digital wallet" />
      <div className={styles.walletVisual}>
        <article className={styles.creditCard}>
          <span>Everyday card</span><CreditCardIcon />
          <strong>•••• •••• •••• 4821</strong>
          <small>ARIA T&nbsp;&nbsp;&nbsp;08/29</small>
        </article>
        <article className={styles.walletInspector}>
          <small>Selected record</small><h3>Everyday card</h3>
          <div><span>Card number</span><b>•••• 4821</b></div>
          <div><span>CVV</span><b>•••</b></div>
          <button type="button" tabIndex={-1}>Reveal secure details</button>
        </article>
      </div>
      <div className={styles.bankStrip}><BanknoteIcon /><span><strong>Northstar Bank</strong><small>Everyday account, ending 1842</small></span><b>Protected</b></div>
    </>
  );
}

function ImportVisual() {
  return (
    <>
      <VisualHeader title="Magic Import" />
      <div className={styles.importFlow}>
        <article><small>Source</small><strong>Mixed records</strong><p>Login, card, account, and note text</p></article>
        <span className={styles.importArrow}><SparklesIcon /></span>
        <article className={styles.importReview}>
          <small>Review candidates</small>
          <span><KeyRoundIcon /><b>Password</b><CheckIcon /></span>
          <span><CreditCardIcon /><b>Payment card</b><CheckIcon /></span>
          <span><BanknoteIcon /><b>Bank account</b><CheckIcon /></span>
        </article>
      </div>
      <div className={styles.reviewBar}><ShieldCheckIcon /><span><strong>Nothing saved yet</strong><small>Review and approve each candidate first.</small></span><button type="button" tabIndex={-1}>Save approved</button></div>
    </>
  );
}

export function ProductPageVisual({ page }: { page: ProductPageId }) {
  return (
    <div className={styles.productVisual} data-page={page} role="img" aria-label={VISUAL_LABELS[page]}>
      <div className={styles.productVisualInner} aria-hidden="true">
        {page === "password-manager" && <PasswordManagerVisual />}
        {page === "how-it-works" && <HowItWorksVisual />}
        {page === "secure-documents" && <DocumentsVisual />}
        {page === "digital-wallet" && <WalletVisual />}
        {page === "magic-import" && <ImportVisual />}
      </div>
    </div>
  );
}

