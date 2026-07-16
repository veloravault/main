# Landing Trust Pass Design

## Status

Approved by the user on July 17, 2026 through the instruction to implement all recommended access, security-claim, unfinished-content, and brand-distinction changes.

## Goal

Make the public Velora Vault experience tell one accurate private-beta story, support its security claims with implementation-backed detail, remove placeholder content, and introduce a restrained visual signature that feels specific to Velora.

## Scope

- Public landing page and navigation
- Public request-access explanation
- New public `/security` page
- Landing-page content tests

Authenticated vault screens, admin screens, data models, invitation behavior, and encryption behavior are out of scope so this work remains isolated from concurrent inside-app development.

## Access story

The only public commercial state is **free during private beta**. Every landing CTA uses “Request access.” The access section explains the actual sequence:

1. A visitor submits their name and email.
2. The request is manually reviewed.
3. If approved, Velora sends an invitation email.
4. The visitor accepts the invitation, creates sign-in credentials, and uses a separate master key for the vault.

Copy must not promise a response time, guaranteed invitation, permanent free pricing, or immediate account creation.

## Verified security claims

Public claims are limited to behavior present in the repository:

- Vault records and document contents are encrypted in the browser with AES-256-GCM before storage.
- PBKDF2-SHA-256 uses 600,000 iterations with a fresh 16-byte salt and 12-byte IV for each encryption operation.
- The master key is held in memory for the active unlocked session and is not persisted to the server.
- PIN and platform-authenticator unlock are optional local convenience wrappers that recover the master key into memory; they do not replace the master key.
- Vault tables and document storage require both record ownership and active membership through Supabase row-level security policies.
- Account-password reset does not recover or change the vault master key.

The public explanation must also disclose material boundaries:

- Losing the master key means Velora cannot recover encrypted vault contents.
- An unlocked or compromised device, malicious browser extension, screen capture, clipboard access, phishing, or a weak master key are outside the protection offered by storage encryption.
- AI-assisted text and image import sends only the source material the user explicitly selects to a configured processing service before the approved results are encrypted and saved. Manual entry remains the private alternative.
- A copied local PIN wrapper is still exposed to offline guessing because a six-digit PIN has a small keyspace.

Unverified claims about native iOS/Android apps, instantaneous realtime sync, or biometric unlock never exposing the vault key are removed.

## Landing structure

The unfinished blog section is removed from the page, navigation, and footer. The former testimonial carousel becomes a static “Security architecture” section with four implementation-backed cards and a direct link to `/security`. Static cards avoid duplicated screen-reader content and make the material inspectable without a moving marquee.

The access/pricing area becomes one beta invitation panel instead of three product tiers. It includes the four-step sequence and a single request-access CTA.

## Visual direction

The established Apple-like system remains: quiet neutral surfaces, precise type, soft borders, restrained blue, and short tactile motion. The distinctive Velora signature is a **sealed aperture**: four translucent loops around the existing four-loop mark, resolving into a still, closed seal. It appears in the landing hero and security surfaces, and respects reduced-motion preferences.

Palette remains derived from existing tokens:

- Vault white: `#ffffff`
- System mist: `#f5f5f7`
- Ink: `#1d1d1f`
- Apple blue: `#0071e3`
- Trust green: `#34c759`
- Seal glass: translucent white/blue derived from those tokens

No new typefaces or decorative gradients are introduced. The aperture is the single expressive element.

## Accessibility and performance

- The security architecture uses semantic sections and lists, not duplicated marquee content.
- All motion respects `prefers-reduced-motion` through Framer Motion's reduced-motion hook and CSS media queries.
- Internal route navigation uses Next.js `Link` where practical.
- The `/security` page remains a Server Component with static metadata.

## Verification

- A focused integrity test must fail before implementation and then assert the beta language, access steps, `/security` route, removal of blog placeholders, removal of unsupported claims, and presence of threat/recovery disclosures.
- Run focused landing tests, lint, and a production build.
- Visually verify desktop and mobile landing/access/security routes in the browser.

