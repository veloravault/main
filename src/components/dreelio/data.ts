// All copy + content for the Velora Vault landing page, kept in one place so
// the section components stay presentational.

export type PublicNavIcon =
  | "bank-card"
  | "contact"
  | "document"
  | "help"
  | "import"
  | "journal"
  | "password"
  | "passphrase"
  | "security"
  | "strength"
  | "username"
  | "workflow";

type PublicNavLink = {
  label: string;
  href: string;
  description: string;
  icon: PublicNavIcon;
  featured?: boolean;
};

type PublicNavSection = {
  heading: string;
  links: readonly { label: string; href: string }[];
  highlight?: boolean;
};

export const PRODUCT_LINKS = [
  {
    label: "Password Manager",
    href: "/password-manager",
    description: "Create, organize, and unlock your private vault.",
    icon: "password",
    featured: true,
  },
  {
    label: "How it works",
    href: "/how-it-works",
    description: "Understand accounts, encryption, and unlocking.",
    icon: "workflow",
  },
  {
    label: "Secure Documents",
    href: "/features/secure-documents",
    description: "Protect important files beside their details.",
    icon: "document",
  },
  {
    label: "Digital Wallet",
    href: "/features/digital-wallet",
    description: "Keep cards and bank records clearly organized.",
    icon: "bank-card",
  },
  {
    label: "Magic Import",
    href: "/features/magic-import",
    description: "Turn submitted source text into reviewable records.",
    icon: "import",
  },
] as const satisfies readonly PublicNavLink[];

export const UTILITY_LINKS = [
  {
    label: "Password Generator",
    href: "/utilities/password-generator",
    description: "Create a strong random password locally.",
    icon: "password",
  },
  {
    label: "Passphrase Generator",
    href: "/utilities/passphrase-generator",
    description: "Build a memorable multi-word passphrase.",
    icon: "passphrase",
  },
  {
    label: "Username Generator",
    href: "/utilities/username-generator",
    description: "Generate a readable or random username.",
    icon: "username",
  },
  {
    label: "Password Strength Tester",
    href: "/utilities/password-strength",
    description: "Assess password length and variety locally.",
    icon: "strength",
  },
] as const satisfies readonly PublicNavLink[];

export const RESOURCE_LINKS = [
  {
    label: "Security",
    href: "/security",
    description: "Read the boundaries behind Velora encryption.",
    icon: "security",
  },
  {
    label: "Help Center",
    href: "/help",
    description: "Find setup, unlocking, and recovery guidance.",
    icon: "help",
  },
  {
    label: "Blog",
    href: "/blog",
    description: "Explore practical password and privacy guides.",
    icon: "journal",
  },
  {
    label: "Contact",
    href: "/contact",
    description: "Send a question to the Velora team.",
    icon: "contact",
  },
] as const satisfies readonly PublicNavLink[];

export const PRODUCT_NAV_SECTIONS = [
  {
    heading: "Password Manager",
    links: [PRODUCT_LINKS[0], PRODUCT_LINKS[1]],
  },
  {
    heading: "Vault features",
    links: [PRODUCT_LINKS[2], PRODUCT_LINKS[3]],
  },
  {
    heading: "Explore Velora",
    highlight: true,
    links: [
      PRODUCT_LINKS[4],
      { label: "Security", href: "/security" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
] as const satisfies readonly PublicNavSection[];

export const UTILITY_NAV_SECTIONS = [
  {
    heading: "Create credentials",
    links: [UTILITY_LINKS[0], UTILITY_LINKS[1]],
  },
  {
    heading: "Create an identity",
    links: [UTILITY_LINKS[2]],
  },
  {
    heading: "Check security",
    highlight: true,
    links: [
      UTILITY_LINKS[3],
      { label: "Security overview", href: "/security" },
    ],
  },
] as const satisfies readonly PublicNavSection[];

export const RESOURCE_NAV_SECTIONS = [
  {
    heading: "Learn",
    links: [RESOURCE_LINKS[1], RESOURCE_LINKS[2]],
  },
  {
    heading: "Trust and privacy",
    links: [
      RESOURCE_LINKS[0],
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of use", href: "/terms" },
    ],
  },
  {
    heading: "Connect",
    highlight: true,
    links: [RESOURCE_LINKS[3], { label: "Get started free", href: "/signup" }],
  },
] as const satisfies readonly PublicNavSection[];

export const NAV_GROUPS = [
  { id: "products", label: "Products", links: PRODUCT_LINKS, sections: PRODUCT_NAV_SECTIONS },
  { id: "utilities", label: "Utilities", links: UTILITY_LINKS, sections: UTILITY_NAV_SECTIONS },
  { id: "resources", label: "Resources", links: RESOURCE_LINKS, sections: RESOURCE_NAV_SECTIONS },
] as const;

export const PRIMARY_NAV_LINKS = [
  { label: "Pricing", href: "/pricing" },
] as const;

export const SEARCH_ITEMS = [
  { label: "Home", href: "/", keywords: "velora vault password manager", popular: true },
  { label: "Sign in", href: "/login", keywords: "login account access", popular: true },
  { label: "Get started free", href: "/signup", keywords: "signup register free", popular: true },
  { label: "Password manager", href: "/password-manager", keywords: "features passwords notes encrypted vault", popular: true },
  { label: "How it works", href: "/how-it-works", keywords: "account encryption unlock master key", popular: true },
  { label: "Secure documents", href: "/features/secure-documents", keywords: "files upload identity storage", popular: false },
  { label: "Digital wallet", href: "/features/digital-wallet", keywords: "cards bank accounts financial records", popular: false },
  { label: "Magic Import", href: "/features/magic-import", keywords: "ai extract migrate paste review", popular: false },
  { label: "Help center", href: "/help", keywords: "support recovery setup answers", popular: true },
  { label: "Security", href: "/security", keywords: "encryption privacy master key", popular: true },
  { label: "Pricing", href: "/pricing", keywords: "free plus plans cost", popular: true },
  { label: "Password Generator", href: "/utilities/password-generator", keywords: "random strong password", popular: true },
  { label: "Passphrase Generator", href: "/utilities/passphrase-generator", keywords: "memorable words", popular: false },
  { label: "Username Generator", href: "/utilities/username-generator", keywords: "anonymous handle", popular: false },
  { label: "Password Strength Tester", href: "/utilities/password-strength", keywords: "check score security", popular: true },
  { label: "Blog", href: "/blog", keywords: "guides articles updates", popular: false },
  { label: "Contact", href: "/contact", keywords: "help support question", popular: false },
  { label: "Privacy policy", href: "/privacy", keywords: "data analytics cookies", popular: false },
  { label: "Terms of use", href: "/terms", keywords: "legal conditions", popular: false },
] as const;

export const PROJECT_PILLS = ["Saved logins", "Auto-lock timer", "Secure notes", "Password health"] as const;
export const DOCUMENT_PILLS = ["Identity files", "Protected uploads", "Expiry details", "Fast search"] as const;
export const FINANCE_PILLS = ["Cards", "Bank details", "Encrypted CVV", "Magic import"] as const;

export const SMALL_FEATURES = [
  {
    icon: "sync" as const,
    title: "Open the same encrypted vault",
    body: "Sign in from a supported browser, unlock locally, and Velora Vault fetches the encrypted records tied to your account.",
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

export const SECURITY_PRINCIPLES = [
  {
    index: "01",
    name: "Encrypted before storage",
    detail:
      "Vault records and document contents are encrypted in your browser with AES-256-GCM before they are stored.",
  },
  {
    index: "02",
    name: "A fresh key derivation per item",
    detail:
      "PBKDF2-SHA-256 runs 600,000 iterations with a fresh 16-byte salt and 12-byte IV for each encryption operation.",
  },
  {
    index: "03",
    name: "The master key stays local",
    detail:
      "Your master key is held in memory only while the vault is unlocked. Velora cannot reset it or recover encrypted contents for you.",
  },
  {
    index: "04",
    name: "Ownership plus active membership",
    detail:
      "Database and storage policies require both record ownership and an active membership before encrypted data is returned.",
  },
];

export const FOOTER_COLUMNS = [
  {
    heading: "Pages",
    links: [
      { label: "Home", href: "/" },
      { label: "Password manager", href: "/password-manager" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "Security", href: "/security" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    heading: "Information",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Help center", href: "/help" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms of use", href: "/terms" },
      { label: "Sign in", href: "/login" },
    ],
  },
  {
    heading: "Product",
    links: [
      { label: "Secure documents", href: "/features/secure-documents" },
      { label: "Digital wallet", href: "/features/digital-wallet" },
      { label: "Magic Import", href: "/features/magic-import" },
    ],
  },
  {
    heading: "Utilities",
    links: [
      { label: "Password Generator", href: "/utilities/password-generator" },
      { label: "Passphrase Generator", href: "/utilities/passphrase-generator" },
      { label: "Username Generator", href: "/utilities/username-generator" },
      { label: "Password Strength", href: "/utilities/password-strength" },
    ],
  },
];
