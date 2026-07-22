import Link from "next/link";
import { ArrowRightIcon, LifeBuoyIcon } from "lucide-react";
import styles from "./faq-page.module.css";

type FaqItem = {
  question: string;
  answer: string;
  href?: string;
  linkLabel?: string;
};

type FaqCategory = {
  id: string;
  label: string;
  items: readonly FaqItem[];
};

export const FAQ_CATEGORIES: readonly FaqCategory[] = [
  {
    id: "getting-started",
    label: "Getting started",
    items: [
      {
        question: "What is Velora Vault?",
        answer:
          "A private, encrypted home for the things you'd otherwise scatter across browser-saved passwords, notes apps, and sticky notes: passwords, secure notes, documents, and wallet & bank records, all unlocked with one master key.",
        href: "/password-manager",
        linkLabel: "See what's inside the vault",
      },
      {
        question: "Is Velora Vault really free?",
        answer:
          "Yes - Free is free forever, no credit card required. It includes unlimited passwords and secure notes, up to 3 wallet & bank records, and 5 AI-assisted imports a month. Upgrade to Plus whenever you need document storage or more.",
        href: "/pricing",
        linkLabel: "Compare Free and Plus",
      },
      {
        question: "Is there a Velora Vault mobile app?",
        answer:
          "Not a separate app to install. Velora Vault is a responsive web app that works fully in your phone's browser, so there's nothing extra to download or keep updated.",
      },
    ],
  },
  {
    id: "security",
    label: "Security & encryption",
    items: [
      {
        question: "What's the difference between my account password and my master key?",
        answer:
          "Your account password only signs you in. Your master key is separate: it encrypts and decrypts your vault contents locally in your browser. Resetting one never restores the other, which is why both exist.",
        href: "/how-it-works",
        linkLabel: "See how unlocking works",
      },
      {
        question: "Can Velora Vault see my passwords or files?",
        answer:
          "No. Velora Vault runs on a zero-knowledge model: your data is encrypted and decrypted on your device using your master key. We never receive, store, or have the ability to view that key or your unencrypted vault contents.",
        href: "/security",
        linkLabel: "Read the security architecture",
      },
      {
        question: "What happens if I forget my master key?",
        answer:
          "Because we never have access to it, we can't reset or recover it for you. An optional hint can jog your memory, but it's a reminder, not a backup - keep a protected offline copy of your master key somewhere outside the vault it unlocks.",
        href: "/help",
        linkLabel: "Read the recovery boundaries",
      },
    ],
  },
  {
    id: "pricing",
    label: "Pricing & billing",
    items: [
      {
        question: "What do I get with Plus that Free doesn't have?",
        answer:
          "Both plans include unlimited passwords and secure notes. Plus adds 5 GB of encrypted document storage, unlimited wallet & bank records, unlimited AI-assisted imports, and priority support.",
        href: "/pricing",
        linkLabel: "See the full comparison",
      },
      {
        question: "Can I change or cancel my plan later?",
        answer:
          "Yes, any time. Upgrades apply immediately; downgrades take effect at the end of your current billing period, so you keep the paid time you've already covered. If you end up over a Free-tier limit, nothing is deleted - you just can't add more in that category until you're back under it or you upgrade.",
        href: "/pricing",
        linkLabel: "View plans",
      },
    ],
  },
  {
    id: "privacy",
    label: "Data & privacy",
    items: [
      {
        question: "Do you sell my data or use it for advertising?",
        answer:
          "No. We don't sell your information, and we don't use your vault contents for advertising, analytics, or model training - we couldn't even if we wanted to, since we can't decrypt it.",
        href: "/privacy",
        linkLabel: "Read the privacy policy",
      },
      {
        question: "Can I export my data?",
        answer:
          "Yes. Settings includes an encrypted export you can download any time - it contains ciphertext and encrypted document blobs, so your master key is still required to read or restore it.",
      },
      {
        question: "Is Magic Import processed locally?",
        answer:
          "No. Content you explicitly submit for extraction is sent to the configured AI provider. Review every suggested item before it's saved, and only submit data you're permitted to process.",
        href: "/features/magic-import",
        linkLabel: "Learn how Magic Import works",
      },
    ],
  },
  {
    id: "account",
    label: "Account & support",
    items: [
      {
        question: "Can I use Velora Vault on more than one device?",
        answer:
          "Yes. Your encrypted vault is tied to your account, not to one device or browser - sign in anywhere and enter your master key to unlock it.",
      },
      {
        question: "How do I get help if something goes wrong?",
        answer:
          "Search the Help Center for setup, unlocking, and billing answers, or open a ticket from Settings > Support once you're signed in - replies happen in a real conversation thread with our team.",
        href: "/help",
        linkLabel: "Visit the Help Center",
      },
    ],
  },
];

export function FaqPageContent() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Frequently asked questions</p>
          <h1>Questions, answered plainly.</h1>
          <p>
            Everything prospective and current members ask most about the vault, the
            encryption model, and billing - each answer links to the full detail.
          </p>
        </div>
      </section>

      <nav className={styles.jumpNav} aria-label="Jump to FAQ category">
        {FAQ_CATEGORIES.map((category) => (
          <a key={category.id} href={`#${category.id}`}>{category.label}</a>
        ))}
      </nav>

      {FAQ_CATEGORIES.map((category, categoryIndex) => (
        <section key={category.id} id={category.id} className={styles.faqSection}>
          <header>
            <p>{String(categoryIndex + 1).padStart(2, "0")}</p>
            <h2>{category.label}</h2>
          </header>
          <div className={styles.faqList}>
            {category.items.map((item, index) => (
              <details key={item.question} open={categoryIndex === 0 && index === 0}>
                <summary>
                  {item.question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{item.answer}</p>
                {item.href && (
                  <Link href={item.href} className={styles.inlineLink}>
                    {item.linkLabel} <ArrowRightIcon aria-hidden="true" />
                  </Link>
                )}
              </details>
            ))}
          </div>
        </section>
      ))}

      <section className={styles.contactSection}>
        <div className={styles.contactInfo}>
          <LifeBuoyIcon aria-hidden="true" />
          <span>
            <p className={styles.eyebrow}>Still have questions</p>
            <h2>We're glad to help directly.</h2>
            <p>Search the Help Center for setup and recovery guidance, or send us a direct question.</p>
          </span>
        </div>
        <div className={styles.contactActions}>
          <Link href="/help" className={styles.secondaryAction}>Visit Help Center</Link>
          <Link href="/contact" className={styles.primaryAction}>
            Contact us <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
