# WebAuthn Error, Security Story, and Exact-UI Media Design

## Status

Approved by the user on July 18, 2026. The hero playback choice is an autoplaying, muted, inline loop with a static fallback for reduced-motion and data-saving users.

## Goal

Make biometric failures understandable and recoverable, bring the public security page up to date with protections already implemented, and replace mismatched landing-page product imagery with a polished Remotion walkthrough that looks like the real Velora Vault.

## Scope

- WebAuthn enrollment and unlock error handling in the shared biometric boundary and every biometric UI call site
- Factual copy updates to `/security`
- Homepage product media in the hero, feature splits, and device section
- A local Remotion composition, deterministic poster generation, and checked-in web delivery assets
- Focused regression tests plus full project verification

This pass does not change the vault cryptography, WebAuthn credential-storage model, authentication model, pricing, SEO, blog imagery, or user data. It does not use production credentials or real vault content in rendered media.

## WebAuthn error design

### Root cause

`navigator.credentials.create()` and `navigator.credentials.get()` currently allow browser `DOMException` instances to cross the biometric library boundary. Call sites then display `Error.message` directly, exposing inconsistent browser wording such as “The operation either timed out or was not allowed.”

### Error boundary

The biometric library becomes the single translation boundary. It will convert expected WebAuthn failures into a typed, stable application error with:

- a machine-readable code for tests and UI decisions;
- a concise user-facing message;
- an optional recovery action label or hint;
- the original cause retained only for diagnostics, never rendered directly.

Expected classes include:

- **cancelled or timed out:** explain that Face ID, Touch ID, or the device prompt was cancelled or expired and invite the user to try again;
- **unsupported:** explain that the browser/device cannot provide the required platform authenticator and keep PIN/master-key fallback available;
- **blocked context:** explain that biometric unlock needs a secure supported browser context;
- **credential already registered or unavailable:** explain what happened without suggesting that encrypted vault data was lost;
- **credential missing or changed:** direct the user to unlock with the master key and set biometric unlock up again;
- **account changed:** preserve the existing account-binding protection and ask the user to retry in the current account;
- **local wrapper/decryption failure:** explain that biometric unlock must be reset and retain master-key fallback;
- **unexpected:** use a neutral failure message and log the diagnostic cause without leaking implementation details.

All biometric surfaces - settings, initial unlock, PIN fallback, local verification, onboarding/setup, and the dashboard enrollment prompt - will consume the same normalized message. Cancellation is treated as a recoverable state, not as a destructive or vault-corruption warning.

## Security page update

The public page will keep its existing threat-boundary honesty and add a clearly separated “Protection in practice” section for controls now present in the product:

- authenticated-account binding for locally stored PIN and biometric wrappers;
- re-checking the authenticated user after long biometric prompts before committing or unlocking;
- AES-256-GCM encryption before storage, PBKDF2-SHA-256 key derivation, fresh salts, and fresh IVs;
- automatic vault locking and optional clipboard clearing;
- revocation of other authenticated sessions;
- database row-level access controls, membership checks, and private document-storage authorization;
- verified Razorpay webhook signatures, idempotent event processing, and protection against stale subscription events.

Payment integrity will be described as an operational account-control layer, not as part of vault encryption. Copy must not claim server blindness for data or metadata that the implementation can access, and must not imply that biometric credentials replace the master key.

## Landing media architecture

### Chosen approach

Use Remotion with shared presentational primitives. A deterministic demo scene will be derived from the real vault’s current Apple-style tokens, layout, navigation, cards, sheets, spacing, and typography. The same primitives will drive the landing still states and the Remotion composition so the two cannot drift into separate visual products.

Directly mounting authenticated production components inside Remotion is avoided because those components depend on sessions, Supabase state, browser storage, and private data. The demo scene contains fixed fictional records only and performs no network or storage access.

### Hero walkthrough

The hero media will show one coherent journey:

1. the real mobile/desktop vault overview settles into view;
2. the Passwords screen opens and a fictional login is added;
3. the Documents screen appears with a protected document state;
4. the Wallet screen reveals an Apple Wallet-like card stack;
5. the interface returns to the overview with the security status visible.

The sequence uses the same UI proportions and navigation vocabulary as the current vault. Camera movement stays restrained: short spring-like transitions, subtle depth, and no generic floating dashboard panels.

The current oversized decorative `VaultSeal` at the hero image’s top-left is removed. Branding remains in the public navigation and within the vault interface only where the real app displays it.

### Delivery behavior

- Autoplay, muted, loop, and `playsInline` on capable clients.
- Use a generated poster until playback is ready.
- Render the completed poster instead of mounting autoplay video when `prefers-reduced-motion` is active.
- Prefer the poster when the browser reports data-saving mode.
- Keep essential hero text and calls to action outside the media.
- Do not include audio, tracking, credentials, or personal data.
- Render a web-appropriate H.264 MP4 and keep dimensions/aspect ratio stable to prevent layout shift.

### Content-aligned product visuals

Every homepage product visual will correspond to the text beside it:

- hero: full vault overview and short cross-feature walkthrough;
- password feature: actual password-list and password-detail state;
- document feature: actual document vault state rather than a reused overview;
- wallet feature: actual Wallet-style card stack and protected bank record;
- device section: real mobile shell for Mobile and real responsive vault shell for Web.

Existing generic preview states will be replaced or extended rather than layering new unrelated mockups on top. Remote third-party logos will not be required for the core product media.

## Visual direction

The established Velora direction remains iOS Wallet-led on mobile and Apple ecosystem-like throughout:

- white and system-mist surfaces;
- precise dark ink and system-blue actions;
- soft dividers, grouped cards, and controlled translucency;
- native-feeling icons already used by the vault;
- no oversized decorative brand marks, stock photography, or unrelated SaaS-dashboard styling.

Dark mode may be supported by the live still components, but the encoded hero walkthrough will use the light vault appearance shown on the current public landing page for a stable, legible render.

## Accessibility and resilience

- The video is decorative; its accessible label summarizes the demonstrated flow and no essential claim exists only inside it.
- Poster fallback preserves the same meaning.
- Reduced-motion users receive no autoplaying or looping movement.
- Playback failure leaves the poster visible without exposing a broken-video control.
- Biometric errors use `role="alert"` at existing surfaces and do not remove PIN/master-key alternatives.
- No raw exception message, database message, or provider response is rendered to users from the new paths.

## Testing and verification

Implementation follows test-driven development:

1. Add failing unit/source-contract tests for WebAuthn error normalization and all biometric call sites.
2. Add failing landing tests for removal of the oversized hero seal, exact content-to-preview mapping, video attributes, poster fallback, reduced-motion, and data-saving handling.
3. Add failing security-page tests for the newly documented controls and retained limitation language.
4. Implement the smallest changes needed to pass each focused group.
5. Render the Remotion composition and poster locally, then inspect representative frames for layout accuracy.
6. Verify the landing at desktop and mobile widths, with normal motion, reduced motion, and simulated playback failure.
7. Run the focused tests, full test suite, lint, TypeScript checking, and production build sequentially.

The existing user-owned `.claude/settings.json` change remains untouched.
