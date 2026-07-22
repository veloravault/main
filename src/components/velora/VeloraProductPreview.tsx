import {
  BanknoteIcon,
  CreditCardIcon,
  FileTextIcon,
  KeyRoundIcon,
  LockKeyholeIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import styles from "./VeloraProductPreview.module.css";

export type VeloraPreviewVariant = "overview" | "passwords" | "documents" | "wallet" | "mobile";

const NAV_ITEMS = [
  { label: "Passwords", icon: KeyRoundIcon },
  { label: "Documents", icon: FileTextIcon },
  { label: "Wallet", icon: CreditCardIcon },
  { label: "Bank vault", icon: BanknoteIcon },
] as const;

function PreviewBrandMark() {
  return (
    <span className={styles.previewMark} aria-hidden="true">
      <i /><i /><i /><i /><b />
    </span>
  );
}

function Sidebar({ active }: { active: "Passwords" | "Wallet" | "Home" }) {
  return (
    <aside className={styles.sidebar}>
      <span className={styles.brand}><PreviewBrandMark /><strong>Velora Vault</strong></span>
      <nav>
        <span data-active={active === "Home"}><SparklesIcon />Overview</span>
        {NAV_ITEMS.map(({ label, icon: Icon }) => (
          <span data-active={active === label} key={label}><Icon />{label}</span>
        ))}
      </nav>
      <span className={styles.secure}><ShieldCheckIcon />Vault encrypted</span>
    </aside>
  );
}

function Topbar({ title }: { title: string }) {
  return (
    <header className={styles.topbar}>
      <div><small>Private workspace</small><strong>{title}</strong></div>
      <span className={styles.search}><SearchIcon />Search vault</span>
      <span className={styles.avatar}>AT</span>
    </header>
  );
}

function Overview() {
  return (
    <>
      <Sidebar active="Home" />
      <section className={styles.workspace}>
        <Topbar title="Your vault" />
        <div className={styles.overviewBody}>
          <div className={styles.welcome}><div><small>Protected and in sync</small><h3>Everything important, in one place.</h3></div><span><LockKeyholeIcon />Unlocked</span></div>
          <div className={styles.metricGrid}>
            <article><KeyRoundIcon /><span><strong>24</strong><small>Passwords</small></span></article>
            <article><FileTextIcon /><span><strong>8</strong><small>Documents</small></span></article>
            <article><CreditCardIcon /><span><strong>3</strong><small>Wallet records</small></span></article>
          </div>
          <div className={styles.recent}>
            <header><strong>Recently used</strong><small>Stored encrypted</small></header>
            <span><i>EM</i><b>Email account</b><small>Strong password</small></span>
            <span><i>ID</i><b>Identity document</b><small>Updated today</small></span>
            <span><i>BK</i><b>Primary bank</b><small>Account •• 1842</small></span>
          </div>
        </div>
      </section>
    </>
  );
}

function Passwords() {
  return (
    <>
      <Sidebar active="Passwords" />
      <section className={styles.workspace}>
        <Topbar title="Passwords" />
        <div className={styles.masterDetail}>
          <div className={styles.itemList}>
            <header><strong>24 logins</strong><button type="button" tabIndex={-1}>+ Add</button></header>
            {[["EM", "Email account", "Strong"], ["BK", "Online banking", "Strong"], ["ST", "Streaming", "Review"]].map(([mark, name, health], index) => (
              <span data-selected={index === 0} key={name}><i>{mark}</i><b>{name}</b><small data-review={health === "Review"}>{health}</small></span>
            ))}
          </div>
          <article className={styles.detailCard}>
            <span className={styles.detailIcon}><KeyRoundIcon /></span>
            <small>Login</small><h3>Email account</h3>
            <dl><div><dt>Username</dt><dd>aria@example.com</dd></div><div><dt>Password</dt><dd>••••••••••••••</dd></div></dl>
            <span className={styles.health}><ShieldCheckIcon />Strong · no reuse detected</span>
          </article>
        </div>
      </section>
    </>
  );
}

function Documents() {
  return (
    <>
      <Sidebar active="Home" />
      <section className={styles.workspace}>
        <Topbar title="Documents" />
        <div className={styles.masterDetail}>
          <div className={styles.itemList}>
            <header><strong>8 documents</strong><button type="button" tabIndex={-1}>+ Add</button></header>
            {[["ID", "Passport", "Identity"], ["IN", "Insurance policy", "Finance"], ["TX", "Tax statement", "Records"]].map(([mark, name, group], index) => (
              <span data-selected={index === 0} key={name}><i>{mark}</i><b>{name}</b><small>{group}</small></span>
            ))}
          </div>
          <article className={styles.detailCard}>
            <span className={styles.detailIcon}><FileTextIcon /></span>
            <small>Protected document</small><h3>Passport</h3>
            <dl><div><dt>Document number</dt><dd>•••••• 4821</dd></div><div><dt>Expires</dt><dd>18 July 2032</dd></div></dl>
            <span className={styles.health}><ShieldCheckIcon />Encrypted file · 2.4 MB</span>
          </article>
        </div>
      </section>
    </>
  );
}

function Wallet() {
  return (
    <>
      <Sidebar active="Wallet" />
      <section className={styles.workspace}>
        <Topbar title="Digital Wallet" />
        <div className={styles.walletBody}>
          <div className={styles.walletCard}><span>Velora Card</span><CreditCardIcon /><strong>••••  ••••  ••••  4821</strong><small>ARIA T · 08/29</small></div>
          <div className={`${styles.walletCard} ${styles.walletCardAlt}`}><span>Travel card</span><CreditCardIcon /><strong>••••  ••••  ••••  7310</strong><small>ARIA T · 11/28</small></div>
          <article className={styles.bankRow}><span><BanknoteIcon /></span><div><strong>Northstar Bank</strong><small>Everyday account · •• 1842</small></div><b>Protected</b></article>
        </div>
      </section>
    </>
  );
}

function Mobile() {
  return (
    <div className={styles.mobileStage}>
      <div className={styles.phone}>
        <header><PreviewBrandMark /><span><small>Good evening</small><strong>Your vault</strong></span><i>AT</i></header>
        <div className={styles.mobileSearch}><SearchIcon />Search everything</div>
        <div className={styles.mobileCards}><article><KeyRoundIcon /><strong>24</strong><small>Passwords</small></article><article><CreditCardIcon /><strong>3</strong><small>Wallet</small></article></div>
        <div className={styles.mobileList}><strong>Recently used</strong><span><i>EM</i><b>Email account</b><small>Now</small></span><span><i>ID</i><b>Identity document</b><small>Today</small></span></div>
        <nav><span data-active><SparklesIcon />Home</span><span><KeyRoundIcon />Passwords</span><span><CreditCardIcon />Wallet</span></nav>
      </div>
      <div className={styles.mobileCaption}><ShieldCheckIcon /><span><strong>Client-side encryption</strong><small>Your master key stays on this device.</small></span></div>
    </div>
  );
}

export function VeloraProductPreview({ variant }: { variant: VeloraPreviewVariant }) {
  return (
    <div className={styles.preview} data-variant={variant} role="img" aria-label={`Velora Vault ${variant} product preview`}>
      <div className={styles.previewInner} aria-hidden="true">
        {variant === "overview" && <Overview />}
        {variant === "passwords" && <Passwords />}
        {variant === "documents" && <Documents />}
        {variant === "wallet" && <Wallet />}
        {variant === "mobile" && <Mobile />}
      </div>
    </div>
  );
}
