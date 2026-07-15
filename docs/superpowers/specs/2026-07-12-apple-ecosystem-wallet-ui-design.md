# Apple Ecosystem Wallet UI Design

## Goal

Refresh Velora Vault with an Apple-ecosystem visual language led by iOS Wallet on mobile and adapted to macOS productivity patterns on larger screens. Correct the wallet-card network logos and make the interface feel like one coherent product without changing authentication, encryption, storage, imports, search, or database behavior.

## Product and Audience

Velora Vault is a private personal vault for passwords, documents, notes, payment cards, and bank accounts. The interface should feel calm, trustworthy, tactile, and immediately understandable to people familiar with Apple devices. Security content stays legible and functional; decoration never competes with stored data.

## Chosen Direction

Use an iOS Wallet-led hybrid:

- Mobile behaves like a native iOS companion: large titles, stacked wallet cards, grouped surfaces, thumb-friendly controls, safe-area spacing, floating translucent tab navigation, and sheet-like overlays.
- Desktop behaves like the same app in the macOS ecosystem: translucent sidebar and toolbar, spacious content canvas, compact navigation, and efficient multi-column layouts where useful.
- Both modes share the same tokens, typography, icon weight, motion timing, and interaction states.

Pure iOS styling everywhere was rejected because it wastes desktop space. A macOS-first direction was rejected because it weakens the requested iOS Wallet character on mobile.

## Visual System

### Color tokens

- System blue: `#007AFF` for primary actions, active navigation, focus, and selected states.
- Graphite: `#1C1C1E` for primary light-mode text.
- Grouped gray: `#F2F2F7` for the light application background.
- Elevated white: `#FFFFFF` for light-mode cards and grouped surfaces.
- Night: `#000000` for the dark application background.
- Night surface: `#1C1C1E` for dark grouped surfaces.

Existing semantic success, warning, and destructive colors remain restrained and must preserve contrast. Card-specific gradients can vary by issuer but may not change the surrounding application palette.

### Typography

Use the Apple-compatible system stack already available to the browser: `-apple-system`, `BlinkMacSystemFont`, `SF Pro Display`, `SF Pro Text`, and appropriate fallbacks. Large titles use tight tracking and strong weight. Body copy remains compact and readable. Card numbers, dates, counts, and security metrics use tabular numerals.

### Shape and depth

- Application panels and grouped sections: 16–22px radii depending on scale.
- Controls: 10–14px radii with 44px minimum mobile touch height.
- Hairline borders use low-opacity neutral colors rather than visible gray outlines.
- Shadows are broad, soft, and sparse. Blur is reserved for navigation, sheets, and floating chrome.
- Gradients belong primarily to payment cards and small brand moments, not every panel.

### Signature element

The remembered element is the wallet-card stack: cards overlap like iOS Wallet passes, separate with controlled spring motion, and reveal content without visual noise. This signature is used only in the wallet area so the rest of the vault remains disciplined.

## Wallet Card and Logo Specification

- Visa and RuPay render through a single network-logo component with explicit intrinsic proportions.
- Transparent source artwork must not carry a white rectangle or be distorted by fixed width and height combinations.
- The network mark sits at the top-right of every card within a consistent optical bounding box.
- Logo size responds to the mark rather than forcing both brands to identical pixel dimensions.
- Bank or issuer identity occupies the top-left. Card type is secondary.
- Masked card number is the dominant data line; cardholder and expiry form the lower metadata row.
- Text contrast is computed by card style: light card treatments use dark text and dark treatments use white text.
- Stacking is enabled on mobile list views. Selection or expansion separates the chosen card while preserving access to nearby cards.
- Empty, loading, add, edit, scan, and deletion states use the same card geometry and sheet language.

## Application Shell

### Mobile

- Use a full-height grouped background with safe-area-aware top and bottom padding.
- The active section receives an iOS large title that collapses naturally into the content region.
- Primary content scrolls behind a translucent bottom tab bar.
- Keep the most important five destinations in the bottom bar. Secondary destinations remain accessible through the dashboard or profile/menu surfaces.
- Search and magic import open as full-width, rounded sheets with clear dismiss affordances.

### Desktop

- Retain the sidebar information architecture but restyle it as translucent macOS navigation.
- Use a slim frosted toolbar for section title, search, theme, and primary action.
- Content sits in a centered, spacious canvas with a maximum readable width.
- Lists may use denser rows than mobile while retaining the same grouped-surface and selection language.

## Surface-by-Surface Changes

- Authentication and unlock: centered secure panel, native fields, clear separation between account password and master key, consistent PIN keypad, and biometric affordance.
- Dashboard: quiet overview with vault health as the primary status, grouped recent items, and direct actions. Avoid generic metric-card grids.
- Passwords, notes, and documents: grouped lists with cleaner hierarchy, consistent expansion, swipe-like/destructive affordances expressed accessibly, and sheet-based creation/editing.
- Wallet and bank accounts: wallet stack for cards; grouped institution rows for bank accounts; shared add and scan sheets.
- Search: Spotlight-like overlay on desktop and searchable sheet on mobile.
- Profile: iOS Settings-style grouped sections for identity, security, appearance, data, and destructive actions.
- Dialogs, toasts, empty states, skeletons, and controls: adopt the shared tokens and reduced-motion behavior.

## Motion and Accessibility

- Use one restrained spring vocabulary for card selection, active navigation, and sheet entry.
- Avoid ambient or decorative animation.
- Respect `prefers-reduced-motion`; content remains usable with animation disabled.
- Maintain visible keyboard focus, logical tab order, semantic button labels, and at least 44px mobile touch targets.
- Verify light and dark contrast for text placed over card gradients and translucent materials.

## Architecture and Boundaries

- Centralize visual tokens and shared Apple-like primitives in the global stylesheet and small reusable components.
- Keep domain behavior inside the existing vault components. Do not combine tables, alter encryption formats, or rewrite Supabase data access as part of this redesign.
- Extract wallet-card presentation and network-logo mapping from `WalletVault` where needed so logo sizing and card rendering have one source of truth.
- Reuse existing Lucide icons with consistent stroke weight; do not introduce a second icon system.
- Read the relevant bundled Next.js 16 documentation before any framework-specific change.

## Error Handling and Data Integrity

- Existing Supabase and AI errors keep their current functional paths but receive specific, actionable copy where touched.
- A failed scan or import never shows a completed state and never hides partially saved results.
- Destructive actions remain confirmed and visually separated from routine controls.
- No database migration is required for this work.

## Testing and Verification

Implementation will follow test-first changes:

1. Add or update integrity checks for the shared card-network logo renderer, transparent assets, new mobile navigation class names, safe-area treatment, and reduced-motion support.
2. Run the tests and confirm the new assertions fail for the intended missing behavior.
3. Implement the smallest shared visual primitives and wallet-card correction that satisfy them.
4. Apply the system across the shell and each vault surface in controlled passes.
5. Run the full integrity suite, ESLint, TypeScript/production build, and browser-based responsive checks.
6. Visually inspect representative mobile and desktop states in both light and dark mode, with special attention to Visa and RuPay rendering.

Existing unrelated lint debt will be reported separately unless a lint error is caused or touched by this redesign.

## Scope Exclusions

- No Supabase schema or RLS changes.
- No encryption, key-storage, PIN, or biometric protocol changes.
- No authentication provider additions.
- No new vault content type.
- No replacement of Groq or Gemini integrations.
- No native iOS application or PWA installation work.
- No wholesale rewrite of existing domain components solely for aesthetics.

## Acceptance Criteria

- Visa and RuPay marks render crisply, transparently, proportionally, and consistently in every wallet-card state.
- Mobile wallet cards visually and interactively evoke iOS Wallet without copying proprietary artwork.
- Mobile and desktop read as two members of the same Apple-inspired product family.
- Authentication, dashboard, all vault sections, search/import, profile, overlays, loading, empty, and error states share the new system.
- Existing vault behavior and stored-data compatibility remain intact.
- Production build succeeds and targeted integrity checks pass.
- Responsive visual verification covers at least one phone viewport and one desktop viewport in light and dark modes.
