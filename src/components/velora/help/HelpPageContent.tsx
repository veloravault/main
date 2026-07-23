"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRightIcon,
  CreditCardIcon,
  FileTextIcon,
  KeyRoundIcon,
  KeySquareIcon,
  LifeBuoyIcon,
  LockKeyholeIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import styles from "./help-page.module.css";

const TOPICS = [
  { title: "Account setup", body: "Create an account, confirm your email, and complete vault setup.", href: "/how-it-works", icon: KeyRoundIcon },
  { title: "Unlock and recovery", body: "Understand the Master key, hint, PIN, biometrics, and reset boundaries.", href: "#quick-answers", icon: LockKeyholeIcon },
  { title: "Passwords", body: "Create, organize, assess, and safely reveal password records.", href: "/password-manager", icon: ShieldCheckIcon },
  { title: "Documents", body: "Upload, label, search, preview, and remove protected files.", href: "/features/secure-documents", icon: FileTextIcon },
  { title: "Wallet and bank", body: "Keep cards, bank accounts, and login credentials in the right record types.", href: "/features/digital-wallet", icon: CreditCardIcon },
  { title: "Magic Import", body: "Review extraction privacy, usage limits, candidates, and saving.", href: "/features/magic-import", icon: SparklesIcon },
  { title: "Credential vault", body: "Store SSH keys, crypto passphrases, API credentials, WiFi passwords, and 2FA backup codes.", href: "/features/ssh-keys", icon: KeySquareIcon },
] as const;

const ANSWERS = [
  {
    category: "Account",
    title: "Why are the account password and Master key separate?",
    body: "The account password authenticates your account. The Master key encrypts and decrypts vault contents in the browser. Resetting one does not replace the other.",
    href: "/how-it-works",
  },
  {
    category: "Recovery",
    title: "What can I do if I forget the Master key?",
    body: "Retrieve the optional hint from the authenticated account. The hint may help you remember, but Velora cannot reveal, reset, or recover the key for existing encrypted contents.",
    href: "/how-it-works",
  },
  {
    category: "Security",
    title: "What happens when the vault locks?",
    body: "Readable key material is cleared from the active vault session. Enter the Master key again, or use an enrolled account-bound local unlock method, to reopen it.",
    href: "/security",
  },
  {
    category: "Security",
    title: "Can I change my Master key without losing my data?",
    body: "Yes. Settings > Security includes a Change master password flow that decrypts your whole vault with the current Master key and re-encrypts it under a new one in one atomic step. It requires the current key, so it's a change, not a recovery.",
    href: "/security",
  },
  {
    category: "Security",
    title: "Can I see and sign out individual devices?",
    body: "Yes. Settings > Security lists each active session by device, so you can sign out just the one you don't recognize instead of every device at once.",
    href: "/security",
  },
  {
    category: "Documents",
    title: "Are files encrypted before upload?",
    body: "Yes. Supported document contents are encrypted in the browser before encrypted bytes are sent to private object storage.",
    href: "/features/secure-documents",
  },
  {
    category: "Wallet",
    title: "Why are banking logins separate from bank records?",
    body: "A banking username and password belong in Passwords. Account number, IFSC or routing code, and account holder details belong in Bank vault.",
    href: "/features/digital-wallet",
  },
  {
    category: "Import",
    title: "Does Magic Import save suggestions automatically?",
    body: "No. Assisted extraction creates candidates. Review and edit them, then approve only the records you want to encrypt and save.",
    href: "/features/magic-import",
  },
  {
    category: "Import",
    title: "Is Magic Import processed locally?",
    body: "No. Content you explicitly submit is sent to the configured AI provider for extraction. Submit only data you are permitted to process.",
    href: "/features/magic-import",
  },
  {
    category: "Billing",
    title: "What is included in Free and Plus?",
    body: "The pricing page lists current record, storage, import, and support limits for both plans.",
    href: "/pricing",
  },
] as const;

export function HelpPageContent() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleAnswers = useMemo(
    () => ANSWERS.filter((item) =>
      !normalizedQuery || `${item.category} ${item.title} ${item.body}`.toLowerCase().includes(normalizedQuery),
    ),
    [normalizedQuery],
  );

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Velora Vault help</p>
          <h1>Find the next safe step.</h1>
          <p>Search concise answers about setup, unlocking, recovery, storage, importing, and billing.</p>
          <label className={styles.searchBox}>
            <SearchIcon aria-hidden="true" />
            <span className={styles.srOnly}>Search help articles</span>
            <input
              type="search"
              aria-label="Search help articles"
              placeholder="Search help articles"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && <button type="button" onClick={() => setQuery("")}>Clear</button>}
          </label>
          <p className={styles.localNote}><ShieldCheckIcon aria-hidden="true" />Your help search stays in this browser.</p>
        </div>
      </section>

      <section className={styles.topicSection}>
        <header className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Browse by topic</p>
          <h2>Start with what you are trying to do.</h2>
        </header>
        <div className={styles.topicGrid}>
          {TOPICS.map(({ icon: Icon, ...topic }) => (
            <Link href={topic.href} key={topic.title}>
              <span><Icon aria-hidden="true" /></span>
              <h3>{topic.title}</h3><p>{topic.body}</p><ArrowRightIcon aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section id="quick-answers" className={styles.answerSection}>
        <div className={styles.answerHeading}>
          <p className={styles.eyebrow}>Quick answers</p>
          <h2>{normalizedQuery ? "Search results" : "Frequently needed guidance"}</h2>
          <p aria-live="polite">{visibleAnswers.length} {visibleAnswers.length === 1 ? "answer" : "answers"} found</p>
        </div>
        <div className={styles.answerList}>
          {visibleAnswers.map((item) => (
            <article key={item.title}>
              <span>{item.category}</span><h3>{item.title}</h3><p>{item.body}</p>
              <Link href={item.href}>Read related guidance <ArrowRightIcon aria-hidden="true" /></Link>
            </article>
          ))}
          {visibleAnswers.length === 0 && (
            <div className={styles.emptyState}>
              <SearchIcon aria-hidden="true" /><h3>No matching answer yet.</h3>
              <p>Try a shorter term such as “key”, “document”, “import”, or “billing”.</p>
              <button type="button" onClick={() => setQuery("")}>Clear search</button>
            </div>
          )}
        </div>
      </section>

      <section className={styles.recoverySection}>
        <div>
          <p className={styles.eyebrow}>Critical recovery note</p>
          <h2>Velora cannot recover a lost Master key.</h2>
          <p>An account password reset can restore sign-in. It cannot decrypt contents protected by a different or forgotten Master key. Keep a protected offline copy outside the vault it unlocks.</p>
          <Link href="/security">Understand the security boundary <ArrowRightIcon aria-hidden="true" /></Link>
        </div>
        <aside>
          <LockKeyholeIcon aria-hidden="true" />
          <strong>A hint is a reminder, not a backup.</strong>
          <p>Never place the full Master key in the hint field.</p>
        </aside>
      </section>

      <section className={styles.contactSection}>
        <div><LifeBuoyIcon aria-hidden="true" /><span><p className={styles.eyebrow}>Still need help</p><h2>Send a clear support request.</h2><p>Include the page, action, and visible error. Never send passwords, Master keys, PINs, CVVs, or full financial details.</p></span></div>
        <Link href="/contact">Contact support <ArrowRightIcon aria-hidden="true" /></Link>
      </section>
    </main>
  );
}

