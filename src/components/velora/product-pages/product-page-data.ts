export type ProductPageId =
  | "password-manager"
  | "how-it-works"
  | "secure-documents"
  | "digital-wallet"
  | "magic-import"
  | "ssh-keys"
  | "crypto-passphrases"
  | "api-credentials"
  | "wifi-passwords"
  | "2fa-backup-codes";

export type ProductIcon =
  | "bank"
  | "card"
  | "check"
  | "device"
  | "document"
  | "eye"
  | "key"
  | "lock"
  | "search"
  | "shield"
  | "sparkles"
  | "upload";

type ProductPageConfig = {
  eyebrow: string;
  title: string;
  lead: string;
  heroNote: string;
  secondaryAction: { label: string; href: string };
  audience: Array<{ title: string; body: string }>;
  problem: {
    eyebrow: string;
    title: string;
    body: string;
    solutionTitle: string;
    solutionBody: string;
  };
  featuresTitle: string;
  featuresLead: string;
  features: Array<{ icon: ProductIcon; title: string; body: string }>;
  workflow: {
    eyebrow: string;
    title: string;
    body: string;
    steps: Array<{ title: string; body: string }>;
  };
  security: {
    eyebrow: string;
    title: string;
    body: string;
    points: string[];
  };
  related: Array<{ label: string; title: string; body: string; href: string }>;
  faq: Array<{ question: string; answer: string }>;
  finalTitle: string;
  finalBody: string;
};

export const PRODUCT_PAGES: Record<ProductPageId, ProductPageConfig> = {
  "password-manager": {
    eyebrow: "Personal password manager",
    title: "Stop remembering passwords. Start protecting accounts.",
    lead:
      "Create strong credentials, keep them beside the records that matter, and unlock one private vault with a master key only you know.",
    heroNote: "Free plan available. No credit card required.",
    secondaryAction: { label: "See how it works", href: "/how-it-works" },
    audience: [
      { title: "Too many accounts", body: "Replace reused passwords with unique credentials you do not need to memorize." },
      { title: "Important details everywhere", body: "Bring logins, private notes, documents, cards, bank records, and technical credentials into one searchable vault." },
      { title: "Privacy matters", body: "Encrypt vault contents in the browser before they are sent to storage." },
    ],
    problem: {
      eyebrow: "Why a vault helps",
      title: "Password reuse turns one breach into many risks.",
      body:
        "Remembering a different strong password for every account is difficult. Notes, screenshots, and repeated patterns make the problem easier to manage but harder to secure.",
      solutionTitle: "One master key, many unique records.",
      solutionBody:
        "Velora Vault gives every account its own record and strength signal. Your sign-in credentials identify your account. Your separate master key unlocks encrypted vault contents locally.",
    },
    featuresTitle: "Everything needed for a calmer vault",
    featuresLead: "The essentials stay together without pretending every secret is the same kind of record.",
    features: [
      { icon: "key", title: "Strong password records", body: "Save usernames, passwords, URLs, and private details with weak and reused password signals." },
      { icon: "search", title: "Fast private search", body: "Find a login, document, note, card, bank record, or credential from one organized workspace." },
      { icon: "document", title: "More than logins", body: "Keep identity files and document details beside passwords instead of scattering them across apps." },
      { icon: "card", title: "Wallet and bank records", body: "Store cards and account details in purpose-built views with sensitive values masked by default." },
      { icon: "device", title: "Convenient local unlock", body: "Use a PIN or supported biometric wrapper on a trusted device after the master key is enrolled." },
      { icon: "shield", title: "Clear security boundaries", body: "Understand what encryption protects, what recovery cannot do, and how device risks still matter." },
    ],
    workflow: {
      eyebrow: "A practical daily flow",
      title: "Save once, inspect quickly, lock deliberately.",
      body: "Velora Vault separates account access from vault decryption so each control has one clear job.",
      steps: [
        { title: "Create your account", body: "Confirm your email and choose an account password used only for signing in." },
        { title: "Set a master key", body: "Choose the separate secret that encrypts and unlocks vault contents in your browser." },
        { title: "Add organized records", body: "Save logins, notes, documents, cards, bank details, and technical credentials in their proper views." },
        { title: "Lock when finished", body: "Use auto-lock or lock manually so readable values leave the active vault session." },
      ],
    },
    security: {
      eyebrow: "Security model",
      title: "Encryption starts before storage.",
      body:
        "Vault records and document contents are encrypted with AES-256-GCM in the browser. Authorization controls which encrypted records an account can fetch. The master key is still required to decrypt them.",
      points: [
        "Master key held in memory while unlocked",
        "Fresh salt and IV for each encryption operation",
        "Ownership and active membership checked before data access",
      ],
    },
    related: [
      { label: "Understand the flow", title: "How Velora Vault works", body: "Follow account creation, encryption, storage, and local unlock in order.", href: "/how-it-works" },
      { label: "Protect files", title: "Secure documents", body: "Keep sensitive files and their useful details together.", href: "/features/secure-documents" },
      { label: "Move faster", title: "Magic Import", body: "Extract candidate records, review them, then choose what to save.", href: "/features/magic-import" },
    ],
    faq: [
      { question: "Is the account password the master key?", answer: "No. The account password signs you in. The master key separately encrypts and unlocks vault contents." },
      { question: "Can Velora recover my master key?", answer: "No. A hint can help you remember it, but Velora cannot reveal or reset the key that decrypts existing contents." },
      { question: "What can I store?", answer: "Velora Vault currently supports passwords, secure notes, documents, payment cards, bank account records, SSH keys, crypto passphrases, API credentials, WiFi passwords, and 2FA backup codes." },
    ],
    finalTitle: "Give every important record one protected home.",
    finalBody: "Create a free account, set your master key, and build your vault at your own pace.",
  },
  "how-it-works": {
    eyebrow: "How Velora Vault works",
    title: "Two credentials. One clear security model.",
    lead:
      "Your account password proves who you are. Your master key unlocks your encrypted vault. Keeping those roles separate makes the journey easier to inspect.",
    heroNote: "Account access and vault decryption remain separate.",
    secondaryAction: { label: "Read security details", href: "/security" },
    audience: [
      { title: "Account password", body: "Used with your email to authenticate your Velora Vault account." },
      { title: "Master key", body: "Used in the browser to encrypt and decrypt vault contents." },
      { title: "Master key hint", body: "Optional memory assistance that never contains or recovers the key itself." },
    ],
    problem: {
      eyebrow: "The important distinction",
      title: "Signing in is not the same as unlocking.",
      body:
        "Authentication can prove that an account belongs to you, but it should not silently reveal the key that decrypts its private vault data.",
      solutionTitle: "Identity first, decryption second.",
      solutionBody:
        "Velora first verifies the account and active membership. The browser can then fetch owned ciphertext. Only the correct master key turns that ciphertext back into readable vault contents.",
    },
    featuresTitle: "The journey from account to unlocked vault",
    featuresLead: "Each stage has a narrow responsibility and a visible failure boundary.",
    features: [
      { icon: "check", title: "Email confirmation", body: "A confirmation link verifies the address before vault setup continues." },
      { icon: "key", title: "Separate master key", body: "The master key is created after account confirmation and never doubles as the sign-in password." },
      { icon: "lock", title: "Browser-side encryption", body: "Readable records are encrypted before database or object storage receives them." },
      { icon: "shield", title: "Authorization checks", body: "Owned ciphertext is returned only when the account has an active membership." },
      { icon: "device", title: "Session-only unlock", body: "The master key stays in memory for the active unlocked session and clears when the security context changes." },
      { icon: "eye", title: "Honest recovery", body: "Password reset restores sign-in only. It does not decrypt records created with a lost master key." },
    ],
    workflow: {
      eyebrow: "Five stages",
      title: "From new account to private workspace.",
      body: "The ordered flow keeps authentication, authorization, and encryption from becoming one vague promise.",
      steps: [
        { title: "Create and confirm", body: "Set account credentials and confirm the email address." },
        { title: "Set the master key", body: "Choose the secret used to derive encryption keys in the browser." },
        { title: "Encrypt before sending", body: "Velora encrypts each approved record with a fresh salt and IV." },
        { title: "Store ciphertext", body: "Database and private object storage receive encrypted contents tied to the owner." },
        { title: "Unlock locally", body: "After sign-in, enter the same master key to decrypt fetched ciphertext on the device." },
      ],
    },
    security: {
      eyebrow: "What recovery can do",
      title: "A hint helps memory. It does not weaken the boundary.",
      body:
        "The optional hint can be retrieved for the authenticated account. It should remind you of the key without containing the key. If the master key is lost, previously encrypted contents remain unreadable.",
      points: [
        "Account password reset restores authentication only",
        "A hint cannot reveal or reset the master key",
        "PIN and biometrics are local convenience wrappers",
      ],
    },
    related: [
      { label: "Product overview", title: "Password manager", body: "See the records and daily workflows supported by the vault.", href: "/password-manager" },
      { label: "Technical boundaries", title: "Security architecture", body: "Inspect cryptography, authorization, recovery, and device risks.", href: "/security" },
      { label: "Need an answer", title: "Help center", body: "Find setup, unlock, recovery, storage, and billing guidance.", href: "/help" },
    ],
    faq: [
      { question: "Where is the master key stored?", answer: "It is held in browser memory while the vault is unlocked. Local PIN or biometric setup can store an account-bound wrapped form on that device." },
      { question: "What happens when the vault locks?", answer: "The active readable key material is cleared from the vault session. You must unlock again to read encrypted contents." },
      { question: "Does changing my account password change the master key?", answer: "No. Account authentication and vault encryption use separate credentials and separate recovery paths." },
    ],
    finalTitle: "Start with a security model you can explain.",
    finalBody: "Create your account, confirm your email, and set the separate key that protects your vault.",
  },
  "secure-documents": {
    eyebrow: "Secure documents",
    title: "Keep sensitive files beside the details you need.",
    lead:
      "Protect identity, finance, medical, work, and personal files with useful labels, categories, expiry details, and encrypted storage.",
    heroNote: "Document contents are encrypted in the browser before upload.",
    secondaryAction: { label: "See security details", href: "/security" },
    audience: [
      { title: "Identity records", body: "Keep passports, licences, certificates, and supporting details organized." },
      { title: "Financial paperwork", body: "Protect statements, policies, tax records, and receipts without relying on email threads." },
      { title: "Personal archives", body: "Give private files a searchable name and category instead of an unclear filename." },
    ],
    problem: {
      eyebrow: "Files need context",
      title: "A protected file is still hard to use when it is hard to find.",
      body:
        "Sensitive documents often live in downloads, inboxes, or folders with filenames that reveal too little or too much. Important numbers and expiry dates become separate notes.",
      solutionTitle: "Store the file and its useful details together.",
      solutionBody:
        "Velora combines encrypted file storage with safe labels, categories, document numbers, expiry information, and search. The readable content is available only after the vault is unlocked.",
    },
    featuresTitle: "A document vault built for retrieval",
    featuresLead: "Organization is part of protection because the right file should be easy for you, and difficult for everyone else, to reach.",
    features: [
      { icon: "upload", title: "Protected uploads", body: "Encrypt document bytes in the browser before they enter private object storage." },
      { icon: "sparkles", title: "Assisted naming", body: "Request a concise title and broad category, then review the suggestion before saving." },
      { icon: "search", title: "Searchable labels", body: "Find records by their safe title and category without exposing file contents in navigation." },
      { icon: "document", title: "Useful metadata", body: "Keep numbers, issuing details, dates, and private notes beside the corresponding file." },
      { icon: "eye", title: "Controlled viewing", body: "Open a protected preview only inside an authenticated and unlocked vault session." },
      { icon: "shield", title: "Private storage paths", body: "Owner and active-membership policies protect encrypted rows and document objects." },
    ],
    workflow: {
      eyebrow: "Document flow",
      title: "Add, describe, encrypt, retrieve.",
      body: "The workflow keeps review in front of storage so you control the record that enters the vault.",
      steps: [
        { title: "Choose a supported file", body: "Select the document from a trusted device and check that it is the intended file." },
        { title: "Review its details", body: "Confirm the title, category, expiry information, and optional notes." },
        { title: "Encrypt before upload", body: "The browser encrypts the document and metadata for storage." },
        { title: "Find it when needed", body: "Search the safe label, unlock the vault, and request temporary access to the encrypted object." },
      ],
    },
    security: {
      eyebrow: "Document security",
      title: "Private storage is one layer of the design.",
      body:
        "Encrypted document bytes live in a private bucket, while authorization policies restrict object access to the owner with active membership. Device malware, screen capture, and copied exports remain outside that protection.",
      points: [
        "Browser-side AES-256-GCM encryption",
        "Private object storage with owner checks",
        "Readable previews limited to an unlocked session",
      ],
    },
    related: [
      { label: "Complete vault", title: "Password manager", body: "Keep documents beside logins, notes, cards, and bank records.", href: "/password-manager" },
      { label: "Understand access", title: "How it works", body: "Follow account verification, authorization, and local decryption.", href: "/how-it-works" },
      { label: "Find guidance", title: "Help center", body: "Review document, unlock, and account support topics.", href: "/help" },
    ],
    faq: [
      { question: "Are document files encrypted before upload?", answer: "Yes. Document contents are encrypted in the browser before the encrypted bytes are sent to private object storage." },
      { question: "Can Velora read an encrypted document?", answer: "Velora stores encrypted bytes. Reading them requires the correct master key in an authenticated, unlocked vault session." },
      { question: "Does assisted naming save automatically?", answer: "No. A suggestion is presented for review so you remain responsible for the title, category, and final save action." },
    ],
    finalTitle: "Move important files out of forgotten folders.",
    finalBody: "Create your vault and give every sensitive document a protected, searchable record.",
  },
  "digital-wallet": {
    eyebrow: "Digital wallet",
    title: "Cards and bank details, organized without the clutter.",
    lead:
      "Keep payment cards and bank account records in dedicated views with sensitive values hidden until you choose to reveal them.",
    heroNote: "Velora stores records. It does not process contactless payments.",
    secondaryAction: { label: "Explore Magic Import", href: "/features/magic-import" },
    audience: [
      { title: "Several cards", body: "Identify each card quickly without showing the full number in the list." },
      { title: "Several accounts", body: "Keep account numbers, IFSC or routing details, and account names in a separate bank vault." },
      { title: "Private access", body: "Reveal and copy a sensitive value only from its selected record." },
    ],
    problem: {
      eyebrow: "Financial details deserve structure",
      title: "Screenshots and notes mix sensitive values with everyday clutter.",
      body:
        "A card number, CVV, PIN, bank account number, and internet banking login are different records. Combining them in one note makes each harder to find and easier to expose.",
      solutionTitle: "Purpose-built records keep the boundaries visible.",
      solutionBody:
        "Velora separates payment cards, bank account records, and login credentials. Masked list views support recognition, while selected detail views control reveal and copy actions.",
    },
    featuresTitle: "A wallet that behaves like a private record system",
    featuresLead: "Visual familiarity helps you find the right record while masking keeps the most sensitive values quiet.",
    features: [
      { icon: "card", title: "Dedicated card records", body: "Store cardholder, number, expiry, CVV, PIN, UPI PIN, and private notes in one record." },
      { icon: "bank", title: "Separate bank vault", body: "Keep account number, IFSC or routing code, account name, and supporting details together." },
      { icon: "eye", title: "Masked by default", body: "List and card views show only enough information to recognize the record." },
      { icon: "check", title: "Focused copy controls", body: "Copy a specific value from the selected record instead of exposing the entire item." },
      { icon: "search", title: "Filterable organization", body: "Filter cards by useful segments and find a bank record by its safe title." },
      { icon: "lock", title: "Encrypted records", body: "Financial record contents use the same browser-side vault encryption as passwords and notes." },
    ],
    workflow: {
      eyebrow: "Wallet flow",
      title: "Recognize first. Reveal only when needed.",
      body: "The list and detail hierarchy keeps high-risk values out of the default browsing state.",
      steps: [
        { title: "Add the right record type", body: "Choose a payment card or bank account so fields stay meaningful." },
        { title: "Confirm the details", body: "Review the title, identifying information, and any sensitive values before saving." },
        { title: "Browse masked records", body: "Use brand, title, and last digits to select the intended item." },
        { title: "Reveal one detail", body: "Open the selected record and reveal or copy only the value you need." },
      ],
    },
    security: {
      eyebrow: "Wallet boundaries",
      title: "Protected storage is not a payment service.",
      body:
        "Velora encrypts and organizes financial records. It does not issue cards, authorize transactions, replace a banking app, or provide tap-to-pay. The device screen and clipboard still require care after a value is revealed.",
      points: [
        "Sensitive fields masked in browsing views",
        "Optional clipboard clearing reduces exposure time",
        "Device and phishing risks remain your responsibility",
      ],
    },
    related: [
      { label: "Move records", title: "Magic Import", body: "Extract card, bank, password, and note candidates for review.", href: "/features/magic-import" },
      { label: "Complete vault", title: "Password manager", body: "Keep financial records beside the accounts they support.", href: "/password-manager" },
      { label: "Know the boundary", title: "Security architecture", body: "Read the implemented controls and unresolved device risks.", href: "/security" },
    ],
    faq: [
      { question: "Can I make payments with Velora Vault?", answer: "No. The digital wallet stores and organizes private records. It is not a payment instrument or contactless wallet." },
      { question: "Are full card numbers always visible?", answer: "No. Browsing views mask sensitive values. You choose when to reveal a selected record in the unlocked vault." },
      { question: "Should bank logins be saved as bank accounts?", answer: "No. Save internet banking credentials as password records and bank account numbers or routing details as bank records." },
    ],
    finalTitle: "Give financial details the structure they deserve.",
    finalBody: "Create your vault and separate cards, bank accounts, and logins into clear protected records.",
  },
  "magic-import": {
    eyebrow: "Magic Import",
    title: "Turn messy source text into records you can review.",
    lead:
      "Paste supported source content, let assisted extraction propose passwords, notes, cards, and bank records, then edit every candidate before anything is saved.",
    heroNote: "AI-assisted extraction is explicit, metered, and review-first.",
    secondaryAction: { label: "See wallet records", href: "/features/digital-wallet" },
    audience: [
      { title: "Moving from notes", body: "Separate mixed credentials and financial details into the right record types." },
      { title: "Cleaning an export", body: "Turn a supported text block into editable candidates without retyping every field." },
      { title: "Staying in control", body: "Review, change, skip, or approve every candidate before it reaches the vault." },
    ],
    problem: {
      eyebrow: "Migration is usually tedious",
      title: "Useful data rarely arrives in the shape your vault needs.",
      body:
        "A copied note can contain logins, bank details, card values, and unrelated text. Manual entry is slow, while blind import can create the wrong record types or save unwanted values.",
      solutionTitle: "Extraction proposes. You decide.",
      solutionBody:
        "Magic Import sends only the content you explicitly submit to the configured AI provider for structured extraction. Velora presents editable candidates and saves only the records you approve into the unlocked vault.",
    },
    featuresTitle: "A review workspace, not an automatic dump",
    featuresLead: "The important interaction is the pause between extraction and save.",
    features: [
      { icon: "upload", title: "Paste-to-extract", body: "Submit a bounded text source only when you are ready to request assisted extraction." },
      { icon: "sparkles", title: "Typed candidates", body: "Receive proposed passwords, notes, cards, and bank account records in separate groups." },
      { icon: "eye", title: "Full review step", body: "Inspect and edit titles, fields, and extra details before approving a record." },
      { icon: "check", title: "Selective saving", body: "Save approved candidates and leave unwanted or incorrect suggestions behind." },
      { icon: "shield", title: "Authenticated and metered", body: "Import requests require an active member and consume the plan's available AI usage." },
      { icon: "lock", title: "Encrypted after approval", body: "Approved records enter the same browser-side encryption flow as manually created vault items." },
    ],
    workflow: {
      eyebrow: "Import flow",
      title: "Four deliberate stages from source to vault.",
      body: "No candidate becomes a vault record until you reach the final save decision.",
      steps: [
        { title: "Provide the source", body: "Paste the bounded text you want the extraction service to analyze." },
        { title: "Extract candidates", body: "The configured AI provider proposes structured record types and fields." },
        { title: "Review and correct", body: "Edit each candidate, verify sensitive values, and remove anything you do not want." },
        { title: "Approve the save", body: "Chosen records are encrypted in the browser and written to their corresponding vault tables." },
      ],
    },
    security: {
      eyebrow: "Privacy boundary",
      title: "AI extraction is not local processing.",
      body:
        "The source content you explicitly submit is sent to the configured AI provider to generate candidate records. Do not submit content you are not permitted to process. Review provider and privacy terms before using the feature.",
      points: [
        "Nothing is saved before your review and approval",
        "Requests require an authenticated active member",
        "Approved vault records are encrypted before storage",
      ],
    },
    related: [
      { label: "Organize results", title: "Digital wallet", body: "See how card and bank candidates become purpose-built records.", href: "/features/digital-wallet" },
      { label: "Protect files", title: "Secure documents", body: "Use the document flow for encrypted file storage and metadata.", href: "/features/secure-documents" },
      { label: "Need guidance", title: "Help center", body: "Review import, privacy, plan, and troubleshooting answers.", href: "/help" },
    ],
    faq: [
      { question: "Does Magic Import run entirely on my device?", answer: "No. The source content you explicitly submit is sent to the configured AI provider for extraction." },
      { question: "Are extracted records saved automatically?", answer: "No. Velora presents editable candidates first. Only approved records are saved." },
      { question: "What record types can be proposed?", answer: "The current flow can propose password records, secure notes, payment cards, and bank account records." },
    ],
    finalTitle: "Move data without giving up the review step.",
    finalBody: "Create your vault, submit only what you choose, and approve every record that enters it.",
  },
  "ssh-keys": {
    eyebrow: "SSH keys",
    title: "Stop pasting SSH keys into notes apps. Start protecting them properly.",
    lead:
      "Keep private keys, public keys, hosts, and passphrases together in one encrypted record - never scattered across config files, chat threads, or plaintext notes.",
    heroNote: "Not plan-limited - unlimited on Free and Plus.",
    secondaryAction: { label: "See API credentials", href: "/features/api-credentials" },
    audience: [
      { title: "Developers and admins", body: "Stop pasting private keys into notes apps or shared documents when you provision a new server." },
      { title: "Anyone managing multiple servers", body: "Keep a key, its host, and its passphrase together instead of guessing which file goes with which machine." },
      { title: "Teams handing off access", body: "Store a key with enough context that the next person doesn't have to ask you where it lives." },
    ],
    problem: {
      eyebrow: "Beyond the usual login",
      title: "A private key doesn't fit in a username-and-password field.",
      body:
        "SSH keys end up in config folders, zipped archives, and pasted into chat threads because most vaults only understand one shape: a login. The key works, but nothing protects it once it leaves the terminal.",
      solutionTitle: "A record built around what a key actually needs.",
      solutionBody:
        "Velora Vault's SSH Key record holds a private key, its matching public key, the host it unlocks, and an optional passphrase - encrypted together the same way as every other item in your vault.",
    },
    featuresTitle: "Built around how SSH keys are actually used",
    featuresLead: "Every field a key needs, and nothing it doesn't - with the private key masked until you choose to reveal it.",
    features: [
      { icon: "key", title: "Private and public key together", body: "Store both halves of the key pair in one record instead of hunting through two files." },
      { icon: "device", title: "Host, right where you need it", body: "Note which server or service the key unlocks so you're never guessing which key goes where." },
      { icon: "lock", title: "Passphrase included", body: "If the key itself is passphrase-protected, keep that passphrase in the same record." },
      { icon: "eye", title: "Masked by default", body: "The private key stays hidden until you choose to reveal it - never shown in a list view." },
      { icon: "search", title: "Find it by name", body: "Search your SSH keys the same way you already search passwords and notes." },
      { icon: "shield", title: "Encrypted like everything else", body: "AES-256-GCM in your browser, before the key ever reaches storage." },
    ],
    workflow: {
      eyebrow: "Add it once",
      title: "Save a key in the shape it actually is.",
      body: "SSH Keys live in the same encrypted vault as your passwords, with their own place and their own fields.",
      steps: [
        { title: "Open SSH Keys", body: "Choose SSH Keys from the vault sidebar - a dedicated space, not a generic notes field." },
        { title: "Paste the key pair", body: "Add the private key and, if you have it, the matching public key." },
        { title: "Add context", body: "Note the host and passphrase so future-you knows exactly what this key is for." },
        { title: "Encrypt and save", body: "Velora Vault encrypts the record in your browser before it reaches storage." },
      ],
    },
    security: {
      eyebrow: "Same encryption, no exceptions",
      title: "A new record type, not a new security model.",
      body:
        "SSH keys are encrypted with the same AES-256-GCM process as every other vault record, and included automatically if you ever rotate your master key.",
      points: [
        "Encrypted in the browser before storage",
        "Included automatically when you rotate your master key",
        "Not limited by plan - unlimited on Free and Plus",
      ],
    },
    related: [
      { label: "More credential types", title: "API credentials", body: "Keep service keys and secrets in their own purpose-built record.", href: "/features/api-credentials" },
      { label: "Complete vault", title: "Password manager", body: "See how SSH keys sit alongside passwords, documents, and wallet records.", href: "/password-manager" },
      { label: "Change your key", title: "Security architecture", body: "Understand encryption and what master key rotation does.", href: "/security" },
    ],
    faq: [
      { question: "Does this count toward my plan's record limits?", answer: "No. SSH keys are unlimited on both Free and Plus." },
      { question: "What happens to my SSH keys if I change my master key?", answer: "They're re-encrypted automatically, in the same rotation that covers your passwords, notes, documents, and wallet records." },
      { question: "Can Magic Import extract SSH keys from pasted text?", answer: "Not yet. Magic Import currently proposes passwords, notes, cards, and bank records; SSH keys are added manually for now." },
    ],
    finalTitle: "Give every SSH key a proper home, not a screenshot.",
    finalBody: "Create your vault and add your first SSH key in under a minute.",
  },
  "crypto-passphrases": {
    eyebrow: "Crypto passphrases",
    title: "Stop photographing your seed phrase. Start encrypting it.",
    lead:
      "Keep a wallet's seed phrase and address in one encrypted record - protected the same way as every other item in your vault, not a photo in your camera roll.",
    heroNote: "Not plan-limited - unlimited on Free and Plus.",
    secondaryAction: { label: "See WiFi passwords", href: "/features/wifi-passwords" },
    audience: [
      { title: "Crypto holders", body: "Protect a seed phrase the same way you protect a password - encrypted, not photographed." },
      { title: "Anyone with more than one wallet", body: "Keep each wallet's phrase and address together instead of guessing which sticky note belongs to which wallet." },
      { title: "People who've outgrown a paper backup", body: "Move a seed phrase out of a drawer and into a vault you can actually search." },
    ],
    problem: {
      eyebrow: "Beyond the usual login",
      title: "A seed phrase isn't a password, and it deserves better than a photo.",
      body:
        "Twelve or twenty-four words are usually written on paper, photographed on a phone, or typed into a plain notes app - each one a way for that phrase to end up somewhere you didn't intend.",
      solutionTitle: "A record built for exactly one purpose.",
      solutionBody:
        "Velora Vault's Crypto Passphrase record holds the seed phrase and wallet address together, encrypted the same way as every other item in your vault - no camera roll, no paper drawer.",
    },
    featuresTitle: "Built around what a wallet actually needs",
    featuresLead: "One record, encrypted, with the phrase masked until you choose to reveal it.",
    features: [
      { icon: "key", title: "Seed phrase, encrypted", body: "Store the full recovery phrase as its own field, not buried in a generic note." },
      { icon: "bank", title: "Wallet address included", body: "Keep the public address beside the phrase so you always know which wallet it belongs to." },
      { icon: "eye", title: "Masked by default", body: "The seed phrase stays hidden until you choose to reveal it - never shown in a list view." },
      { icon: "search", title: "Find it by name", body: "Search your crypto passphrases the same way you already search passwords and notes." },
      { icon: "document", title: "Room for notes", body: "Add context - which exchange, which hardware wallet, which purpose - beside the phrase itself." },
      { icon: "shield", title: "Encrypted like everything else", body: "AES-256-GCM in your browser, before the phrase ever reaches storage." },
    ],
    workflow: {
      eyebrow: "Add it once",
      title: "Save a seed phrase in the shape it actually is.",
      body: "Crypto Passphrases live in the same encrypted vault as your passwords, with their own place and their own fields.",
      steps: [
        { title: "Open Crypto Passphrases", body: "Choose Crypto Passphrases from the vault sidebar - a dedicated space, not a generic note." },
        { title: "Enter the seed phrase", body: "Add the full recovery phrase exactly as your wallet generated it." },
        { title: "Add the wallet address", body: "Note the public address so you always know which wallet this phrase unlocks." },
        { title: "Encrypt and save", body: "Velora Vault encrypts the record in your browser before it reaches storage." },
      ],
    },
    security: {
      eyebrow: "Same encryption, no exceptions",
      title: "A new record type, not a new security model.",
      body:
        "Crypto passphrases are encrypted with the same AES-256-GCM process as every other vault record, and included automatically if you ever rotate your master key.",
      points: [
        "Encrypted in the browser before storage",
        "Included automatically when you rotate your master key",
        "Not limited by plan - unlimited on Free and Plus",
      ],
    },
    related: [
      { label: "More credential types", title: "WiFi passwords", body: "Keep network credentials in their own purpose-built record.", href: "/features/wifi-passwords" },
      { label: "Complete vault", title: "Password manager", body: "See how crypto passphrases sit alongside passwords, documents, and wallet records.", href: "/password-manager" },
      { label: "Change your key", title: "Security architecture", body: "Understand encryption and what master key rotation does.", href: "/security" },
    ],
    faq: [
      { question: "Does this count toward my plan's record limits?", answer: "No. Crypto passphrases are unlimited on both Free and Plus." },
      { question: "What happens to my seed phrase if I change my master key?", answer: "It's re-encrypted automatically, in the same rotation that covers your passwords, notes, documents, and wallet records." },
      { question: "Is this a crypto wallet or exchange?", answer: "No. Velora Vault stores and encrypts the seed phrase and address you give it - it doesn't hold funds, sign transactions, or connect to any blockchain." },
    ],
    finalTitle: "Give your seed phrase a proper home, not a photo.",
    finalBody: "Create your vault and add your first crypto passphrase in under a minute.",
  },
  "api-credentials": {
    eyebrow: "API credentials",
    title: "Stop hardcoding secrets in Slack messages. Start encrypting them.",
    lead:
      "Keep a service name, key, and secret together in one encrypted record - so a rotated credential has one obvious place to update, not five chat threads to search.",
    heroNote: "Not plan-limited - unlimited on Free and Plus.",
    secondaryAction: { label: "See 2FA backup codes", href: "/features/2fa-backup-codes" },
    audience: [
      { title: "Developers and admins", body: "Stop pasting API secrets into Slack, email, or shared docs when a teammate needs access." },
      { title: "Anyone juggling several services", body: "Keep each service's key and secret in its own record instead of one long note." },
      { title: "Teams that rotate credentials", body: "Give a rotated credential one obvious place to update instead of five places to remember." },
    ],
    problem: {
      eyebrow: "Beyond the usual login",
      title: "An API key isn't a username and password, but it still needs a home.",
      body:
        "Service keys and secrets end up in Slack messages, shared spreadsheets, and .env files committed by accident, because most vaults only understand one shape: a login.",
      solutionTitle: "A record built around what an API credential needs.",
      solutionBody:
        "Velora Vault's API Credential record holds a service name, key, and secret together, encrypted the same way as every other item in your vault.",
    },
    featuresTitle: "Built around how API credentials are actually used",
    featuresLead: "Every field a credential needs, with the secret masked until you choose to reveal it.",
    features: [
      { icon: "document", title: "Service name included", body: "Label each credential by the service it belongs to, so you're never guessing which key goes where." },
      { icon: "key", title: "Key and secret together", body: "Keep the public key or client ID beside the secret key or client secret in one record." },
      { icon: "eye", title: "Masked by default", body: "The secret stays hidden until you choose to reveal it - never shown in a list view." },
      { icon: "search", title: "Find it by name", body: "Search your API credentials the same way you already search passwords and notes." },
      { icon: "document", title: "Room for notes", body: "Add context - which environment, which permission scope - beside the credential itself." },
      { icon: "shield", title: "Encrypted like everything else", body: "AES-256-GCM in your browser, before the credential ever reaches storage." },
    ],
    workflow: {
      eyebrow: "Add it once",
      title: "Save a credential in the shape it actually is.",
      body: "API Credentials live in the same encrypted vault as your passwords, with their own place and their own fields.",
      steps: [
        { title: "Open API Credentials", body: "Choose API Credentials from the vault sidebar - a dedicated space, not a generic note." },
        { title: "Name the service", body: "Label the credential so you always know which service it belongs to." },
        { title: "Add the key and secret", body: "Enter the public key or client ID, and the secret key or client secret." },
        { title: "Encrypt and save", body: "Velora Vault encrypts the record in your browser before it reaches storage." },
      ],
    },
    security: {
      eyebrow: "Same encryption, no exceptions",
      title: "A new record type, not a new security model.",
      body:
        "API credentials are encrypted with the same AES-256-GCM process as every other vault record, and included automatically if you ever rotate your master key.",
      points: [
        "Encrypted in the browser before storage",
        "Included automatically when you rotate your master key",
        "Not limited by plan - unlimited on Free and Plus",
      ],
    },
    related: [
      { label: "More credential types", title: "SSH keys", body: "Keep private keys and hosts in their own purpose-built record.", href: "/features/ssh-keys" },
      { label: "Complete vault", title: "Password manager", body: "See how API credentials sit alongside passwords, documents, and wallet records.", href: "/password-manager" },
      { label: "Change your key", title: "Security architecture", body: "Understand encryption and what master key rotation does.", href: "/security" },
    ],
    faq: [
      { question: "Does this count toward my plan's record limits?", answer: "No. API credentials are unlimited on both Free and Plus." },
      { question: "What happens to my API credentials if I change my master key?", answer: "They're re-encrypted automatically, in the same rotation that covers your passwords, notes, documents, and wallet records." },
      { question: "Can Magic Import extract API credentials from pasted text?", answer: "Not yet. Magic Import currently proposes passwords, notes, cards, and bank records; API credentials are added manually for now." },
    ],
    finalTitle: "Give every API credential a proper home, not a Slack thread.",
    finalBody: "Create your vault and add your first API credential in under a minute.",
  },
  "wifi-passwords": {
    eyebrow: "WiFi passwords",
    title: "Stop reading passwords off the router. Start saving them properly.",
    lead:
      "Keep a network name and password in one encrypted record - saved once, found instantly, instead of read off a sticker every time a guest asks.",
    heroNote: "Not plan-limited - unlimited on Free and Plus.",
    secondaryAction: { label: "See 2FA backup codes", href: "/features/2fa-backup-codes" },
    audience: [
      { title: "Anyone with a home network", body: "Save a WiFi password once instead of reading it off the bottom of a router." },
      { title: "Hosts and housemates", body: "Share the network name and password from your vault instead of a sticky note by the door." },
      { title: "People who manage more than one network", body: "Keep home, office, and guest networks each in their own record." },
    ],
    problem: {
      eyebrow: "Beyond the usual login",
      title: "A WiFi password doesn't have a username, but it still needs a home.",
      body:
        "Network passwords live on router stickers, in group chats, and on sticky notes near the desk, because most vaults are built around a login, not a network.",
      solutionTitle: "A record built around exactly what a network needs.",
      solutionBody:
        "Velora Vault's WiFi Password record holds the network name and password together, encrypted the same way as every other item in your vault.",
    },
    featuresTitle: "Built around how WiFi passwords are actually used",
    featuresLead: "Just the two fields a network actually needs, with the password masked until you choose to reveal it.",
    features: [
      { icon: "device", title: "Network name and password", body: "Keep the SSID and password together in one record, not scattered between a sticker and a note." },
      { icon: "eye", title: "Masked by default", body: "The password stays hidden until you choose to reveal it - never shown in a list view." },
      { icon: "search", title: "Find it by name", body: "Search your WiFi passwords the same way you already search passwords and notes." },
      { icon: "document", title: "Room for notes", body: "Add context - which room, which router, which guest network - beside the password itself." },
      { icon: "shield", title: "Encrypted like everything else", body: "AES-256-GCM in your browser, before the password ever reaches storage." },
      { icon: "check", title: "Quick to share", body: "Reveal and copy the password in seconds the next time someone asks for it." },
    ],
    workflow: {
      eyebrow: "Add it once",
      title: "Save a network in the shape it actually is.",
      body: "WiFi Passwords live in the same encrypted vault as your passwords, with their own place and their own fields.",
      steps: [
        { title: "Open WiFi Passwords", body: "Choose WiFi Passwords from the vault sidebar - a dedicated space, not a generic note." },
        { title: "Name the network", body: "Enter the network name (SSID) so you always know which network this record is for." },
        { title: "Add the password", body: "Enter the network password once, so you never have to read it off the router again." },
        { title: "Encrypt and save", body: "Velora Vault encrypts the record in your browser before it reaches storage." },
      ],
    },
    security: {
      eyebrow: "Same encryption, no exceptions",
      title: "A new record type, not a new security model.",
      body:
        "WiFi passwords are encrypted with the same AES-256-GCM process as every other vault record, and included automatically if you ever rotate your master key.",
      points: [
        "Encrypted in the browser before storage",
        "Included automatically when you rotate your master key",
        "Not limited by plan - unlimited on Free and Plus",
      ],
    },
    related: [
      { label: "More credential types", title: "2FA backup codes", body: "Keep one-time recovery codes in their own purpose-built record.", href: "/features/2fa-backup-codes" },
      { label: "Complete vault", title: "Password manager", body: "See how WiFi passwords sit alongside passwords, documents, and wallet records.", href: "/password-manager" },
      { label: "Change your key", title: "Security architecture", body: "Understand encryption and what master key rotation does.", href: "/security" },
    ],
    faq: [
      { question: "Does this count toward my plan's record limits?", answer: "No. WiFi passwords are unlimited on both Free and Plus." },
      { question: "What happens to my WiFi passwords if I change my master key?", answer: "They're re-encrypted automatically, in the same rotation that covers your passwords, notes, documents, and wallet records." },
      { question: "Can Magic Import extract WiFi passwords from pasted text?", answer: "Not yet. Magic Import currently proposes passwords, notes, cards, and bank records; WiFi passwords are added manually for now." },
    ],
    finalTitle: "Give every network password a proper home, not a sticker.",
    finalBody: "Create your vault and add your first WiFi password in under a minute.",
  },
  "2fa-backup-codes": {
    eyebrow: "2FA backup codes",
    title: "Stop screenshotting your backup codes. Start encrypting them.",
    lead:
      "Keep one-time recovery codes in one encrypted record, ready for the moment your authenticator app is unavailable - not buried in a screenshots folder.",
    heroNote: "Not plan-limited - unlimited on Free and Plus.",
    secondaryAction: { label: "See SSH keys", href: "/features/ssh-keys" },
    audience: [
      { title: "Anyone with two-factor enabled", body: "Keep recovery codes ready for the moment your authenticator app or phone is unavailable." },
      { title: "People switching phones", body: "Move backup codes into your vault instead of a screenshot that has to be re-copied every time you upgrade." },
      { title: "Teams managing shared logins", body: "Store a shared account's backup codes somewhere more durable than one person's camera roll." },
    ],
    problem: {
      eyebrow: "Beyond the usual login",
      title: "Backup codes are meant for an emergency - so where are yours right now?",
      body:
        "Two-factor backup codes get screenshotted, printed, or left in a downloads folder, because most vaults are built around a login, not a one-time list of codes.",
      solutionTitle: "A record built around exactly what a backup code list needs.",
      solutionBody:
        "Velora Vault's 2FA Backup Code record holds the service name and the full list of codes together, encrypted the same way as every other item in your vault.",
    },
    featuresTitle: "Built around how backup codes are actually used",
    featuresLead: "One record per service, with the codes masked until the moment you actually need them.",
    features: [
      { icon: "document", title: "Service name included", body: "Label each code list by the service it belongs to, so you can find the right one under pressure." },
      { icon: "key", title: "The full code list, together", body: "Keep every one-time code in a single record instead of a scattered screenshot." },
      { icon: "eye", title: "Masked by default", body: "Codes stay hidden until you choose to reveal them - never shown in a list view." },
      { icon: "search", title: "Find it by name", body: "Search your backup codes the same way you already search passwords and notes." },
      { icon: "document", title: "Room for notes", body: "Add context - which account, which device they were generated for - beside the codes themselves." },
      { icon: "shield", title: "Encrypted like everything else", body: "AES-256-GCM in your browser, before the codes ever reach storage." },
    ],
    workflow: {
      eyebrow: "Add it once",
      title: "Save backup codes in the shape they actually are.",
      body: "2FA Backup Codes live in the same encrypted vault as your passwords, with their own place and their own fields.",
      steps: [
        { title: "Open 2FA Backup Codes", body: "Choose 2FA Backup Codes from the vault sidebar - a dedicated space, not a screenshot." },
        { title: "Name the service", body: "Label the record so you always know which account these codes unlock." },
        { title: "Paste the codes", body: "Add the full list of one-time codes exactly as the service generated them." },
        { title: "Encrypt and save", body: "Velora Vault encrypts the record in your browser before it reaches storage." },
      ],
    },
    security: {
      eyebrow: "Same encryption, no exceptions",
      title: "A new record type, not a new security model.",
      body:
        "2FA backup codes are encrypted with the same AES-256-GCM process as every other vault record, and included automatically if you ever rotate your master key.",
      points: [
        "Encrypted in the browser before storage",
        "Included automatically when you rotate your master key",
        "Not limited by plan - unlimited on Free and Plus",
      ],
    },
    related: [
      { label: "More credential types", title: "Crypto passphrases", body: "Keep a seed phrase and wallet address in their own purpose-built record.", href: "/features/crypto-passphrases" },
      { label: "Complete vault", title: "Password manager", body: "See how backup codes sit alongside passwords, documents, and wallet records.", href: "/password-manager" },
      { label: "Change your key", title: "Security architecture", body: "Understand encryption and what master key rotation does.", href: "/security" },
    ],
    faq: [
      { question: "Does this count toward my plan's record limits?", answer: "No. 2FA backup codes are unlimited on both Free and Plus." },
      { question: "What happens to my backup codes if I change my master key?", answer: "They're re-encrypted automatically, in the same rotation that covers your passwords, notes, documents, and wallet records." },
      { question: "Can Magic Import extract backup codes from pasted text?", answer: "Not yet. Magic Import currently proposes passwords, notes, cards, and bank records; 2FA backup codes are added manually for now." },
    ],
    finalTitle: "Give every backup code a proper home, not a screenshot.",
    finalBody: "Create your vault and add your first set of 2FA backup codes in under a minute.",
  },
};

