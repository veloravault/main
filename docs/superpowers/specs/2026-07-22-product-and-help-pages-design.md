# Product and Help Pages Design

## Goal

Create six responsive public pages that explain Velora Vault clearly and accurately:

- `/password-manager`
- `/how-it-works`
- `/features/secure-documents`
- `/features/digital-wallet`
- `/features/magic-import`
- `/help`

## Direction

Bitwarden informs the information hierarchy, not the visual identity. Each product page leads with a direct promise, identifies who the feature helps, frames the problem and solution, demonstrates the workflow, explains security boundaries, answers common questions, and ends with one account action. Velora Vault keeps its current white or pure black canvas, system typography, blue action color, rounded product surfaces, and full-width layout.

The signature element is an inspectable product panel built from Velora Vault concepts. Each panel shows the relevant vault workflow without borrowed Bitwarden imagery or unsupported platform claims.

## Architecture

The five product and process pages share one typed content model and one responsive presentation component. Route files stay small and server-render metadata. Page-specific copy and related links live in a data module. A dedicated help component provides client-side article filtering without a network request.

## Page hierarchy

Every product page contains:

1. Hero with primary and secondary action
2. Three concise audience or outcome signals
3. Problem and solution split
4. Feature or workflow grid
5. Product-specific visual explanation
6. Security and limitation statement
7. Related page links
8. FAQ using native disclosure controls
9. Final account action

The help page contains a search-led hero, topic cards, filtered quick answers, security and recovery guidance, and a contact action.

## Content boundaries

- Do not claim native apps, browser autofill, automatic cross-device sync, third-party audits, passkeys, sharing, or emergency access.
- Describe document and record encryption as browser-side AES-256-GCM before storage.
- Describe the master key as separate from account credentials and held in memory while unlocked.
- Explain that a master key hint can assist memory but cannot reveal or recover the key.
- Explain that Magic Import sends explicitly submitted content to the configured AI provider for extraction, requires review, and only saves approved records.
- Use “Get started free” for public account actions.
- Do not use em dash characters or entities.

## Responsive and accessibility requirements

- No horizontal overflow from 320 px upward.
- Desktop and tablet layouts collapse to one column on narrow screens.
- All actions meet a 44 px minimum touch target.
- All visible controls have accessible names and keyboard focus states.
- FAQ sections use semantic `details` and `summary` elements.
- Help filtering announces the result count and works without sending the query anywhere.
- Reduced motion preferences are respected.

## Integration

Add all routes to site search and the sitemap. Point the public “Features” navigation item to the main password manager page. Add product and help destinations to the footer while keeping the header compact enough for the existing 125 percent zoom requirement.

