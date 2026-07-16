// Pricing tier content for the dedicated /pricing page. Numbers reflect the
// planned post-beta pricing — the product is currently free for everyone
// during private beta, which the page states explicitly.

export interface PricingTier {
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number; // billed once per year
  featured?: boolean;
  cta: string;
  features: string[];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Free",
    tagline: "Everything you need to stop reusing passwords.",
    monthlyPrice: 0,
    annualPrice: 0,
    cta: "Request access",
    features: [
      "Unlimited passwords & secure notes",
      "Up to 10 documents (500 MB total)",
      "Up to 3 wallet & bank records",
      "Password health monitoring — weak & reused alerts",
      "Face ID / Touch ID and PIN unlock",
      "5 AI-assisted imports per month",
    ],
  },
  {
    name: "Plus",
    tagline: "For one person who wants everything in one vault.",
    monthlyPrice: 4.99,
    annualPrice: 39,
    featured: true,
    cta: "Request access",
    features: [
      "Everything in Free",
      "Unlimited documents (10 GB storage)",
      "Unlimited wallet & bank records",
      "Unlimited AI-assisted import & camera scanning",
      "Priority email support",
      "Early access to new features",
    ],
  },
  {
    name: "Family",
    tagline: "Up to five separate vaults, one bill.",
    monthlyPrice: 8.99,
    annualPrice: 69,
    cta: "Request access",
    features: [
      "Everything in Plus, for each member",
      "Up to 5 separate private vaults",
      "Centralized billing — one payment for everyone",
      "Each member keeps their own master key — shared billing, never shared secrets",
      "Family admin console for managing seats",
    ],
  },
];

export const PRICING_FAQ: { question: string; answer: string }[] = [
  {
    question: "Is Velora Vault really free right now?",
    answer:
      "Yes. Every invited account currently has full access to every feature at no cost while the product is in private beta. The tiers on this page describe what pricing looks like once beta ends — nothing changes for you until then, and existing beta users will get advance notice before any billing starts.",
  },
  {
    question: "What happens to my data if I don't upgrade?",
    answer:
      "Nothing is deleted or locked. If you're above a Free-tier limit when beta pricing takes effect, you'll keep read access to everything you've already saved — you just won't be able to add more in that category until you're back under the limit or upgrade.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Yes, at any time. Upgrades apply immediately; downgrades take effect at the end of your current billing period so you don't lose paid time you've already covered.",
  },
  {
    question: "Does a Family plan mean my relatives can see my passwords?",
    answer:
      "No. A Family plan shares one bill across up to five accounts — it does not share vault contents. Each member sets their own separate master key, and encryption happens per-account, the same as on any other plan.",
  },
];
