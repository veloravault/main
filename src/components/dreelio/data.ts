// All copy + content for the Velora Vault landing page, kept in one place so
// the section components stay presentational.

export const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Security", href: "/security" },
  { label: "Blog", href: "/blog" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

export const UTILITY_LINKS = [
  { label: "Password Generator", href: "/utilities/password-generator" },
  { label: "Passphrase Generator", href: "/utilities/passphrase-generator" },
  { label: "Username Generator", href: "/utilities/username-generator" },
  { label: "Password Strength Tester", href: "/utilities/password-strength" },
] as const;

export const SEARCH_ITEMS = [
  { label: "Home", href: "/", keywords: "velora vault password manager", popular: true },
  { label: "Sign in", href: "/login", keywords: "login account access", popular: true },
  { label: "Create an account", href: "/signup", keywords: "signup register free", popular: true },
  { label: "Features", href: "/#features", keywords: "passwords documents wallet autofill", popular: true },
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
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Security", href: "/security" },
      { label: "Blog", href: "/blog" },
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
