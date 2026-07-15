# Auth UI Restoration Design

## Goal

Restore the calm, compact Apple-style authentication presentation that existed in the July 13 pre-invite build while preserving the current invite-only access model, Supabase authorization boundaries, and local-only master-key architecture.

This is a presentation transplant, not an authentication rollback.

## Historical Reference

The visual baseline is `src/components/Auth.tsx` at commit `760fef0`, the final snapshot before the invite-only work began. The useful characteristics are:

- a centered, narrow authentication stage;
- an animated title and segmented mode control;
- vertically grouped fields inside one rounded surface;
- a compact circular arrow submission control;
- a small theme control in the upper-right corner;
- restrained spring entrance and mode-change motion;
- full-height layouts that work on desktop and mobile.

Historical authentication behavior from that component must not be restored.

## Current Security and Product Constraints

- Public self-registration remains disabled.
- The second segment is **Request Access**, not unrestricted account creation.
- Request Access collects only name and email.
- Sign-in password and vault master key remain separate secrets.
- The sign-in screen must never request the master key.
- The master key is entered only after the authenticated user reaches the private vault unlock experience.
- The master key remains local and in memory; it must not be sent to Supabase, API routes, logs, analytics, or storage.
- Existing invitation validation, onboarding, membership checks, RLS, reset-password behavior, and safe redirect validation remain unchanged.

## Experience Design

### Shared Auth Shell

Create a reusable presentation shell for sign-in, access request, invitation acceptance, onboarding, and password reset. It supplies the historical centered composition, theme control, product mark, responsive safe-area spacing, and reduced-motion handling. It must not own authentication state or submit data.

### Sign In

The default segment is **Sign In**. The page uses the current `SignInForm` behavior with the historical grouped-field styling:

- email;
- sign-in password;
- inline validation/status feedback;
- compact arrow submit action;
- reset-password action.

Copy clearly explains that the vault master key is requested separately after account access is verified.

### Request Access

The second segment is **Request Access**. Switching modes keeps the user inside the same auth composition and animates only the changing heading and form content. It reuses the current request-access validation and API contract and collects:

- name;
- email.

Submission success uses the historical compact confirmation treatment. No password or master-key field appears in this mode.

Direct navigation to `/request-access` renders the same Request Access mode, so links and bookmarks remain valid.

### Invite Acceptance, Onboarding, and Password Reset

These routes retain their current behavior and copy, but adopt the shared shell and field treatment so the complete authentication journey feels intentional. Onboarding must continue to distinguish the new sign-in password from the existing vault master key.

### Private Vault Unlock

The current secure `Auth` unlock component keeps its user-bound master-key, PIN, and biometric logic. Its appearance may be aligned with the shared shell only where this does not change flow or data handling.

## Responsive and Motion Rules

- The stage uses `min-height: 100dvh` with safe-area padding.
- The form remains readable and fully usable at 320 CSS pixels wide.
- Touch targets are at least 44 CSS pixels.
- Desktop width stays deliberately narrow rather than becoming a large marketing card.
- Segmented-control selection and content changes use restrained spring motion.
- Error and success messages animate without shifting controls unexpectedly.
- `prefers-reduced-motion: reduce` removes spring transforms and keeps only immediate state changes.
- Light and dark themes retain sufficient contrast and material separation.

## Architecture

Presentation is shared; behavior remains route-specific.

- `AuthShell`: layout, theme control, branding, title region, motion boundary.
- `AuthModeSwitcher`: accessible Sign In / Request Access segmented control.
- `SignInForm`: existing Supabase sign-in and reset behavior.
- `RequestAccessForm`: existing request validation, anti-abuse fields, and API call.
- Onboarding/reset/accept-invite pages: existing route logic wrapped in the shared presentation.

The shared components accept content and state through props and do not import privileged server utilities.

## Error Handling and Accessibility

- Preserve server-provided access-request and authentication errors.
- Use `role="alert"` for failures and `role="status"` for non-destructive success messages.
- Associate every label with its input.
- Keep keyboard navigation and visible focus states on the segment control, fields, submit control, theme control, and secondary actions.
- Do not expose whether an unapproved email is registered beyond the current server behavior.

## Verification

- Add or update structural tests to lock in the UI-only separation between account sign-in and master-key unlock.
- Verify sign-in and password-reset paths against the current Supabase client calls.
- Verify request-access submission still sends only the approved request fields.
- Verify invite acceptance and onboarding routes retain their redirects and membership checks.
- Run lint, type checking, project integrity tests, and production build.
- Perform logged-out visual checks at representative desktop and mobile widths in light and dark themes.
- Perform a logged-in check that the master-key unlock still appears only after account authentication.

## Non-Goals

- No change to Supabase schema, RLS, invitation APIs, approval workflow, or membership lifecycle.
- No return of public `signUp` behavior.
- No combining sign-in password and master key into one submit action.
- No rebrand as part of this work.
- No changes to vault data, wallet UI, or private vault feature layouts.
