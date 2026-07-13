# Vault Settings, Import, Navigation, and System UI Design

**Date:** 2026-07-13
**Status:** Approved for implementation planning
**Scope:** Profile/Settings, mobile navigation, Magic Import, and non-Wallet system UI foundations

## 1. Goal

Turn the remaining Telkar Vault experience into a coherent Apple-like product system across mobile and desktop. The work replaces the current Profile card collection with a real Settings experience, completes mobile access to secondary areas, rebuilds Magic Import as an editable multi-source workflow, and establishes shared interaction and state patterns for Passwords, Documents, Notes, and Bank Accounts.

The finished Wallet experience is protected. This project must not redesign or behaviorally change Wallet screens, cards, details, stacking, responsiveness, motion, dialogs, or deletion.

## 2. Product Principles

- Use Apple-like information architecture, restraint, spacing, and interaction behavior rather than decorative imitation.
- Keep sensitive behavior truthful. Do not display invented device histories, pretend offline writes succeeded, or claim that backups are restorable without the existing master key.
- Keep the account password and master key conceptually separate.
- Preserve the existing master-key encryption model exactly. This project does not change, reset, rotate, migrate, or recover the master key.
- Use progressive disclosure on mobile and persistent context on desktop.
- Every mutation must have an explicit loading, success, failure, disabled, and offline state.
- Shared foundations are opt-in and must not alter Wallet through global selector leakage.

## 3. Delivery Architecture

The work is implemented in four coordinated layers:

1. **System primitives:** adaptive sheets, settings rows, state views, action toasts, motion tokens, clipboard policy, connectivity state, and master-detail layout.
2. **Settings:** responsive Settings navigation, security preferences, appearance, encrypted backup export, session controls, lock action, and danger actions.
3. **Mobile navigation:** a complete header action sheet for destinations and account-level controls that do not fit in the five-tab bar.
4. **Magic Import:** source selection, extraction, editable review, duplicate detection, encrypted save progress, local history, and time-limited Undo.

The primitives must be introduced through explicit component classes or props. Existing Wallet-specific classes and components are not migrated.

## 4. Settings Redesign

### 4.1 Desktop layout

Settings uses a secondary two-column layout inside the existing app content area:

```text
┌ Settings navigation ─────┬ Setting detail ─────────────────────┐
│ Account                  │ Selected section title              │
│ Security                 │ Grouped controls and explanations   │
│ Appearance               │                                     │
│ Data & Backup            │                                     │
│ Danger Zone              │                                     │
└──────────────────────────┴─────────────────────────────────────┘
```

- The secondary navigation remains visible at desktop widths.
- Selecting a section updates only the detail pane.
- The detail pane has a readable maximum width rather than stretching fields across the screen.
- Section changes use a restrained cross-fade; they do not slide horizontally on desktop.

### 4.2 Mobile layout

- The root Settings screen is an iOS-style grouped list.
- Selecting Account, Security, Appearance, or Data & Backup opens a focused drill-in view.
- Drill-in views use a clear Back control and retain their scroll position during the current session.
- Destructive confirmations open as adaptive bottom sheets.
- Mobile rows and controls have a minimum 44px target.

### 4.3 Account

- Display and edit avatar and full name.
- Display email as read-only.
- Saving provides inline progress and a non-blocking success state.
- Upload errors render inside the Account detail instead of using `alert()`.

### 4.4 Security

#### Auto-lock

- Options: Immediately, 1 minute, 5 minutes, 15 minutes, and 30 minutes.
- Default for users without an existing preference: 5 minutes.
- The preference is device-local because it controls the local decrypted session.
- Activity includes pointer, keyboard, touch, visibility, and focus events, throttled so the timer is not continuously recreated.
- When the timer expires, clear the in-memory master password, `sessionStorage` master key, derived-key cache, and decrypted vault caches.
- Auto-lock retains the Supabase account session and returns to the existing PIN/biometric/master-key unlock flow.

#### Face ID / Touch ID

- Show Supported/Unavailable and Enabled/Disabled states.
- Enabling uses the existing WebAuthn-based biometric enrollment.
- Disabling removes the local biometric credential references and encrypted local master-key wrapper.
- Errors distinguish unsupported browser, insecure context, cancellation, and failed enrollment.

#### Clipboard clearing

- Options: Never, 15 seconds, 30 seconds, and 60 seconds.
- Default: 30 seconds.
- The policy applies to copy operations in Passwords, Notes, and Bank Accounts introduced through the shared clipboard helper.
- The helper clears the clipboard only if it still contains the value written by the app. It must not erase newer clipboard content created by the user.
- Wallet copy behavior is not modified in this project.

#### Sessions

- Display the current browser/device using locally available user-agent information, sign-in timestamp when available, and a Current badge.
- Provide “Sign out other devices.”
- Use `supabase.auth.signOut({ scope: "others" })` so the current session remains signed in.
- Do not display a list of other devices because Supabase's normal client API does not expose a trustworthy device-by-device session inventory.
- Explain that revoked access tokens can remain valid until token expiry, while refresh tokens for the affected sessions are revoked.

#### Lock Vault

- Locking clears decrypted session material and caches but does not sign out of Supabase.
- Lock Vault is available in Settings and the mobile header action sheet.
- After locking, the existing PIN/biometric/master-key unlock route is shown.

#### Explicit exclusion

- Do not add account-password change.
- Do not add master-key change, reset, rotation, recovery, or re-encryption.

### 4.5 Appearance

- Present System, Light, and Dark as a segmented control on desktop and selectable rows on mobile.
- System follows the operating-system preference through the existing theme provider.
- A compact preview demonstrates page, grouped surface, text, separator, and accent colors.
- Appearance changes apply immediately and persist through `next-themes`.

### 4.6 Data & Backup

- Export a versioned `.telkarvault` JSON backup generated entirely in the browser.
- The backup contains ciphertext, IVs, salts, non-secret metadata required for reconstruction, and every encrypted document blob referenced by the user's document records.
- Document blobs are downloaded in their already-encrypted form from the existing `vault_documents` bucket and encoded into the export without local decryption.
- If any referenced encrypted document blob cannot be retrieved, the export stops and identifies the affected document instead of producing a silently incomplete backup.
- The backup contains a manifest with format version, export time, source app version, table counts, and a SHA-256 integrity digest.
- Plaintext passwords, notes, account numbers, PINs, document contents, the master key, PIN wrapper, and biometric wrapper must never be written into the export.
- The UI explicitly states that the existing master key is required to read the encrypted data.
- This phase provides secure export only. Restore/import of `.telkarvault` backups is deferred until a separately reviewed recovery design exists.

### 4.7 Danger Zone

- Keep Clear Vault Data and Delete Account distinct.
- Require typed `DELETE` confirmation.
- When biometric or PIN unlock is enabled, require a fresh local verification before performing the destructive operation.
- Confirmation, progress, failure, and completion remain inside the sheet instead of using browser alerts.
- Destructive color is reserved for the final action and its immediate warning, not the entire page.

## 5. Mobile Navigation Completion

### 5.1 Bottom bar

- Preserve the existing five-tab mobile bottom bar exactly, including Wallet.
- Do not add a sixth tab or replace an existing tab.

### 5.2 Header overflow action sheet

The mobile header overflow opens an adaptive action sheet with:

1. Bank Accounts
2. Profile & Settings
3. Magic Import
4. Appearance
5. Lock Vault

- Destination rows show icon, label, and optional supporting text.
- Appearance shows the active mode and opens a compact nested choice sheet.
- Lock Vault is separated visually from navigation actions.
- The sheet closes before navigation or another sheet opens.
- Desktop retains its current sidebar and header controls.

## 6. Magic Import Redesign

### 6.1 Workflow

```text
Choose source -> Analyze -> Review and edit -> Save -> Results / Undo
```

The workflow uses an explicit state machine. Users cannot skip required states, start concurrent saves, or close during a destructive save transition without confirmation.

### 6.2 Sources

- Paste text.
- Upload generic CSV.
- Upload browser password-export CSV.
- Upload screenshot or image.
- Desktop drag-and-drop maps to the correct source type.
- Mobile image input supports photo library and camera capture when the browser permits it.

CSV parsing happens locally. Image and free-form text extraction use the existing server-side AI routes/actions, extended with typed response validation.

### 6.3 Normalized draft model

Every detected item becomes an `ImportDraft` with:

- Temporary client ID.
- Item type: password, note, bank account, or card.
- Editable title.
- Editable type-specific fields.
- Included state.
- Source reference.
- Per-field confidence: high, medium, or low.
- Validation issues.
- Duplicate state and possible matching item ID.

Confidence is displayed only for medium or low confidence. High-confidence fields remain visually quiet.

### 6.4 Review experience

#### Desktop

- Centered adaptive dialog.
- Draft list on the left and selected-item editor on the right.
- Summary header shows selected, duplicate, incomplete, and total counts.

#### Mobile

- Stepped bottom sheet with fixed header, scrollable body, and fixed action area.
- Drafts appear as expandable cards.
- Selecting Edit opens a nested full-height editor sheet instead of compressing fields into the list.

#### Review capabilities

- Include/exclude individual drafts.
- Include/exclude an entire category.
- Edit every field before saving.
- Reveal/hide secure fields.
- Highlight missing required fields.
- Show possible duplicates and allow Skip, Keep Both, or Replace Existing.
- Prevent saving included drafts with unresolved required-field errors.

### 6.5 Duplicate detection

- Compare normalized titles plus type-specific identifying values available from currently decrypted/cached vault items.
- Passwords compare normalized title/domain/username combinations.
- Notes compare normalized title.
- Bank accounts compare normalized title and masked account suffix when available.
- Cards may be parsed and reviewed by the global importer, but this project must not change Wallet UI or Wallet item presentation.
- Duplicate detection is advisory until the user chooses Skip, Keep Both, or Replace Existing.

### 6.6 Saving

- Encrypt each included draft with the existing master key before upload.
- Save sequentially or with low bounded concurrency so progress and partial failure are deterministic.
- Display current item, completed count, total count, and failure count.
- Each result records target table, inserted or updated ID, operation type, and pre-update encrypted snapshot when Replace Existing is used.
- A failed item does not roll back successful unrelated items; the result screen explains partial completion and supports retrying failures.

### 6.7 Import history and Undo

- Store local import history on the current device only.
- History records import ID, time, source type, counts, target table/record IDs, operation types, and encrypted pre-update snapshots required for Undo.
- Never store parsed plaintext fields in history.
- Retain the ten most recent import summaries; purge detailed Undo data after its deadline.
- Undo is available for ten minutes after a successful or partially successful import.
- Undo deletes records inserted by that import and restores encrypted snapshots for replaced records.
- Undo operates only on records whose current ownership matches the authenticated user under existing RLS.
- Expired history remains as a non-actionable summary.

### 6.8 Import errors

- Unsupported file: identify accepted formats.
- Invalid CSV: identify the first unusable header or row.
- Extraction failure: preserve the uploaded source so Retry does not require choosing it again.
- Offline: disable analysis/save and explain that connection is required.
- Partial save: keep failed drafts editable and retryable.
- Close during analysis: cancel when possible and return to source selection.
- Close during save: require explicit confirmation that completed items will remain saved.

## 7. System-wide UI Foundation

### 7.1 Adaptive sheets

- Introduce an opt-in adaptive-sheet component for non-Wallet forms, menus, and confirmations.
- Desktop: centered dialog with constrained height and internal scroll regions.
- Mobile: bottom-aligned sheet with safe-area padding, drag indicator, fixed header, scroll body, and fixed footer.
- Nested sheets preserve the parent state and restore focus on close.
- Wallet-specific dialog and sheet components/classes remain unchanged.

### 7.2 Master-detail

- Provide an opt-in shared desktop master-detail layout for Passwords, Documents, Notes, and Bank Accounts.
- Desktop keeps the list visible while a selected item appears in a detail pane.
- Mobile retains list-to-sheet navigation.
- Empty selection uses a quiet instructional placeholder rather than a blank panel.
- Do not migrate Wallet to this primitive.

### 7.3 State views

Create consistent components for:

- Empty states with one primary action.
- Loading skeletons matching final geometry.
- Recoverable errors with Retry.
- Permission/unsupported states with a next step.
- Offline state with readable cached content and disabled mutations.

The UI must not report a successful mutation while offline. Existing loaded content remains readable; server mutations are disabled with an explanation until reconnection.

### 7.4 Context actions

- Desktop list items expose right-click context menus.
- Mobile list items expose the same actions through long press.
- Keyboard users can open context actions through an explicit More button.
- Actions and order remain identical across all three entry points.
- Long press uses pointer events, cancels when the pointer moves beyond a small threshold, and does not block normal scrolling.

### 7.5 Motion

- Define shared durations/easing for fast feedback, standard transitions, and spring presentation.
- Use springs only for navigation, sheet presentation, and selection movement.
- Use simple fades for loading and content replacement.
- Avoid staggered animation on long lists.
- `prefers-reduced-motion` removes translation, scaling, stagger, and spring motion while preserving state changes.

### 7.6 Interaction states

- Every interactive control defines default, hover, pressed, focus-visible, disabled, and loading states.
- Mobile controls maintain 44px minimum targets.
- Focus outlines remain visible even on controls with local `outline-none` utilities.
- Disabled controls explain why when the reason is not obvious.

### 7.7 Optimistic deletion and Undo

- Apply to Passwords, Notes, Documents, and Bank Accounts only.
- Remove the item from the UI immediately and show a six-second Undo toast.
- Delay the actual Supabase/storage deletion until the Undo window expires.
- Undo restores the item to its previous list position without reconstructing encrypted data.
- If the page closes before the delayed deletion executes, the server record remains; this favors preventing accidental data loss.
- Wallet deletion is unchanged.

### 7.8 Toast system

- Extend toasts with optional action label/callback, progress deadline, persistent error mode, and accessible live-region behavior.
- Position as a compact top banner on mobile and top-right notification on desktop.
- Action labels use explicit verbs such as Undo or Retry.
- Toast motion respects reduced motion.

### 7.9 Connectivity

- Provide a shared connectivity hook based on browser online/offline events plus failed-request handling.
- Show a compact offline banner once, not one warning per component.
- On reconnection, dismiss the banner and refresh stale active data.
- Do not claim durable offline editing or background synchronization in this phase.

### 7.10 Dark mode materials

- Replace large pure-black regions outside Wallet with layered charcoal surfaces.
- Page, grouped surface, elevated dialog, and pressed control each receive distinct but restrained material values.
- Use quieter separators and rely on layer contrast rather than heavy borders.
- Destructive red is limited to destructive text, icons, confirmation controls, and immediate warning surfaces.

## 8. Data and Security Boundaries

- Existing AES-GCM/PBKDF2 record encryption remains unchanged.
- The master key stays only in the existing runtime/session mechanisms; it is never persisted into profile metadata, import history, or backup files.
- Supabase `user_metadata` is presentation-only and is not used for authorization.
- Any new exposed database table would require RLS with authenticated ownership predicates, but this design intentionally keeps import history device-local and adds no import-history table.
- Session revocation uses supported Supabase Auth scopes.
- Backups contain only already-encrypted user data plus non-secret manifest metadata.
- Sensitive logging is prohibited. Errors may identify record type and operation but not plaintext fields.

## 9. Error Handling

- Replace browser `alert()` usage in touched Settings and Magic Import flows with inline errors or actionable toasts.
- Preserve user input after recoverable errors.
- Destructive actions remain disabled while pending.
- All asynchronous flows use cancellation or stale-result guards where the user can close/navigate during work.
- Partial failures state exactly what completed, what failed, and what the user can retry.

## 10. Accessibility

- Use semantic dialog titles/descriptions and restore focus to the opener.
- Settings navigation exposes the active section.
- Segmented appearance and timing controls are keyboard operable and announce selection.
- Context actions remain available without right-click or long press.
- Confidence and validation states use text/icons in addition to color.
- Progress announces meaningful milestones without flooding live regions.
- All motion has a reduced-motion alternative.

## 11. Verification Strategy

### Static and build verification

- Production build and TypeScript must pass.
- Existing project-integrity checks remain green.
- Do not add new automated test files in this phase.
- Use static source audits for preference options, auto-lock cleanup calls, clipboard conditional clearing, import state transitions, Undo metadata, backup manifest fields, and Wallet-exclusion selectors.

### Browser verification

Verify at minimum:

- Mobile 320px, 375px, 390px, and 430px widths.
- Tablet 768px and 1024px widths.
- Desktop 1280px and 1440px widths.
- Light, Dark, and System appearance.
- Reduced motion.
- Keyboard-only desktop navigation.
- Offline/reconnection states.
- Settings drill-in/back navigation.
- Auto-lock and unlock return path.
- Sign out other devices action response.
- Magic Import for paste, CSV, browser CSV, and image.
- Duplicate choices, partial failure, retry, and Undo.
- No visual or behavioral regression in Wallet.

## 12. Explicit Non-goals

- No Wallet redesign or Wallet behavior change.
- No master-key change, reset, recovery, rotation, or migration.
- No account-password change.
- No fabricated trusted-device list.
- No `.telkarvault` restore flow in this phase.
- No durable offline editing or background synchronization.
- No server-side import-history schema.
- No browser extension or native mobile application.

## 13. Acceptance Criteria

- Profile is replaced by responsive Settings with Account, Security, Appearance, Data & Backup, and Danger Zone.
- Auto-lock, biometric control, clipboard timing, current session, sign-out-others, encrypted export, appearance selection, and Lock Vault are functional rather than decorative.
- Mobile overflow provides Bank Accounts, Profile & Settings, Magic Import, Appearance, and Lock Vault without changing the five-tab bar.
- Magic Import supports paste, CSV, browser-export CSV, and image sources; each draft is editable and individually selectable.
- Duplicate handling, field validation, confidence display, partial-failure retry, local history, and ten-minute Undo work as specified.
- Non-Wallet dialogs use the adaptive pattern; non-Wallet modules share state, context-action, motion, toast, and interaction contracts.
- Reduced motion, keyboard access, offline truthfulness, and dark material layering are consistent.
- Wallet files and Wallet-specific behavior remain unchanged, and browser verification finds no Wallet regression.
