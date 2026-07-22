# Utility Hero Structure Revision

**Date:** 2026-07-22

**Status:** Approved design

**Routes:**

- `/utilities/password-generator`
- `/utilities/passphrase-generator`
- `/utilities/username-generator`
- `/utilities/password-strength`

## Objective

Restructure the opening of every public utility page into a two-stage scroll journey. Visitors first see a spacious, route-specific introduction inspired by Bitwarden's page hierarchy. Scrolling then reveals the existing interactive utility in a dedicated section. Velora Vault's visual identity, navigation, utility behavior, privacy model, educational content, and footer remain unchanged.

This revision is structural. It does not introduce final hero artwork or change generator logic.

## Page hierarchy

Each route follows this order:

1. Existing public navigation
2. Spacious introductory hero
3. Dedicated utility workbench section
4. Existing benefits
5. Existing educational content
6. Existing related utilities
7. Existing account call to action and footer

The hero and workbench must read as separate sections. The workbench must not appear beside the introductory copy at desktop widths.

## Hero

The hero uses a responsive two-column composition on desktop:

- The left column contains the existing local/privacy eyebrow, route-specific `h1`, description, and an anchor action that scrolls to the utility workbench.
- The right column contains a simple structural placeholder reserved for future route-specific artwork.
- The hero occupies enough vertical space to establish an intentional first screen, while avoiding a rigid height that clips content on short displays.
- Background treatment, typography, spacing, and actions use the existing Velora tokens and visual language.

The placeholder consists only of quiet layout primitives: a rounded frame, a secondary inset surface, and a compact result-style strip. It must not use stock photography, generated artwork, fake controls, or route logic. It is decorative and hidden from assistive technology.

## Workbench section

The existing workbench moves below the hero into a dedicated, full-width section.

- The anchor action targets the workbench heading.
- The workbench retains its current markup, labels, state, local-only behavior, and interaction model.
- The section provides clear separation from the hero through spacing and surface treatment rather than an excessive blank gap.
- Existing output wrapping and responsive control behavior remain intact.

### Internal workbench hierarchy

The generator workbenches follow Bitwarden's top-to-bottom hierarchy rather than Velora's previous desktop split view:

1. Workbench heading and local-only marker
2. Settings arranged in a compact responsive control band
3. Full-width generated result
4. Centered regenerate and copy actions

The password-strength workbench uses the equivalent vertical sequence: heading, full-width password input and strength meter, then full-width analysis. Output and settings must never sit in permanent left/right desktop columns. On mobile, the control band collapses to one column while preserving the same reading and focus order.

## Responsive behavior

### Desktop

- Hero presents copy and placeholder side by side.
- The hero approaches one viewport of visual presence after accounting for the public navigation, using `min-height` rather than a fixed height.
- The workbench begins below the hero and uses the available content width.

### Tablet

- The hero keeps two columns while space permits, with a narrower placeholder.
- The workbench remains a separate section and follows its existing responsive internal layout.

### Mobile

- Hero copy appears first and the placeholder stacks below it.
- The hero uses content-driven height, so the workbench is reached through a natural scroll without clipped or hidden content.
- Primary hero action remains at least 44px high.
- The workbench retains the current single-column control flow and must not create horizontal overflow.

## Motion and accessibility

- Preserve the existing restrained hero reveal and reduced-motion behavior.
- The decorative placeholder has `aria-hidden="true"` and contains no focusable elements.
- Preserve one `h1`, semantic section order, visible focus, and the workbench's current labeled controls and live feedback.
- Anchor navigation must leave the workbench heading visible beneath the fixed public navigation by using scroll margin.

## Explicit non-goals

- No final hero illustrations, photos, or generated assets
- No changes to password, passphrase, username, or strength-analysis logic
- No changes to privacy or persistence behavior
- No redesign of the public navigation, footer, benefits, education, related tools, or account CTA
- No new routes or content sections

## Verification

- Contract tests confirm the workbench is outside the hero and the shared placeholder is decorative.
- Existing utility logic and privacy tests remain green.
- ESLint and the production Next.js build pass.
- Browser inspection covers all four routes at desktop and mobile widths, plus one shared tablet check.
- Verify hero-to-workbench scroll order, anchor positioning, light/dark themes, reduced motion, keyboard focus, and absence of horizontal overflow.
