# Native Apple UI Second-Pass Design

## Goal

Move Velora Vault from Apple-inspired styling to a more structurally authentic Apple ecosystem experience across mobile and desktop. Preserve all authentication, encryption, storage, import, search, and database behavior.

## Approved Direction

The user approved all ten recommendations from the visual review. This pass will implement them as one coordinated interface refinement rather than unrelated cosmetic edits.

## Navigation and Titles

- Mobile uses one large title per destination. The compact toolbar shows only global actions while the large title is visible.
- As content scrolls, the large title may yield to a compact section title; the interface must never show the same title twice simultaneously.
- The five-item mobile tab bar remains the primary navigation. Bank Accounts and Profile remain accessible through dashboard, search, and avatar entry points.

## Grouped Vault Lists

- Passwords, documents, notes, and bank accounts render as iOS grouped lists instead of collections of unrelated cards.
- Each group is one elevated surface. Rows use tinted icon wells, a primary label, optional secondary text, trailing metadata or chevron, and hairline separators.
- Only the group container has external rounded corners. Individual rows do not look like separate floating cards.
- Selection, focused-item expansion, empty states, and loading states preserve the same geometry.

## Mobile Sheets and Desktop Dialogs

- Create, edit, upload, scan, import, and search flows use bottom sheets below the desktop breakpoint.
- Mobile sheets include a grabber, safe-area padding, sticky title/action regions where needed, and no floating modal gap at the viewport bottom.
- Desktop retains centered dialogs with the same content and actions.
- Sheet dismissal must preserve current validation and working-state protections.

## Wallet Stack

- Payment cards overlap vertically on mobile to evoke iOS Wallet.
- Each later card exposes enough of its header to identify it and remains keyboard/touch accessible.
- Selecting a card separates it from the stack and reveals its details below.
- Desktop uses a calm two-column grid rather than overlapping cards.
- The existing proportional Visa, RuPay, Mastercard, and fallback logo renderer remains the only network-logo source.

## Visual Restraint

- Remove redundant borders, strong shadows, and gradients from non-wallet surfaces.
- Use spacing, background levels, and separators to establish hierarchy.
- Keep gradients on payment cards and small icon wells only.
- Toasts, dialogs, selection bars, and floating controls use one material recipe.

## Typography

Use a single system scale:

- 34px large title
- 22px section title
- 17px row title
- 15px supporting copy
- 13px metadata
- 11px uppercase section label

Large titles use Apple-compatible system display fonts. Body copy uses the system text stack. Card numbers, dates, PIN placeholders, counts, and security data use tabular numerals.

## Profile

- Profile becomes an iOS Settings-like screen.
- Identity is a compact header group.
- Account, Security, Appearance, Data, and Danger Zone are separate labeled groups.
- Rows use an icon, label, current value, and an appropriate chevron, switch, or action.
- Destructive controls remain visually separated and require the current confirmations.

## Selection Mode

- Mobile selection mode replaces the normal toolbar controls with Cancel, selected count, and Delete.
- Desktop may keep bulk actions near the list header.
- Selection UI must not overlap the bottom navigation or safe areas.

## Motion and Tactile States

- Use one spring family for sheets, wallet-card separation, and active navigation.
- Pressed states use subtle opacity/background changes and restrained scale only where spatial feedback is helpful.
- Disabled, loading, selected, hover, keyboard-focus, and active states are explicit and consistent.
- Use `navigator.vibrate(10)` only when supported and only for local selection confirmation; no interaction depends on haptics.
- Respect `prefers-reduced-motion` and preserve complete functionality without animation.

## Architecture

- Add focused shared presentation components where duplication is currently high: grouped list primitives, responsive sheet framing, and selection toolbar.
- Keep existing vault components responsible for domain state and Supabase/encryption calls.
- Extend `PaymentCard` and `WalletVault` for stacking rather than reintroducing inline card markup.
- Consolidate typography, material, pressed-state, sheet, list, and motion tokens in `globals.css`.
- Do not change SQL, API routes, cryptography, biometrics, PIN storage, cache keys, or persisted payload formats.

## Testing and Verification

- Add failing integrity checks for single mobile titles, grouped-list adoption, responsive sheets, wallet-stack classes, Settings-style profile groups, selection toolbar, typography tokens, haptic feature detection, and reduced-motion coverage.
- Confirm each new assertion fails before production changes and passes afterward.
- Run all integrity tests, production build/TypeScript, lint regression comparison, and `git diff --check`.
- Perform browser QA at 390x844 and 1440x900 in light and dark modes.
- Authenticated-only visual states will be verified without entering, transmitting, or storing user credentials. If an authenticated session is unavailable, use structural tests and existing local state only; do not fabricate or request secrets solely for QA.

## Acceptance Criteria

- No duplicate section title appears on mobile.
- Vault content reads as grouped iOS lists rather than independent web cards.
- Mobile workflows open as bottom sheets; desktop workflows remain centered dialogs.
- Mobile Wallet cards visibly overlap and separate when selected; desktop cards remain a grid.
- Profile follows iOS Settings information architecture.
- Mobile selection mode uses a native-style toolbar.
- Typography, separators, motion, pressed states, and material depth are consistent across the entire product.
- Existing vault behavior and stored-data compatibility remain intact.
- Integrity tests and production build pass; no new lint errors are introduced.
