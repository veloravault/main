# Onboarding Flow — Design

**Date:** 2026-07-17
**Status:** Approved (design), pending implementation plan

## Goal

Turn the current two-step onboarding (pick avatar → set master key) into a
polished, guided welcome experience: two branded intro screens that tell
Velora Vault's story, flowing into the existing avatar and master-key steps,
ending in a success state — all animated properly with framer-motion and
built to production standard, reusing the existing style system.

This is a **welcome/personality flow**, not a data questionnaire. The intro
screens collect no data and are fully skippable. All security-critical
behavior (server gate, master-key handling, activation, plan-intent redirect)
is preserved exactly.

## Scope

**In scope**
- New staged, animated onboarding UI wrapping the existing steps.
- Two intro screens: "What lives in your vault" and "Zero-knowledge security".
- Progress indicator, directional transitions, Back/Skip, completion state.
- Reduced-motion support.

**Out of scope**
- Any new data collection or new persisted fields.
- Changes to `/api/onboarding/complete`, the server-side gate, avatar model,
  or the plan-intent redirect logic.
- Changes to `AuthShell` (login/signup surfaces stay untouched).
- Family-sharing / warm-welcome screens (considered, deliberately excluded).

## Flow

Ordered steps, single source of truth:

```
["vault", "security", "avatar", "master-key", "done"]
```

1. **vault** — "What lives in your vault." Passwords + documents in one
   encrypted place. Intro/presentational. Controls: Continue, Skip setup intro.
2. **security** — "Zero-knowledge security." Only you can open your vault; the
   master key is never sent, stored, or recoverable. Sets up the master-key
   step. Intro/presentational. Controls: Continue, Back, Skip setup intro.
3. **avatar** — Existing avatar picker (male/female preset or skip → initials).
   Controls: Continue, Back, Skip — use my initials.
4. **master-key** — Existing master-key + confirmation with strength meter.
   Controls: Set master key (submit), Back.
5. **done** — Brief success state, then redirect.

"Skip setup intro" from an intro step jumps directly to **avatar**.

## Architecture (Approach A)

Dedicated onboarding component owns the staged experience; `AuthShell` is not
involved (it stays dedicated to login/signup). This matches the codebase's
file-per-responsibility structure and gives directional motion a clean home —
`AuthShell`'s mode-based transition cannot express a forward/back direction.

### Files

**New**
- `src/components/auth/OnboardingFlow.tsx` — client component. Owns step index,
  direction, avatar/master-key state, and all logic migrated from
  `OnboardingForm`: avatar persist, `/api/onboarding/complete` call,
  `setMasterKey`, plan-intent redirect. Renders inside `PublicPageShell`.
- `src/components/auth/onboarding-steps/IntroScreen.tsx` — reusable value-prop
  screen (icon badge, title, body, bullet list). Presentational.
- `src/components/auth/onboarding-steps/AvatarStep.tsx` — extracted avatar
  picker body (presentational; receives selection state + handlers).
- `src/components/auth/onboarding-steps/MasterKeyStep.tsx` — extracted
  master-key form body (presentational; receives values, handlers, error,
  strength, submitting).
- `src/components/auth/onboarding-steps/CompletionStep.tsx` — success state.
- `src/components/auth/onboarding.module.css` — onboarding-specific classes
  (progress dots, intro layout, icon badges), reusing `--auth-*` tokens.

**Edited**
- `src/app/onboarding/page.tsx` — keep the server-side gate; replace
  `AuthShell` + `OnboardingForm` with `PublicPageShell` + `OnboardingFlow`.

**Retired**
- `src/components/auth/OnboardingForm.tsx` — logic migrated into
  `OnboardingFlow` and the step sub-components; file removed.

### Style

- Reuse the `--auth-*` token system from `auth-shell.module.css`. Shared
  primitives (`.primaryAction`, `.field`, `.fieldGroup`, `.formStack`,
  `.strengthMeter`, `.avatarChoice*`, `.textLink`, etc.) are imported/kept in
  `auth-shell.module.css`; only genuinely new classes live in
  `onboarding.module.css`.
- No new visual language or color tokens. Icons via `lucide-react` (already a
  dependency, e.g. `ArrowRightIcon`).

## Motion

- Current step index + `direction` (`1` forward / `-1` back) drive an
  `AnimatePresence mode="wait"` with a `custom` variant:
  - enter: from `direction * 40px` + opacity 0 → 0 + opacity 1
  - exit: to `-direction * 40px` + opacity 0
  - spring `stiffness ~360, damping ~32` (matches existing shell feel).
- Heading (title + description) crossfades per step.
- Progress dots (5) above the content; the active dot is an animated pill via a
  shared `layoutId`.
- `useReducedMotion()` collapses all slides/springs to simple opacity, matching
  the existing shell behavior and the `prefers-reduced-motion` CSS block.

## Data flow & preserved guarantees

- **Server gate** in `page.tsx` is the security boundary and is unchanged:
  `active` → `/vault`; `invited` → render flow; `suspended`/`revoked` →
  `/login?state=…`; otherwise → `/signup?state=setup-incomplete`;
  unauthenticated → `/login?next=/vault`.
- **Master key never leaves the form.** Strength + confirmation validated
  client-side. `supabase.auth.getUser()` re-check before completing guards a
  mid-flow session swap (SESSION_CHANGED path preserved).
- **Avatar** persists to `user_metadata.avatar_kind`; failure is non-fatal
  (initials fallback). Preserved.
- **Completion** posts `{ completed: true, expectedUserId }` to
  `/api/onboarding/complete`, then `setMasterKey(masterKey, userId)`, then
  redirects: plan-intent cookie present → `/vault?upgrade=<plan>&period=<period>`,
  else `/vault`; then `router.refresh()`. Preserved exactly.
- Intro steps collect no data and cannot block activation.

## Error handling

- Master-key validation errors and completion failures surface in the existing
  `.alert` region on the master-key step (same copy/behavior as today).
- Avatar persist failure is logged, non-fatal.
- Network/activation failure re-enables the submit button and shows the error;
  the user stays on the master-key step.

## Testing

- `tests/invite-onboarding.test.mjs` (server/API contract + gate) must stay
  green — the API and gate are unchanged.
- Add component-level checks where the repo harness supports it: step
  advance/back, skip-intro jumps to avatar, reduced-motion path renders, and
  completion still fires the same request + redirect. Match the repo's existing
  test style (confirm during planning).

## Risks / notes

- Migrating `OnboardingForm` logic must be behavior-preserving; the completion
  request shape and redirect are contract-bound (server validates exactly two
  keys) and must not drift.
- Keep shared CSS primitives in `auth-shell.module.css` to avoid duplicating
  tokens/classes across two modules.
