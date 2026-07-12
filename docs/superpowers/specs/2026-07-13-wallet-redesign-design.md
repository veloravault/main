# Digital Wallet Redesign

## Objective

Rebuild the Digital Wallet page as a coherent Apple Wallet-inspired experience across mobile and desktop while preserving the existing encrypted wallet data, card creation, scanning, copying, deleting, filtering, and bulk-selection behavior.

## Design Direction

The wallet will use a quiet system palette around a visually rich payment-card deck. Existing card-network colors and marks remain the signature visual element; surrounding controls use restrained iOS materials, compact typography, subtle separators, and spring motion.

The current mixture of inline expansion, desktop inspector state, disclosure rows, and breakpoint-specific stacking rules will be removed. One selected-card state will drive every presentation.

## Responsive Structure

### Mobile

- A compact header row contains the card count, overflow actions, and Add Card action.
- A segmented control filters All, Credit, and Debit cards.
- Cards appear as a compact wallet deck. Unselected cards expose a readable title and network mark; the selected card is visually promoted without exposing secure data inline.
- Tapping a card selects it and opens a bottom sheet.
- The bottom sheet contains card metadata, copy actions, concealed secure fields, reveal controls, and the destructive action.
- The bottom tab bar and safe areas remain unobstructed.

### Desktop

- The page uses a bounded two-column workspace centered in the available content area.
- The left column contains the toolbar, filter, and card gallery/deck.
- The right column contains a sticky inspector for the selected card.
- Selecting a card updates the inspector without expanding the card inside the list.
- The selected card receives a subtle system-blue focus treatment.

## Components

### WalletVault

Owns data fetching, encryption/decryption integration, filtering, selection, dialogs, scanning, add/delete actions, and bulk-selection state. It derives the selected card from `selectedCardId` and ensures the selection remains valid when filtering or deleting.

### PaymentCard

Renders one visual payment card. It receives display data, selected/selection states, and event callbacks. It does not render secure-detail controls or responsive detail layouts.

### WalletCardDetails

A new focused component renders the shared card-detail content. The same component is placed in the mobile bottom sheet and desktop inspector. It owns local reveal/conceal UI for PIN, UPI PIN, CVV, and extra details, while copy and delete operations remain callback-driven.

## Interaction Model

- Tapping or pressing Enter/Space on a card selects it.
- On mobile, selection also opens the details sheet.
- On desktop, selection updates the inspector.
- Escape and the backdrop close the mobile sheet without clearing desktop selection.
- Filtering automatically selects the first visible card when the current selection is excluded.
- Deleting the selected card selects the next visible card when possible.
- Secure values are concealed by default every time a different card is selected.
- Bulk-selection mode replaces normal card selection behavior and keeps its existing toolbar.

## Visual System

- Background: iOS grouped surface using existing light/dark theme tokens.
- Cards: network-aware gradients, 1.586:1 ratio, controlled highlights, 24–28px radii, and restrained depth.
- Controls: 44px minimum touch targets, system-blue actions, capsule segmented control, and thin separators.
- Type: existing Geist system stack, with compact uppercase metadata and tabular monospaced card data.
- Motion: one spring curve for selection, sheet entry, and deck reflow; reduced-motion preferences remain respected.

## Empty, Loading, and Failure States

- Existing skeleton and empty-state components remain.
- Empty filters show a concise message and a reset-filter action.
- Failed scans and database actions keep their existing error behavior unless directly touched by the rebuild.
- Missing optional card fields render neutral placeholders rather than empty gaps.

## Accessibility

- Cards remain keyboard selectable with clear focus-visible styling.
- The selected state is exposed with `aria-current`.
- The mobile details surface uses dialog semantics and a labelled close control.
- Reveal, copy, and delete controls receive explicit accessible labels.
- Destructive actions remain visually and semantically distinct.

## Verification

- Do not add new automated test cases, following the user's stated preference.
- Run the production Next.js build to verify compilation and types.
- Visually inspect desktop and 400px mobile layouts when the requested Chrome integration is available.
- Verify selecting, filtering, opening/closing details, copying, adding, and deleting through the browser.

## Out of Scope

- Database schema changes.
- Changes to encryption or authentication.
- New card providers or financial integrations.
- Changes to Bank Accounts, Passwords, Documents, or Notes pages.
