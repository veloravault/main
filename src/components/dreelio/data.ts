// All copy + content for the Velora Vault landing page, kept in one place so
// the section components stay presentational.

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Benefits", href: "#benefits" },
  { label: "Access", href: "#pricing" },
  { label: "Blog", href: "#blog" },
  { label: "Contact", href: "/contact" },
];

export const PROJECT_PILLS = ["Saved logins", "Auto-lock timer", "Secure notes", "Activity log"] as const;
export const FINANCE_PILLS = ["Cards", "Balances", "Spending insights", "Magic import"] as const;

export const INTEGRATIONS = [
  { src: "/dreelio/import/browser.svg", alt: "Browser CSV export" },
  { src: "/dreelio/import/paste.svg", alt: "Paste and parse" },
  { src: "/dreelio/import/scan.svg", alt: "Photo scan" },
  { src: "/dreelio/import/csv.svg", alt: "CSV file" },
  { src: "/dreelio/import/sparkle.svg", alt: "AI-assisted import" },
  { src: "/dreelio/import/browser.svg", alt: "Browser CSV export" },
  { src: "/dreelio/import/paste.svg", alt: "Paste and parse" },
  { src: "/dreelio/import/scan.svg", alt: "Photo scan" },
  { src: "/dreelio/import/csv.svg", alt: "CSV file" },
];

export const SMALL_FEATURES = [
  {
    icon: "sync" as const,
    title: "Stay in sync everywhere",
    body: "Your vault updates instantly across every device you're signed into, so nothing's ever out of date.",
  },
  {
    icon: "preferences" as const,
    title: "Built for how you work",
    body: "Set your PIN, unlock method, and appearance preferences to match how you actually use your vault day to day.",
  },
  {
    icon: "organize" as const,
    title: "Organize it your way",
    body: "Tag, categorize, and search across passwords, documents, notes, and cards from one unified view.",
  },
];

export const TESTIMONIALS = [
  {
    quote:
      "Your master key never leaves your device. We built Velora Vault so that not even we can read what's inside — encryption happens before anything is saved.",
    name: "Client-side encryption",
    role: "Security design principle",
    avatar: "/dreelio/avatars/generic-1.svg",
  },
  {
    quote:
      "Every password, document, and note is encrypted with AES-256 before it's stored, and decrypted with a key derived through 600,000 rounds of PBKDF2.",
    name: "AES-256 at rest",
    role: "Security design principle",
    avatar: "/dreelio/avatars/generic-2.svg",
  },
  {
    quote:
      "PIN and biometric unlock use their own independent key derivation, so unlocking your device never exposes your actual vault key.",
    name: "Independent PIN keys",
    role: "Security design principle",
    avatar: "/dreelio/avatars/generic-3.svg",
  },
  {
    quote:
      "Access is invite-only and enforced at the database level, so every row you see is checked against your active membership, not just your login.",
    name: "Invite-only access",
    role: "Security design principle",
    avatar: "/dreelio/avatars/generic-4.svg",
  },
];

export const PLANS = [
  {
    name: "Velora Personal",
    price: "Free",
    blurb: "For individuals safeguarding their own passwords, documents, and notes.",
    features: ["Unlimited passwords", "Encrypted documents & notes", "PIN & biometric unlock", "Cross-vault search", "iOS & Android app"],
    cta: "Request access",
    highlight: false,
  },
  {
    name: "Velora Family",
    price: "Free",
    priceAnnual: "Free",
    blurb: "For households sharing one private space for financial essentials.",
    features: ["Everything in Personal", "Wallet & bank vaults", "Camera-based card scanning", "AI-assisted magic import", "Priority support"],
    cta: "Request access",
    highlight: true,
  },
  {
    name: "Velora Team",
    price: "By invite",
    blurb: "For small teams who need an admin-managed, shared vault.",
    features: ["Everything in Family", "Admin approval queue", "Per-member access control", "Row-level data isolation", "Audit-friendly activity log"],
    cta: "Contact us",
    highlight: false,
  },
];

export const FEATURED_POST = {
  tag: "Must read",
  title: "Why your vault's master key should never touch a server",
  excerpt: "A look at how client-side encryption works in Velora Vault, and why the key that unlocks your data never leaves your device.",
  author: "The Velora Vault Team",
  role: "Security notes",
  image: "/dreelio/blog/post1.png",
  badge: "Featured",
};

export const BLOG_POSTS = [
  { title: "What AES-256 actually protects you from", tag: "Security", tagColor: "blue" as const, image: "/dreelio/blog/post3.png" },
  { title: "PIN vs. password: why we derive them differently", tag: "Explainer", tagColor: "amber" as const, image: "/dreelio/blog/cloud.png" },
  { title: "Moving off spreadsheets: importing your first 100 logins", tag: "Guide", tagColor: "green" as const, image: "/dreelio/blog/calculator.png" },
];

export const FOOTER_COLUMNS = [
  {
    heading: "Pages",
    links: [
      { label: "Home", href: "/" },
      { label: "Features", href: "#features" },
      { label: "Access", href: "#pricing" },
      { label: "Blog", href: "#blog" },
    ],
  },
  {
    heading: "Information",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms of use", href: "/terms" },
      { label: "Sign in", href: "/login" },
    ],
  },
];
