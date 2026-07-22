# Security Page Visual Story Design

## Status

Approved by the user on July 17, 2026. This specification extends the approved landing trust pass without changing its verified security claims.

## Goal

Make `/security` feel like part of the Velora public site and explain the security model through restrained, intuitive motion instead of presenting it as a standalone legal document.

## Scope

- The public `/security` route
- Reuse of the existing landing `Nav`, `Footer`, motion tokens, and Velora seal language
- New security-specific visual-story components and styles
- Focused public-page integrity and motion tests

Authenticated vault screens, encryption behavior, data access, invitation behavior, shared inside-app navigation, and security-copy claims are out of scope.

## Content constraints

The existing security-page wording is the source of truth. The redesign may split paragraphs into visual steps or supporting labels, but it must not strengthen, soften, or remove the implemented claims and limitations established by the landing trust pass.

In particular, the page continues to disclose browser-side encryption, key derivation parameters, account authorization, local PIN and biometric limitations, master-key recovery limits, endpoint threats, and AI-import processing boundaries.

## Page structure

1. **Shared public navigation.** Replace the standalone legal header with the same landing `Nav` used on `/`.
2. **Security thesis hero.** Keep the current title and introductory copy alongside an animated “sealed path” illustration: readable vault material becomes ciphertext, passes an authorization gate, and settles behind the Velora seal.
3. **Implemented cryptography facts.** Preserve the four factual cards and reveal them as one staggered group.
4. **Security journey.** Present stored-data encryption, access control, and local unlock as three editorial sections paired with small explanatory animations. The visuals explain sequence and separation of responsibilities; they do not invent product behavior.
5. **Recovery boundary.** Give the unrecoverable master-key warning one focused, high-contrast sealed-key illustration and restrained amber treatment.
6. **Threat and import boundaries.** Keep these sections quieter and text-led, with tactile boundary cards and a clear manual-entry alternative.
7. **Private-beta action.** Retain the existing request-access and privacy actions.
8. **Shared public footer.** End with the same animated landing `Footer` used on `/`.

## Visual direction

The page uses the established Apple-like landing system: neutral grouped surfaces, precise typography, soft separators, system blue, and short spring-like movement. It does not introduce another visual theme.

The signature element is the **sealed path**. A single blue trace moves through four states - readable input, scrambled blocks, authorization checkpoint, sealed storage - then resolves into the existing four-loop Velora mark. This adapts the landing page's sealed-aperture signature to a security explanation rather than using generic shields, locks, or floating gradients.

The page palette remains token-driven:

- Vault white: `#ffffff`
- System mist: `#f5f5f7`
- Ink: `#1d1d1f`
- Apple blue: `#0071e3`
- Trust green: `#34c759`
- Recovery amber: `#ff9500`

No new typeface, stock imagery, generated imagery, or external visual dependency is required.

## Motion behavior

- The hero plays one short load sequence: source rows resolve into ciphertext blocks, the authorization gate opens, and the Velora seal closes.
- Editorial sections use soft scroll reveals with staggered visual steps.
- Cards lift by only a few pixels on hover and compress subtly on tap where interactive.
- Ambient loops are avoided; the page should settle after communicating the model.
- All movement uses the shared landing easing and viewport rules.
- `prefers-reduced-motion` and Framer Motion's reduced-motion hook render the same information in its completed state without translation, pulsing, or sequencing.

## Component boundaries

- `SecurityPageContent` is the client-side visual story wrapper. It owns only presentation motion and receives no sensitive data.
- `SecurityFlowVisual` illustrates encryption and authorization using semantic labels plus decorative layers hidden from assistive technology.
- `RecoveryVisual` illustrates the no-recovery boundary.
- The route remains responsible for metadata and composes `Nav`, page content, and `Footer`.
- Shared landing components are reused without modifying inside-app chrome.

## Responsive behavior

Desktop sections use a two-column editorial layout with copy and illustration alternating naturally. At tablet widths the visuals remain beside short copy where space permits. On mobile every illustration follows its heading and uses the full content width; no horizontal animation or overflow is allowed.

## Accessibility and performance

- Visuals repeat no essential text exclusively in decorative layers.
- Sequential diagrams have concise accessible labels or ordered semantic steps.
- Focus styles and contrast continue to use existing public-site tokens.
- Animations use transforms and opacity rather than layout-triggering properties.
- No video, canvas, remote image, or continuous timer is added.

## Verification

- Add a focused test that first fails, then verifies shared `Nav` and `Footer` composition, security visual-story components, preserved security and limitation copy, and reduced-motion handling.
- Run the focused test, landing/security integrity tests, lint, and a production build.
- Visually verify `/security` on desktop and mobile, including light/dark appearance and reduced-motion completion state.
