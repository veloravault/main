# Financial Vault and Global Import Redesign

## Goal

Redesign Bank Vault, Digital Wallet, and Global Magic Import as one coherent Apple ecosystem experience while preserving all current encryption, Supabase, duplicate-update, scanning, and import behavior.

## Product Structure

- Magic Import remains one global importer for passwords, notes, cards, and bank accounts.
- Wallet and Bank Vault may open the global importer with contextual emphasis, but no separate importer or duplicated parsing flow will be created.
- Wallet remains optimized for payment cards; Bank Vault remains optimized for financial accounts.

## Global Magic Import

Magic Import becomes a guided three-stage workspace.

### Stage 1: Paste

- Mobile uses a large bottom sheet; desktop uses a wide centered workspace.
- The header communicates that pasted content is categorized before it is saved.
- The paste area is the dominant control with concise examples and supported item types.
- Primary action is `Review Import`, not `Import`, because no data is saved in this stage.

### Stage 2: Review

- The existing global parser produces Passwords, Notes, Cards, and Bank Accounts.
- Results are grouped by type using Apple grouped sections.
- Every item shows a selected/excluded state, title, type, and the important non-secret identifying fields.
- Users may edit parsed display and payload fields before saving.
- Excluded items are not encrypted or uploaded.
- Duplicate behavior remains update-in-place according to the existing matching rules.
- The primary action states the selected item count: `Save 8 Items`.

### Stage 3: Save and Result

- Each selected item advances through pending, encrypting, saved, or failed status.
- The summary never reports blanket success when an item failed.
- Partial failures stay visible with their item label and a concise failure reason.
- Completion reports saved, updated, excluded, and failed totals separately.
- Closing after completion triggers the existing success callback only when at least one item was saved or updated.

## Digital Wallet

- Mobile presents one vertical iOS Wallet-style stack rather than separate large Credit, Debit, and Other sections.
- A compact segmented control filters All, Credit, and Debit without changing stored data.
- Each card keeps the proportional network-logo renderer and current masked data.
- Tapping a card separates it and reveals details below; tapping another card transfers focus.
- `Add Card`, scan, and Magic Import actions sit in a compact menu or toolbar instead of competing buttons.
- Desktop uses a two-column card layout with the same filter and active-card detail model.
- Selection mode retains the native selection toolbar.

## Bank Vault

- The header shows a small account count and one compact add/import action area.
- Accounts render as Apple grouped institution rows, not large payment-style cards.
- Each row includes a bank icon well, account title, account type, masked account suffix, routing/IFSC metadata, and a chevron.
- Selecting a row reveals account holder, full copyable fields, PIN/details where present, and delete controls within the same group.
- Multiple accounts from the same institution remain individual rows because they may have different account numbers or types.
- Empty and loading states use the same grouped geometry.

## Shared Visual System

- Use existing Apple typography, material, pressed-state, bottom-sheet, grouped-list, selection-toolbar, and reduced-motion primitives.
- Wallet gradients remain the expressive visual signature.
- Bank Vault and Magic Import use neutral elevated surfaces with tinted icon wells.
- Remove redundant section dividers, strong shadows, oversized titles, and nested floating cards.

## Data Flow and Boundaries

- `parseGlobalBulkData` remains the single parser.
- Introduce local review-state types derived from its `GlobalImportResult` output.
- Editing review state changes only the payload passed into the existing encryption/save loop.
- Do not change Supabase tables, SQL, RLS, API routes, crypto functions, cache keys, or persisted encrypted payload shapes.
- Keep the existing `onSuccess` contract for the global importer.

## Error Handling

- Parser failure returns the user to the Paste stage with the pasted text preserved.
- Per-item encryption or Supabase failure marks only that item failed and continues safe remaining items.
- The sheet cannot be dismissed during an active parse or save operation.
- Empty or fully excluded reviews cannot be saved.
- Scan failure remains inside the Wallet or Bank add flow and never creates a blank item.

## Testing and Verification

- Add failing integrity checks for the Paste/Review/Save phases, review state, exclusion, editable items, truthful result totals, and contextual open support.
- Add checks for Wallet segmented filtering and a single unified stack.
- Add checks for Bank grouped institution rows and expanded inline details.
- Confirm tests fail before implementation and pass afterward.
- Run the full integrity suite, production build/TypeScript, lint-baseline comparison, and `git diff --check`.
- Perform mobile and desktop browser QA without entering or transmitting user credentials.

## Acceptance Criteria

- Magic Import visibly follows Paste, Review, and Save stages.
- Users can edit or exclude parsed items before anything is saved.
- Partial failures are reported per item and are never presented as full success.
- Wallet has one filterable mobile stack with active-card separation.
- Bank Vault uses compact grouped account rows with inline detail expansion.
- All three surfaces share the existing Apple ecosystem visual language.
- Existing stored data, security behavior, duplicate handling, and API contracts remain compatible.
- Integrity tests and production build pass with no new lint issues.
