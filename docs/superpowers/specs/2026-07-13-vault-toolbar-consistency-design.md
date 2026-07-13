# Vault Toolbar Consistency Design

## Objective

Standardize the section toolbars used by Passwords, Documents, Notes, Wallet, and Bank Accounts so primary creation actions always appear at the far right on mobile and desktop.

## Layout Contract

- Every section toolbar uses a shared `vault-section-toolbar` class.
- A persistent left slot uses `vault-section-heading`; it contains the desktop title and optional selection count.
- Desktop titles remain hidden below 768px because the global header already displays the active section.
- The actions container uses `vault-section-actions` and always receives `margin-left: auto`.
- Secondary overflow actions appear first.
- The primary New/Add/Upload action appears last and therefore occupies the far-right position.
- Toolbars retain current vertical spacing and 44px-or-larger mobile touch targets.

## Component Scope

- `PasswordVault.tsx`: wrap the title in the shared heading slot and apply shared action classes.
- `DocumentVault.tsx`: replace local toolbar classes with shared classes.
- `NotesVault.tsx`: replace local toolbar classes with shared classes.
- `BankVault.tsx`: wrap the title in the shared heading slot and apply shared action classes.
- `WalletVault.tsx`: retain its redesigned Wallet header while applying the same action-order/right-alignment contract.
- `globals.css`: define the shared layout classes without altering form or data behavior.

## Visual Rules

- Overflow button: neutral circular control.
- Primary button: system-blue action, compact capsule, consistent height and typography.
- Mobile labels may shorten to `New`, `Upload`, or `Add` when space is constrained, but placement remains identical.
- Selection counts remain in the left heading slot and never push primary actions off-screen.

## Verification

- Do not add automated tests.
- Run the production Next.js build.
- Verify action order and right alignment at 400px, 768px, 1024px, and 1440px.
- Confirm empty sections still right-align their primary action when no overflow menu is rendered.
