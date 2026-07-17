// Pricing tier content for the dedicated /pricing page. Prices are in INR.
// Note for whoever wires up Razorpay checkout: Razorpay expects amounts in
// the smallest currency unit (paise), i.e. these rupee values need x100
// conversion at that integration boundary, not before.

export interface PricingTier {
  id: "free" | "plus" | "family";
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
    id: "free",
    name: "Free",
    tagline: "Everything you need to stop reusing passwords.",
    monthlyPrice: 0,
    annualPrice: 0,
    cta: "Sign up free",
    features: [
      "Unlimited passwords & secure notes",
      "Up to 3 wallet & bank records",
      "Password health monitoring — weak & reused alerts",
      "Face ID / Touch ID and PIN unlock",
      "5 AI-assisted imports per month",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    tagline: "For one person who wants everything in one vault.",
    monthlyPrice: 49,
    annualPrice: 499,
    featured: true,
    cta: "Sign up",
    features: [
      "Everything in Free",
      "Documents up to 5 GB storage",
      "Unlimited wallet & bank records",
      "Unlimited AI-assisted import & camera scanning",
      "Priority email support",
      "Early access to new features",
    ],
  },
  {
    id: "family",
    name: "Family",
    tagline: "Up to five separate vaults, one bill.",
    monthlyPrice: 99,
    annualPrice: 999,
    cta: "Sign up",
    features: [
      "Everything in Plus, for each member",
      "Up to 5 separate private vaults",
      "Centralized billing — one payment for everyone",
      "Each member keeps their own master key — shared billing, never shared secrets",
      "Family admin console for managing seats",
    ],
  },
];

// A single cell value: a plain string, or `true`/`false` rendered as a
// check/dash. Kept separate from PRICING_TIERS' marketing bullet lists so the
// comparison table can show the exact figure per plan, side by side.
type ComparisonValue = string | boolean;

export interface ComparisonRow {
  label: string;
  values: [ComparisonValue, ComparisonValue, ComparisonValue]; // Free, Plus, Family
}

export const PRICING_COMPARISON: ComparisonRow[] = [
  { label: "Passwords & secure notes", values: ["Unlimited", "Unlimited", "Unlimited"] },
  { label: "Wallet & bank records", values: ["Up to 3", "Unlimited", "Unlimited"] },
  { label: "Document storage", values: ["Not included", "5 GB", "5 GB per member"] },
  { label: "AI-assisted imports", values: ["5 / month", "Unlimited", "Unlimited"] },
  { label: "Password health monitoring", values: [true, true, true] },
  { label: "Face ID / Touch ID / PIN unlock", values: [true, true, true] },
  { label: "Priority email support", values: [false, true, true] },
  { label: "Early access to new features", values: [false, true, true] },
  { label: "Separate private vaults", values: ["1", "1", "Up to 5"] },
  { label: "Centralized family billing", values: [false, false, true] },
];

export const PRICING_FAQ: { question: string; answer: string }[] = [
  {
    question: "Is the Free tier actually free?",
    answer:
      "Yes — free forever, no credit card required. It includes unlimited passwords and notes, with limits on wallet records and AI-assisted imports, and no document storage. Upgrade to Plus or Family whenever you need more.",
  },
  {
    question: "What happens to my data if I'm over a plan limit?",
    answer:
      "Nothing is deleted or locked. You keep read access to everything you've already saved — you just can't add more in that category until you're back under the limit or you upgrade.",
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
