import Link from "next/link";
import {
  ArrowRightIcon,
  BanknoteIcon,
  CheckIcon,
  CreditCardIcon,
  FileTextIcon,
  FingerprintIcon,
  KeyRoundIcon,
  LockKeyholeIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UploadCloudIcon,
} from "lucide-react";
import type { ProductIcon, ProductPageId } from "./product-page-data";
import { PRODUCT_PAGES } from "./product-page-data";
import { ProductPageVisual } from "./ProductPageVisual";
import styles from "./product-pages.module.css";

const ICONS: Record<ProductIcon, typeof KeyRoundIcon> = {
  bank: BanknoteIcon,
  card: CreditCardIcon,
  check: CheckIcon,
  device: FingerprintIcon,
  document: FileTextIcon,
  eye: SearchIcon,
  key: KeyRoundIcon,
  lock: LockKeyholeIcon,
  search: SearchIcon,
  shield: ShieldCheckIcon,
  sparkles: SparklesIcon,
  upload: UploadCloudIcon,
};

export function ProductPageContent({ page }: { page: ProductPageId }) {
  const content = PRODUCT_PAGES[page];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p className={styles.heroLead}>{content.lead}</p>
          <div className={styles.heroActions}>
            <Link href="/signup" className={styles.primaryAction}>Get started free</Link>
            <Link href={content.secondaryAction.href} className={styles.secondaryAction}>
              {content.secondaryAction.label} <ArrowRightIcon aria-hidden="true" />
            </Link>
          </div>
          <p className={styles.heroNote}><CheckIcon aria-hidden="true" />{content.heroNote}</p>
        </div>
        <ProductPageVisual page={page} />
      </section>

      <section className={styles.audienceRail} aria-label="Who this is for">
        {content.audience.map((item) => (
          <article key={item.title}>
            <span className={styles.audienceLabel}><CheckIcon aria-hidden="true" />Use case</span>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <section className={styles.problemSection}>
        <div>
          <p className={styles.eyebrow}>{content.problem.eyebrow}</p>
          <h2>{content.problem.title}</h2>
          <p>{content.problem.body}</p>
        </div>
        <article>
          <span><ShieldCheckIcon aria-hidden="true" /></span>
          <h3>{content.problem.solutionTitle}</h3>
          <p>{content.problem.solutionBody}</p>
        </article>
      </section>

      <section className={styles.featuresSection}>
        <header className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Built for the real task</p>
          <h2>{content.featuresTitle}</h2>
          <p>{content.featuresLead}</p>
        </header>
        <div className={styles.featureGrid}>
          {content.features.map((feature) => {
            const Icon = ICONS[feature.icon];
            return (
              <article key={feature.title}>
                <span><Icon aria-hidden="true" /></span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.workflowSection}>
        <div className={styles.workflowIntro}>
          <p className={styles.eyebrow}>{content.workflow.eyebrow}</p>
          <h2>{content.workflow.title}</h2>
          <p>{content.workflow.body}</p>
        </div>
        <ol className={styles.workflowList}>
          {content.workflow.steps.map((step, index) => (
            <li key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{step.title}</h3><p>{step.body}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.securitySection}>
        <div>
          <p className={styles.eyebrow}>{content.security.eyebrow}</p>
          <h2>{content.security.title}</h2>
          <p>{content.security.body}</p>
          <Link href="/security">Read the security architecture <ArrowRightIcon aria-hidden="true" /></Link>
        </div>
        <ul>
          {content.security.points.map((point) => <li key={point}><CheckIcon aria-hidden="true" />{point}</li>)}
        </ul>
      </section>

      <section className={styles.relatedSection}>
        <header className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Continue exploring</p>
          <h2>Connect this feature to the rest of your vault.</h2>
        </header>
        <div className={styles.relatedGrid}>
          {content.related.map((item) => (
            <Link href={item.href} key={item.href}>
              <span>{item.label}</span><h3>{item.title}</h3><p>{item.body}</p><ArrowRightIcon aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.faqSection}>
        <header>
          <p className={styles.eyebrow}>Common questions</p>
          <h2>Before you begin.</h2>
        </header>
        <div className={styles.faqList}>
          {content.faq.map((item, index) => (
            <details key={item.question} open={index === 0}>
              <summary>{item.question}<span aria-hidden="true">+</span></summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div><p className={styles.eyebrow}>Start free</p><h2>{content.finalTitle}</h2><p>{content.finalBody}</p></div>
        <Link href="/signup" className={styles.primaryAction}>Get started free <ArrowRightIcon aria-hidden="true" /></Link>
      </section>
    </main>
  );
}
