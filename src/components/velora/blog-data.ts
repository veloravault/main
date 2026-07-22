// Content for the Velora Vault blog, kept in one place so the page and
// post components stay presentational. No CMS - posts are plain data.

export type BlogCategory = "Security" | "Guides" | "Engineering";

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "list"; items: string[] }
  | { type: "link"; text: string; href: string };

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  date: string; // ISO date
  readTime: string;
  body: BlogBlock[];
}

export const CATEGORY_COLORS: Record<BlogCategory, string> = {
  Security: "var(--pill-rust)",
  Guides: "var(--pill-green)",
  Engineering: "var(--pill-blue)",
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "master-key-that-actually-holds",
    title: "How to choose a master key that actually holds",
    excerpt:
      "Length beats complexity. Here's why a four-word passphrase can outlast a twelve-character password with three symbols in it.",
    category: "Security",
    date: "2026-06-02",
    readTime: "2 min read",
    body: [
      {
        type: "p",
        text: "Most password advice optimizes for the wrong variable. It tells you to add a symbol, capitalize a letter, swap an ‘o’ for a zero - and then treats the result as strong because it's hard for a person to read. None of that is what makes a key hard to guess. What makes it hard to guess is entropy: how many possibilities an attacker has to search through before they land on yours.",
      },
      {
        type: "p",
        text: "A twelve-character password drawn from letters, digits, and symbols has roughly 95^12 possible combinations - a huge number on paper. But real passwords aren't drawn evenly from that space. People reuse patterns: a capital letter at the start, a symbol at the end, a year somewhere in the middle. Cracking tools are built around exactly these patterns, so the real search space is far smaller than the math suggests.",
      },
      {
        type: "h2",
        text: "Why four random words beat eleven random characters",
      },
      {
        type: "p",
        text: "A passphrase built from four words picked independently from a large word list - something like correct-horse-battery-staple - has entropy that's easy to calculate honestly, because each word is chosen from a known, large set with no pattern for a cracker to exploit. Four words from a 7,776-word list is roughly 7,776^4 combinations, which lands well above what a twelve-character mixed password achieves in practice, while staying genuinely memorable.",
      },
      {
        type: "p",
        text: "This is exactly why Velora Vault's master key has no upper character limit and doesn't enforce symbol or capitalization rules. Length is what we're asking for. A long passphrase you can actually recall beats a short password you have to write down.",
      },
      {
        type: "list",
        items: [
          "Pick four to six words that aren't a known phrase, lyric, or quote.",
          "Add a number or a made-up word if you want extra margin - not because a rule demands it.",
          "Never reuse your master key anywhere else. It's the one key that unlocks everything else.",
          "Write it down once, on paper, and store that paper somewhere your vault doesn't live.",
        ],
      },
      {
        type: "p",
        text: "One more thing worth saying plainly: Velora cannot recover your master key if you lose it. That's the tradeoff for it never touching our servers. Treat the passphrase you choose today as something you'll need to remember, or safely record, for as long as you use the vault.",
      },
    ],
  },
  {
    slug: "passkeys-vs-passwords",
    title: "Passkeys vs. passwords: what actually changes when you switch",
    excerpt:
      "Passkeys remove the thing phishing depends on - a secret you can be tricked into typing. Here's what that means day to day.",
    category: "Guides",
    date: "2026-06-16",
    readTime: "2 min read",
    body: [
      {
        type: "p",
        text: "A password is a shared secret. You have it, the website has a copy (hashed, ideally), and proving who you are means sending that secret back and hoping nothing in between - your browser, a fake login page, a keylogger - is watching. A passkey removes the secret from that exchange entirely. Instead of a string you type, your device holds a private key that never leaves it, and signs a challenge the site sends. There's nothing to intercept, because nothing sensitive crosses the wire.",
      },
      {
        type: "h2",
        text: "Why this kills phishing specifically",
      },
      {
        type: "p",
        text: "Phishing works because a password is portable - it's just text, so it can be copied into any page that looks convincing enough. A passkey is bound to the specific site it was created for at the cryptographic level. If you land on a lookalike domain, the passkey simply won't offer itself, because the site's identity doesn't match what the key was issued for. This is the single biggest practical difference: it's not that passkeys are ‘more secure’ in the abstract, it's that an entire attack category stops applying.",
      },
      {
        type: "p",
        text: "That said, passkeys don't replace everything a password manager does. You still need somewhere to track which accounts use passkeys, which use passwords, and which use both during the transition period most services are in right now. That's the gap Velora Vault sits in - organizing both alongside each other rather than assuming the world has fully switched.",
      },
      {
        type: "h2",
        text: "Where passwords still make sense",
      },
      {
        type: "list",
        items: [
          "Services that haven't implemented passkeys yet - still the majority of the web.",
          "Shared or recovery accounts where a portable credential is genuinely useful.",
          "Any account where you want a credential you can back up outside a single device ecosystem.",
        ],
      },
      {
        type: "p",
        text: "The practical move isn't picking a side. It's adopting a passkey wherever a service offers one, keeping a strong unique password everywhere else, and having one place that tracks both without asking you to remember which is which.",
      },
      {
        type: "link",
        text: "Related: how to choose a master key that actually holds",
        href: "/blog/master-key-that-actually-holds",
      },
    ],
  },
  {
    slug: "why-600000-iterations",
    title: "Why your master key gets hashed 600,000 times before it touches a database",
    excerpt:
      "A single hash is fast - which is exactly the problem. Key stretching trades speed for cost, on purpose.",
    category: "Engineering",
    date: "2026-06-24",
    readTime: "2 min read",
    body: [
      {
        type: "p",
        text: "A modern hash function like SHA-256 is built to be fast. That's a feature for checksums and a liability for passwords: if computing a hash takes a microsecond, an attacker with a stolen database and a GPU can try billions of candidate passwords per second against it. Speed that helps you also helps them.",
      },
      {
        type: "p",
        text: "Key derivation functions like PBKDF2 exist to break that symmetry. Instead of hashing your master key once, PBKDF2-SHA-256 runs the hash function in a loop - in Velora Vault's case, 600,000 times - for every single derivation. What takes your device a fraction of a second to do once, at login, becomes a genuinely expensive operation to repeat billions of times during an offline guessing attack.",
      },
      {
        type: "h2",
        text: "Why 600,000, specifically",
      },
      {
        type: "p",
        text: "OWASP's current guidance for PBKDF2-SHA-256 recommends a minimum of 600,000 iterations, calibrated against the hardware attackers realistically have access to today. We didn't pick a round number for the sake of it - it's the floor a credible security review holds this kind of key derivation to right now. As commodity hardware gets faster, that number is expected to climb, and ours will move with it.",
      },
      {
        type: "link",
        text: "OWASP Password Storage Cheat Sheet - PBKDF2 recommendations",
        href: "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html",
      },
      {
        type: "h2",
        text: "The salt and IV do a different job",
      },
      {
        type: "p",
        text: "Iteration count slows down guessing a single password. A fresh 16-byte salt per encryption operation stops a different attack: precomputed lookup tables. Without a salt, an attacker can hash every common password once, in advance, and check any stolen hash against that table instantly. A unique salt per record means that precomputation has to be redone from scratch for every single item - which, at scale, makes the shortcut worthless. The fresh 12-byte IV for AES-256-GCM is a separate requirement again: it ensures that encrypting the same plaintext twice never produces the same ciphertext, which matters for both security and for not leaking patterns about what you've stored.",
      },
      {
        type: "p",
        text: "None of these three mechanisms - iteration count, salt, IV - substitute for the others. They defend against different attacks, which is why all three run on every single encryption operation in the vault, not just once at setup.",
      },
      {
        type: "link",
        text: "Related: what “encryption at rest” does - and doesn't - protect you from",
        href: "/blog/what-encryption-at-rest-doesnt-protect",
      },
    ],
  },
  {
    slug: "spotting-a-phishing-page",
    title: "Spotting a phishing page before you type your password",
    excerpt:
      "The tell is almost never the design. It's the three things a copy can't fake without breaking itself.",
    category: "Guides",
    date: "2026-07-01",
    readTime: "2 min read",
    body: [
      {
        type: "p",
        text: "Modern phishing pages are pixel-perfect. Assuming you can spot one by bad design, a misspelled logo, or an off-brand color is advice from a decade ago. The tells that still hold up are structural, not visual - they're things a convincing copy can't fake without giving up the thing that makes it convincing in the first place.",
      },
      {
        type: "h2",
        text: "Three checks that still work",
      },
      {
        type: "list",
        items: [
          "The domain, read right to left from the first single slash. accounts.google.com.security-check.ru is a security-check.ru page, not a Google one - everything before the domain is decoration.",
          "Whether your password manager offers to fill anything at all. A manager that's tied to the real domain simply stays silent on a lookalike, because the saved credential doesn't match. That silence is a stronger signal than anything you'll spot by eye.",
          "Urgency paired with a login form. ‘Your account will be suspended in 24 hours - sign in to confirm’ is a pattern built to short-circuit the two checks above by making you move before you look.",
        ],
      },
      {
        type: "p",
        text: "That second point is worth dwelling on, because it's the most reliable one and the easiest to miss. A password manager doesn't get fooled by good design - it doesn't see the design at all. It matches the credential to the domain, and a domain that's one character off is, cryptographically, a different domain. If you're used to your vault autofilling a login and it suddenly doesn't, that's the moment to stop and read the address bar, not to type the password manually to ‘help it along.’",
      },
      {
        type: "h2",
        text: "What to do if you already typed it in",
      },
      {
        type: "p",
        text: "Change that password immediately, on the real site, from a device you trust. If you reused it anywhere else - which is its own separate problem - change it there too. This is also where a vault's reused-password detection earns its keep: a single phished credential only exposes one account when nothing else shares it.",
      },
      {
        type: "link",
        text: "Related: the case for a quarterly reused-password audit",
        href: "/blog/quarterly-reused-password-audit",
      },
    ],
  },
  {
    slug: "quarterly-reused-password-audit",
    title: "The case for a quarterly reused-password audit",
    excerpt:
      "One leaked account rarely stays contained to one account. Here's why the audit matters more than the strength score.",
    category: "Security",
    date: "2026-07-09",
    readTime: "2 min read",
    body: [
      {
        type: "p",
        text: "A password breach at one company almost never stays a problem for that company alone. Once a set of email-and-password pairs leaks, it gets tried automatically against thousands of other sites - a technique called credential stuffing. The account that actually gets compromised is often not the one that was breached. It's whichever other account happened to share the same password.",
      },
      {
        type: "p",
        text: "This is why a reused-password count matters more than a strength score, most of the time. A password can be long, random, and technically ‘strong’ by every measure a strength meter checks, and still be the reason two unrelated accounts fall together - because strength describes resistance to guessing, not resistance to reuse.",
      },
      {
        type: "h2",
        text: "What a quarterly pass actually looks like",
      },
      {
        type: "list",
        items: [
          "Open your vault's security overview and sort by reused entries first - not weak ones. Reuse is the higher-leverage fix.",
          "For each reused password, change it on every account that shares it, not just the newest one.",
          "Prioritize anything tied to email, banking, or your password manager's own account recovery - these are the accounts that unlock everything downstream of them.",
          "Re-run the check after major public breaches, not only on a fixed schedule. A quarter is a reasonable default cadence, not a hard rule.",
        ],
      },
      {
        type: "p",
        text: "The audit takes minutes once it's a habit. What it prevents - a single old, forgotten, reused password on some account you signed up for once becoming the reason your email gets taken over - is the kind of incident that takes considerably longer to undo.",
      },
    ],
  },
  {
    slug: "what-encryption-at-rest-doesnt-protect",
    title: "What ‘encryption at rest’ does - and doesn't - protect you from",
    excerpt:
      "Encrypted storage is real protection against one attacker and no protection at all against a different one. Knowing which is which matters.",
    category: "Security",
    date: "2026-07-15",
    readTime: "2 min read",
    body: [
      {
        type: "p",
        text: "“Your data is encrypted at rest” is one of the most common security claims a product makes, and one of the least specific. It answers a narrow question - what happens if someone gets a copy of the raw database or storage bucket - and says nothing about several other, more common ways vault contents actually get exposed.",
      },
      {
        type: "h2",
        text: "What it does protect against",
      },
      {
        type: "p",
        text: "If Velora's database or object storage were ever accessed by someone without authorization - a misconfigured permission, a compromised backup, a subpoena to the wrong party - what they'd find is ciphertext produced by AES-256-GCM, keyed to a value derived from your master key through 600,000 rounds of PBKDF2-SHA-256. Without that master key, the ciphertext is not meaningfully recoverable with any hardware that exists today. This is the specific, real thing encryption at rest buys you: a stolen copy of the storage layer is not a stolen copy of your data.",
      },
      {
        type: "h2",
        text: "What it doesn't protect against",
      },
      {
        type: "list",
        items: [
          "An unlocked device in someone else's hands - the vault is already decrypted in that session.",
          "Malware or a malicious browser extension running while the vault is unlocked, reading memory or the DOM directly.",
          "Phishing, keylogging, or clipboard monitoring that captures the master key as you type or paste it, before encryption ever happens.",
          "A weak, reused, or shared master key - encryption strength is irrelevant if the key guarding it is guessable.",
          "Content you deliberately copy or export after decrypting it locally.",
        ],
      },
      {
        type: "p",
        text: "None of this is a flaw specific to Velora Vault - it's true of every encrypted vault product, because it's a property of what encryption at rest actually is: protection for data in storage, not protection for data the moment it's in use on a compromised device. Any vendor whose marketing implies otherwise is describing a threat model that doesn't exist.",
      },
      {
        type: "p",
        text: "The practical takeaway is that encryption at rest and device hygiene are two separate layers, and skipping the second one because the first sounds strong is where most real-world vault compromises actually happen - not through a broken cipher.",
      },
      {
        type: "link",
        text: "Related: why your master key gets hashed 600,000 times before it touches a database",
        href: "/blog/why-600000-iterations",
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getAdjacentPosts(slug: string): { prev: BlogPost | null; next: BlogPost | null } {
  const index = BLOG_POSTS.findIndex((post) => post.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? BLOG_POSTS[index - 1] : null,
    next: index < BLOG_POSTS.length - 1 ? BLOG_POSTS[index + 1] : null,
  };
}
