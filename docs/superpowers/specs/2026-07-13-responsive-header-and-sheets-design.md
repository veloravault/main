# Responsive Header and Sheet System

## Objective

Replace the current global header with a quieter Apple-style adaptive toolbar and standardize every add/edit dialog so forms render correctly on 400px mobile screens and as bounded centered panels on desktop.

## Scope

This redesign covers the authenticated application header, global search presentation, Magic Import entry point, and the shared responsive behavior of dialogs used by Passwords, Documents, Notes, Wallet, and Bank Accounts. Existing form fields, validation, persistence, encryption, and destructive actions remain unchanged.

## Header Architecture

### Desktop

- The toolbar is 64px high and uses a translucent elevated material with a thin separator.
- The active section title appears on the left and aligns with the content column.
- A command-search control remains visually centered in the available toolbar space and shows the Command-K shortcut.
- Magic Import, theme, and profile actions sit on the right as compact controls with consistent 36–40px hit areas.
- The profile control retains its avatar and active-state treatment.

### Mobile

- The toolbar is 56px high plus the safe-area inset.
- The active section title replaces the persistent Velora Vault identity.
- Search remains a direct icon action.
- A single More control contains Magic Import, theme selection, and Profile.
- The duplicated large mobile content heading is removed because the destination is already identified in the toolbar.
- The bottom tab bar remains the primary navigation surface.

## Search Presentation

- Desktop search opens a centered command palette below the toolbar with a bounded width and backdrop.
- Mobile search opens a full-width command sheet inset 12px from the viewport edges and below the safe-area toolbar.
- The result list scrolls independently and remains clear of the bottom tab bar.
- Escape, backdrop click, and result selection close the surface and reset transient query state.

## Responsive Dialog Contract

All add/edit dialogs use one global class contract rather than individual positioning overrides.

### Mobile

- Dialogs are fixed to the viewport edges with `left: 0`, `right: 0`, and no translate transform.
- Width is exactly `100%` and maximum width is disabled.
- The surface is anchored above the bottom tab bar where the tab bar remains visible, or at the viewport bottom when the dialog intentionally covers navigation.
- Maximum height is bounded by the dynamic viewport and content scrolls inside the surface.
- Top corners use a 28px radius; lower corners are square for true bottom sheets.
- A grabber, title, and 44px close control remain visible while form content scrolls.
- Horizontal padding is 20px and bottom padding includes the safe-area inset.
- No field, label, or submit button may render outside the viewport at 400px width.

### Desktop

- Dialogs remain centered using the dialog primitive's standard transform.
- Form dialogs use bounded widths between 420px and 560px depending on content.
- Maximum height is 84dvh and long forms scroll internally.
- The background is an elevated material with a 24px radius and restrained shadow.

## Component Boundaries

- `src/app/page.tsx` owns the adaptive header composition and global search surface.
- `src/components/ui/dialog.tsx` remains the primitive and is not forked.
- `src/app/globals.css` owns the shared header, command palette, and responsive dialog contracts.
- Vault components keep their existing dialog content and opt into the shared responsive class.
- A small header More menu uses the existing dropdown primitives and callbacks already owned by the page.

## Interaction and Accessibility

- Header controls have explicit accessible labels and visible keyboard focus.
- The More menu uses menu semantics and closes after selection.
- Search remains reachable with Command-K and a direct mobile button.
- Dialog titles remain connected to dialog semantics.
- Close controls are visible, labelled, and at least 44px on mobile.
- Reduced-motion users do not receive toolbar, menu, palette, or sheet entrance movement.
- Opening a modal prevents background scrolling and closing restores it.

## Visual System

- Materials reuse existing light/dark theme tokens.
- System blue is reserved for primary actions and active states.
- Toolbar and palette borders use the existing separator token.
- Active section typography uses the existing system stack at 17px mobile and 16px desktop with compact negative tracking.
- The header avoids large branding blocks, gradients, and duplicated labels.

## Verification

- Do not add new automated test cases, following the user's stated preference.
- Run the Next.js production build and TypeScript compilation.
- Inspect 400x863 mobile layouts for Password, Document, Note, Wallet, and Bank dialogs.
- Inspect the command search surface on mobile and desktop.
- Confirm no horizontal overflow, clipped fields, unreachable submit controls, or overlap with safe areas/tab bars.
- Inspect desktop widths at 1024px and 1440px.

## Out of Scope

- Changes to form data, Supabase operations, encryption, authentication, or database schemas.
- Redesigning the desktop sidebar or mobile bottom tab bar.
- Changes to the inner visual design of vault content pages beyond removal of duplicated mobile page titles.
